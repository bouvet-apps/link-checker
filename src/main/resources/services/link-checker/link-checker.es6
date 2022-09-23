/* eslint-disable no-case-declarations */
const libs = {
  content: require("/lib/xp/content"),
  context: require("/lib/xp/context"),
  httpClient: require("/lib/http-client"),
  cache: require("/lib/cache"),
  auth: require("/lib/xp/auth"),
  webSocket: require("/lib/xp/websocket"),
  i18n: require("/lib/xp/i18n")
};

const CURRENTLY_RUNNING = {};
const PAGINATION_COUNT = 100;

const cache = libs.cache.newCache({
  size: 100,
  expire: 259200
});

const getDefaultContextParams = (event) => {
  const user = event.data.user.split(":");
  return { repository: event.data.repository, branch: event.data.branch, user: { login: user[2], idProvider: user[1] } };
};

const checkInternalLink = (link, branch) => {
  const contextParams = { branch: branch, principals: ["role:system.admin"] };
  const result = libs.context.run(contextParams, () => {
    const split = link.split("/");
    return libs.content.exists({
      key: split[split.length - 1]
    });
  });
  return { status: result ? 200 : 404 };
};


const checkExternalUrl = (externalUrl) => {
  let url = externalUrl;
  try {
    if (url.indexOf("http://") === -1 && url.indexOf("https://") === -1) {
      url = `http://${url}`;
    }
    const response = libs.httpClient.request({
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
    return { status: response.status };
  } catch (error) {
    const errorString = error.toString();
    if (errorString.match(/java\.net\.UnknownHostException/)) {
      return { status: 404 };
    }
    if (errorString.match(/java\.net\.SocketTimeoutException/)) {
      return { status: 408 };
    }
    if (errorString.match(/javax\.net\.ssl\.SSLPeerUnverifiedException/)) {
      return { status: 526 };
    }
    // Assume local error with httpClient
    return { error: true };
  }
};

const getInternalReferences = (node) => {
  const bean = __.newBean("no.bouvet.xp.lib.outboundreferences.OutboundReferences");
  const references = __.toNativeObject(bean.getOutboundReferences(node._id));
  return references;
};


const getLinks = (text) => {
  // Do not have global regex, they must be initialized each time.
  const externalExpression = /((https?:\/\/|ftp:\/\/|www\.|[^\s:=]+@www\.).*?[a-z_/0-9\-#=&()])(?=(\.|,|;|\?|!)?(?:“|”|"|'|«|»|\[\/|\s|\r|\n|\\|<|>|\[\n))/gi; // (s:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/|www\.)[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/[^" \\><]*)?/gi;
  const internalExpression = /((content|media|image):\/\/)(download\/)?[a-z0-9]+([-]{1}[a-z0-9]+)*/gi;
  const links = {
    externalLinks: text.match(externalExpression) || [],
    internalLinks: text.match(internalExpression) || []
  };
  return links;
};

const getNodes = (content, event, start) => {
  const results = libs.content.query({
    query: `_path LIKE '/content${content._path}/*'`,
    branch: event.data.branch,
    start: start,
    count: PAGINATION_COUNT
  });
  results.start = start;

  return results;
};

const buildCacheKey = (event, key, content) => {
  /*
    Get the last modified child of the content to use in the cache key.
    This will ensure any changes to its children will trigger a new fresh link check.
  */
  let cacheKey = key;

  const lastModifiedChild = libs.content.getChildren({
    key: key, count: 1, start: 0, sort: "modifiedTime DESC"
  }).hits;

  if (lastModifiedChild[0] && lastModifiedChild[0].modifiedTime > content.modifiedTime) {
    cacheKey += lastModifiedChild[0].modifiedTime;
  } else {
    cacheKey += content.modifiedTime;
  }

  cacheKey += event.session.params.selection;
  return cacheKey;
};

const checkNode = (event, node) => {
  const currentSession = CURRENTLY_RUNNING[event.session.id];
  const brokenLinks = [];
  /**
   * @phrases ["services.link-checker.external-url", "services.link-checker.internal-content"]
   */
  const locale = event?.data?.locale || 'no';
  const localizedExternalUrl = libs.i18n.localize({ key: "services.link-checker.external-url", locale }) || "External URL";
  const localizedInternalContent = libs.i18n.localize({ key: "services.link-checker.internal-content", locale }) || "Internal content";

  const urls = getLinks(JSON.stringify(node));
  urls.internalLinks = [...urls.internalLinks, ...getInternalReferences(node)];

  urls.externalLinks.forEach((url) => {
    const { status, error } = checkExternalUrl(url);

    if (error) {
      // Local error with httpClient
      currentSession.failedCount++;
      brokenLinks.push({ link: url, status: 0, type: localizedExternalUrl });
    } else if (status >= 309 && status < 900) {
      // Under 900 to avoid annoying linkedIn response
      currentSession.brokenCount++;
      brokenLinks.push({ link: url, status: status, type: localizedExternalUrl });
    }
  });
  urls.internalLinks.forEach((link) => {
    const { status } = checkInternalLink(link, event.data.branch);
    if (status >= 309 && status < 900) {
      currentSession.brokenCount++;
      brokenLinks.push({ link: link, status, type: localizedInternalContent });
    }
  });
  if (brokenLinks.length > 0) {
    const data = {
      displayName: node.displayName, path: node._path, brokenLinks
    };
    currentSession.results.push(data);
  }
};


const next = (event, indexParam) => {
  const currentSession = CURRENTLY_RUNNING[event.session.id];
  let nodes = currentSession.nodes;
  const index = parseInt(indexParam);
  if (index >= nodes.total) {
    /*
      Need to put finished result into cache.
      If the code has reached this point, we know that the cache contains no results.
      Thus results variable is not used directly, but only for setting cache.
    */
    cache.remove(currentSession.cacheKey);
    cache.get(currentSession.cacheKey, () => ({
      results: currentSession.results,
      brokenCount: currentSession.brokenCount,
      failedCount: currentSession.failedCount
    }));

    const str = JSON.stringify({
      results: currentSession.results,
      key: currentSession.key,
      brokenCount: currentSession.brokenCount,
      failedCount: currentSession.failedCount
    });
    libs.webSocket.send(event.session.id, str);
    return;
  }

  if (index >= nodes.start + nodes.count) {
    nodes = getNodes(currentSession.content, event, index);
    currentSession.nodes = nodes;
  }

  const node = nodes.hits[index % PAGINATION_COUNT];
  checkNode(event, node);

  currentSession.index++;
  const str = JSON.stringify({
    index: index + 1,
    count: nodes.count,
    total: nodes.total,
    key: currentSession.key,
    brokenCount: currentSession.brokenCount,
    failedCount: currentSession.failedCount
  });
  libs.webSocket.send(event.session.id, str);
};

const startChecker = (event) => {
  const key = event.data.contentId;
  const currentContent = libs.content.get({ key: key, branch: event.data.branch });

  if (currentContent) {
    const cacheKey = buildCacheKey(event, key, currentContent);

    /*
      We cannot give the cache a single function to populate with,
      since generating a result happens over time.
      Thus, we give it a false value and at the end of the link checks,
      when we have a result, we put that in.
    */
    const cached = cache.get(cacheKey, () => false);
    if (cached) {
      const str = JSON.stringify({
        results: cached.results,
        brokenCount: cached.brokenCount,
        failedCount: cached.failedCount,
        key: key
      });
      libs.webSocket.send(event.session.id, str);
      return;
    }

    let nodes = { count: 0, total: 0, hits: [] };
    const selection = event.session.params.selection;
    if (selection === "children" || selection === "both") {
      nodes = getNodes(currentContent, event, 0);
    }

    CURRENTLY_RUNNING[event.session.id] = {
      key: key,
      content: currentContent,
      cacheKey: cacheKey,
      index: 0,
      isRunning: true,
      nodes: nodes,
      results: [],
      brokenCount: 0,
      failedCount: 0
    };

    if (selection === "content" || selection === "both") {
      // Check selected content first outside the "loop" as to not mess with starts and counts.
      libs.webSocket.send(event.session.id, JSON.stringify({ total: nodes.total, key: key, mainContent: true }));
      checkNode(event, currentContent);
    }
    libs.webSocket.send(event.session.id, JSON.stringify({
      index: 0, count: nodes.count, total: nodes.total, key: key
    }));
  } else {
    libs.webSocket.send(event.session.id, JSON.stringify({ error: "Content not found :(", key: key }));
  }
};

exports.webSocketEvent = (event) => {
  const currentSession = CURRENTLY_RUNNING[event.session.id];
  const { message, type } = event;

  libs.context.run(
    getDefaultContextParams(event),
    () => {
      switch (type) {
        case "open":
          startChecker(event);
          break;

        case "close":
        case "error":
          delete CURRENTLY_RUNNING[event.session.id];
          break;

        case "message":
          const [messageType, index] = message.split(":");
          if (messageType === "NEXT") {
            if (currentSession.isRunning === true) {
              next(event, index);
            } else {
              const str = JSON.stringify({
                results: currentSession.results,
                key: currentSession.key,
                brokenCount: currentSession.brokenCount
              });
              libs.webSocket.send(event.session.id, str);
            }
          }
          if (messageType === "STOP") {
            if (currentSession) {
              currentSession.isRunning = false;
            }
          }
          break;
        default:
          break;
      }
    }
  );
};

exports.get = req => ({
  webSocket: {
    subProtocols: ["text"],
    data: {
      contentId: req.params.contentId,
      branch: req.params.branch,
      repository: req.params.repository,
      user: libs.auth.getUser().key, // Format: "user:idProvider:userLogin",
      locale: req.params.locale
    }
  }
});
