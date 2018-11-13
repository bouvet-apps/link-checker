var portalLib = require("/lib/xp/portal");
var contentLib = require("/lib/xp/content");
var contextLib = require("/lib/xp/context");
var httpClientLib = require("/lib/http-client");
var cacheLib = require("/lib/xp/cache");
var authLib = require("/lib/xp/auth");
var thymeleaf = require("/lib/xp/thymeleaf");
var view = resolve("LinkChecker.html");
var webSocketLib = require("/lib/xp/websocket");

exports.get = function(req) {
  // If web-socket request, then you will need to accept the web-socket.
  log.info("LinkeChecker got a request!");
  log.info(JSON.stringify(req, null, 2));
  return {
    webSocket: {
      subProtocols: ["text"],
      data: {
        contentId: req.params.contentId,
        branch: req.params.branch
      }
    }
  };
};
var cache = cacheLib.newCache({
  size: 100,
  expire: 259200
});

var running = {};
var PAGINATION_COUNT = 10;

exports.webSocketEvent = function(event) {
  if (event.type == "open") {
    log.info("OPEN " + event.session.id);
    log.info(JSON.stringify(event, null, 2));
    startChecker(event);
    log.info(JSON.stringify(Object.keys(running), null, 2));
  } else if (event.type == "close") {
    delete running[event.session.id];
    log.info("CLOSE " + event.session.id);
  } else if (event.type == "error") {
    delete running[event.session.id];
    log.error("ERROR LinkChecker connection:" + event.session.id);
  } else if (event.type == "message") {
    log.info("MESSAGE %s", event.message);

    if (event.message.split(":")[0] == "NEXT") {
      if (running[event.session.id].isRunning == true) {
        next(event, event.message.split(":")[1]);
      } else {
        var str = JSON.stringify({
          results: running[event.session.id].results,
          key: running[event.session.id].key,
          brokenCount: running[event.session.id].brokenCount
        });
        webSocketLib.send(event.session.id, str);
      }
    }
    // Do something on message
    if (event.message == "STOP") {
      if (running[event.session.id]) {
        running[event.session.id].isRunning = false;
      }
    }
  }
};

function startChecker(event) {
  log.info("Sending Starting run to:");
  log.info(JSON.stringify(contextLib.get(), null, 2));
  contextLib.run({ repository: "system-repo", principals: ["role:system.admin"] }, function() {
    log.info(JSON.stringify(authLib.getUser(), null, 2));
  });
  log.info("contentId is " + event.data.contentId);
  log.info("branch is " + event.data.branch);

  var key = event.data.contentId;

  var content = contextLib.run({ branch: event.data.branch, principals: ["role:system.admin"] }, function() {
    return contentLib.get({ key: key, branch: event.data.branch });
  }); //venstre, content type
  if (content) {
    log.info("Found content with id " + key);

    var cacheKey = buildCacheKey(event, key, content);

    /**
     * We cannot give the cache a single function to populate with,
     * since generating a result happens over time.
     * Thus, we give it a false value and at the end of the link checks,
     * when we have a result, we put that in.
     */
    var cached = cache.get(cacheKey, function() {
      return false;
    });
    if (cached) {
      webSocketLib.send(event.session.id, JSON.stringify({ results: cached.results, brokenCount: cached.brokenCount, key: key }));
      return;
    }

    var nodes = { count: 0, total: 0, hits: [] };
    if (event.session.params.checkChildren == "true") {
      nodes = getNodes(content, event, 0);
    }

    running[event.session.id] = {
      key: key,
      content: content,
      cacheKey: cacheKey,
      index: 0,
      isRunning: true,
      nodes: nodes,
      results: [],
      brokenCount: 0
    };

    // Check selected content first outside the "loop" as to not mess with starts and counts.
    webSocketLib.send(event.session.id, JSON.stringify({ total: nodes.total, key: key, mainContent: true }));
    checkNode(event, content);

    webSocketLib.send(event.session.id, JSON.stringify({ index: 0, count: nodes.count, total: nodes.total, key: key }));
  }
}

