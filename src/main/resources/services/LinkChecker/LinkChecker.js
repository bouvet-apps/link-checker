var portalLib = require("/lib/xp/portal");
var contentLib = require("/lib/xp/content");
var contextLib = require("/lib/xp/context");
var httpClientLib = require("/lib/http-client");
var cacheLib = require("/lib/xp/cache");
var thymeleaf = require("/lib/xp/thymeleaf");
var view = resolve("LinkChecker.html");
var webSocketLib = require("/lib/xp/websocket");

exports.get = function(req) {
  // If web-socket request, then you will need to accept the web-socket.
  //log.info("LinkeChecker got a request!");
  //log.info(JSON.stringify(req, null, 2));
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

exports.webSocketEvent = function(event) {
  if (event.type == "open") {
    //log.info("OPEN " + event.session.id);
    startChecker(event);
    //log.info(JSON.stringify(Object.keys(running), null, 2));
  } else if (event.type == "close") {
    delete running[event.session.id];
    //log.info("CLOSE " + event.session.id);
  } else if (event.type == "error") {
    delete running[event.session.id];
    log.error("ERROR LinkChecker connection:" + event.session.id);
  } else if (event.type == "message") {
    //log.info("MESSAGE %s", event.message);

    if (event.message.split(":")[0] == "NEXT") {
      if (running[event.session.id].isRunning == true) {
        next(event, event.message.split(":")[1]);
      } else {
        webSocketLib.send(event.session.id, JSON.stringify({ results: running[event.session.id].results, key: running[event.session.id].key }));
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
  /*log.info("Sending Starting run to user");
  log.info("contentId is " + event.data.contentId);
  log.info("branch is " + event.data.branch);*/

  var key = event.data.contentId;

  var content = contextLib.run({ branch: event.data.branch, principals: ["role:cms.admin"] }, function() {
    return contentLib.get({ key: key, branch: event.data.branch });
  }); //venstre, content type
  if (content) {
    //log.info("Found content with id " + key);

    var cacheKey = key;
    /**
     * Get the last modified child of the content to use in the cache key.
     * This will ensure any changes to its children will trigger a new fresh link check.
     */
    var lastModifiedChild = contextLib.run({ branch: event.data.branch, principals: ["role:cms.admin"] }, function() {
      return contentLib.getChildren({ key: key, count: 1, start: 0, sort: "modifiedTime DESC" }).hits;
    });
    if (lastModifiedChild[0] && lastModifiedChild[0].modifiedTime > content.modifiedTime) {
      cacheKey += lastModifiedChild[0].modifiedTime;
    } else {
      cacheKey += content.modifiedTime;
    }

    /**
     * We cannot give the cache a single function to populate with,
     * since generating a result happens over time.
     * Thus, we give it a false value and at the end of the link checks,
     * when we have a result, we put that in.
     //  */
    var results = cache.get(cacheKey, function() {
      return false;
    });
    if (results) {
      webSocketLib.send(event.session.id, JSON.stringify({ results: results, key: key }));
      return;
    }

    var nodes = getNodes(content, event);
    /**
     * Pressing Check button on the widget starts a new websocket with its own session id.
     */
    running[event.session.id] = {
      key: key,
      cacheKey: cacheKey,
      count: 0,
      isRunning: true,
      nodes: nodes,
      results: [],
      brokenCount: 0
    };
    webSocketLib.send(event.session.id, JSON.stringify({ count: 0, total: nodes.length, key: key }));
  }
}

function next(event, start) {
  var nodes = running[event.session.id].nodes;
  var start = parseInt(start);
  if (start >= nodes.length) {
    /**
     * Need to put finished result into cache.
     * If the code has reached this point, we know that the cache contains no results
     */
    cache.remove(running[event.session.id].cacheKey);
    var results = cache.get(running[event.session.id].cacheKey, function() {
      return running[event.session.id].results;
    });

    webSocketLib.send(event.session.id, JSON.stringify({ results: running[event.session.id].results, key: running[event.session.id].key }));
    return;
  }

  checkNode(event, start);
}

function checkNode(event, start) {
  var nodes = running[event.session.id].nodes;
  var start = parseInt(start);
  var node = nodes[start];
  //log.info(start + 1 + "/" + nodes.length);
  var results = [];
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
    results.push({ displayName: node.displayName, path: node._path, brokenLinks: brokenLinks });
    running[event.session.id].results = running[event.session.id].results.concat(results);
  }

  running[event.session.id].count++;

  var str = JSON.stringify({
    count: start + 1,
    total: nodes.length,
    key: running[event.session.id].key,
    brokenCount: running[event.session.id].brokenCount
  });
  webSocketLib.send(event.session.id, str);
}

function getNodes(content, event) {
  /*log.info("Display Name = " + content.displayName);
  log.info("Path = " + content._path);*/
  var nodes = [content];
  var hits = contextLib.run({ branch: event.data.branch, principals: ["role:cms.admin"] }, function() {
    return contentLib.query({
      query: "_path LIKE '/content" + content._path + "/*'",
      branch: event.data.branch,
      start: 0,
      count: 10000
    }).hits;
  });
  nodes = nodes.concat(hits);
  return nodes;
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
  //log.info(url);
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
    //log.info(error);
    return 500;
  }
}

function checkInternalLink(link, branch) {
  var result = contextLib.run({ branch: branch, principals: ["role:cms.admin"] }, function() {
    return contentLib.get({
      key: link.split("//")[1]
    });
  });
  return result ? 200 : 404;
}