function next(event, index) {
  var nodes = running[event.session.id].nodes;
  var index = parseInt(index);
  if (index >= nodes.total) {
    /**
     * Need to put finished result into cache.
     * If the code has reached this point, we know that the cache contains no results
     */
    cache.remove(running[event.session.id].cacheKey);
    var results = cache.get(running[event.session.id].cacheKey, function() {
      return { results: running[event.session.id].results, brokenCount: running[event.session.id].brokenCount };
    });
    var str = JSON.stringify({
      results: running[event.session.id].results,
      key: running[event.session.id].key,
      brokenCount: running[event.session.id].brokenCount
    });
    webSocketLib.send(event.session.id, str);
    return;
  } else if (index >= nodes.start + nodes.count) {
    var nodes = getNodes(running[event.session.id].content, event, index);
    running[event.session.id].nodes = nodes;
  }
  log.info("INDEX:" + index + "  START: " + nodes.start + "  COUNT: " + nodes.count + "  TOTAL: " + nodes.total);

  var node = nodes.hits[index % PAGINATION_COUNT];

  log.info((index % PAGINATION_COUNT) + " : " + nodes.hits.length);
  checkNode(event, node);
  running[event.session.id].index++;
  var str = JSON.stringify({
    index: index + 1,
    count: nodes.count,
    total: nodes.total,
    key: running[event.session.id].key,
    brokenCount: running[event.session.id].brokenCount
  });
  webSocketLib.send(event.session.id, str);
}

function checkNode(event, node) {
  var brokenLinks = [];

  var urls = getLinks(JSON.stringify(node));
  urls.externalLinks.forEach(function(url) {
    var checkStatus = checkExternalUrl(url);
    if (checkStatus >= 309 && checkStatus < 900) {
      // Under 900 to avoid annoying linkedIn response
      running[event.session.id].brokenCount++;
      brokenLinks.push({ link: url, status: checkStatus });
    }
  });
  urls.internalLinks.forEach(function(link) {
    var checkStatus = checkInternalLink(link, event.data.branch);
    if (checkStatus >= 309 && checkStatus < 900) {
      running[event.session.id].brokenCount++;
      brokenLinks.push({ link: link, status: checkStatus });
    }
  });
  if (brokenLinks.length > 0) {
    var data = { displayName: node.displayName, path: node._path, brokenLinks: brokenLinks };
    running[event.session.id].results.push(data);
  }
}

function buildCacheKey(event, key, content) {
  /**
   * Get the last modified child of the content to use in the cache key.
   * This will ensure any changes to its children will trigger a new fresh link check.
   */
  var cacheKey = key;
  var lastModifiedChild = contextLib.run({ branch: event.data.branch, principals: ["role:system.admin"] }, function() {
    return contentLib.getChildren({ key: key, count: 1, start: 0, sort: "modifiedTime DESC" }).hits;
  });
  if (lastModifiedChild[0] && lastModifiedChild[0].modifiedTime > content.modifiedTime) {
    cacheKey += lastModifiedChild[0].modifiedTime;
  } else {
    cacheKey += content.modifiedTime;
  }
  if (event.session.params.checkChildren == "true") {
    cacheKey += "checkChildren";
  }
  return cacheKey;
}

function getNodes(content, event, start) {
  log.info("Display Name = " + content.displayName);
  log.info("Path = " + content._path);

  var results = contextLib.run({ branch: event.data.branch, principals: ["role:system.admin"] }, function() {
    return contentLib.query({
      query: "_path LIKE '/content" + content._path + "/*'",
      branch: event.data.branch,
      start: start,
      count: PAGINATION_COUNT
    });
  });
  results.start = start;

  return results;
}

function getLinks(text) {
  var externalExpression = /((https?:\/\/|ftp:\/\/|www\.|[^\s:=]+@www\.).*?[a-z_\/0-9\-\#=&\(\)])(?=(\.|,|;|\?|\!)?(?:“|”|"|'|«|»|\[\/|\s|\r|\n|\\|<|>|\[\n))/gi; //(s:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/|www\.)[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/[^" \\><]*)?/gi;
  var internalExpression = /(content:\/\/)[a-z0-9]+([\-]{1}[a-z0-9]+)*/gi;
  var links = {
    externalLinks: text.match(externalExpression) || [],
    internalLinks: text.match(internalExpression) || []
  };
  return links;
}

function checkExternalUrl(url) {
  log.info(url);
  try {
    if (url.indexOf("http://") == -1 && url.indexOf("https://") == -1) {
      url = "http://" + url;
    }
    var response = httpClientLib.request({
      url: url,
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.13; rv:62.0) Gecko/20100101 Firefox/62.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        Connection: "keep-alive"
      },
      connectionTimeout: 5000,
      readTimeout: 3000
    });
    return response.status;
  } catch (error) {
    if (error.toString().match(/java\.net\.UnknownHostException/)) {
      return 404;
    } else if (error.toString().match(/java\.net\.SocketTimeoutException/)) {
      return 408;
    } else if (error.toString().match(/javax\.net\.ssl\.SSLPeerUnverifiedException/)) {
      return 526;
    }
    log.info(error);
    return 500;
  }
}

function checkInternalLink(link, branch) {
  var result = contextLib.run({ branch: branch, principals: ["role:system.admin"] }, function() {
    return contentLib.get({
      key: link.split("//")[1]
    });
  });
  return result ? 200 : 404;
}
