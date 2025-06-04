import {
  checkNode
} from "/lib/checker";

import {
  getChildren, query, getSite, get as getContent
} from "/lib/xp/content";
import { run as runInContext } from "/lib/xp/context";
import { newCache } from "/lib/cache";
import { getUser } from "/lib/xp/auth";
import { send } from "/lib/xp/websocket";
import { localize } from "/lib/xp/i18n";

const CURRENTLY_RUNNING = {};
const PAGINATION_COUNT = 100;
let locale = "no";

const cache = newCache({
  size: 100,
  expire: 259200
});

function getDefaultContextParams(event) {
  const user = event.data.user.split(":");
  return {
    repository: event.data.repository,
    branch: event.data.branch,
    user: {
      login: user[2],
      idProvider: user[1]
    }
  };
}

function getNodes(content, event, start) {
  const results = query({
    query: `_path LIKE '/content${content._path}/*'`,
    branch: event.data.branch,
    start,
    count: PAGINATION_COUNT
  });
  results.start = start;

  return results;
}

function buildCacheKey(event, key, content) {
  /*
    Get the last modified child of the content to use in the cache key.
    This will ensure any changes to its children will trigger a new fresh link check.
  */
  let cacheKey = key;
  const branch = event.session.params.branch;

  const lastModifiedChild = getChildren({
    key,
    count: 1,
    start: 0,
    sort: "modifiedTime DESC"
  }).hits;

  if (lastModifiedChild[0] && lastModifiedChild[0].modifiedTime > content.modifiedTime) {
    cacheKey += lastModifiedChild[0].modifiedTime;
  } else {
    cacheKey += content.modifiedTime;
  }

  if (branch === "master") {
    const lastPublishedChild = getChildren({
      key,
      count: 1,
      start: 0,
      sort: "publish.from DESC"
    }).hits;

    if (lastPublishedChild[0]?.publish?.from && lastPublishedChild[0]?._id) {
      cacheKey += lastPublishedChild[0]._id;
    }
  }

  cacheKey += event.session.params.selection;
  cacheKey += branch;
  return cacheKey;
}

function checkContent(event, node) {
  const currentSession = CURRENTLY_RUNNING[event.session.id];

  const contextParams = {
    branch: currentSession.branch,
    principals: ["role:system.admin", "role:cms.expert", "role:cms.admin"]
  };
  const checkResult = runInContext(contextParams, () => checkNode(node));
  if (checkResult) {
    const { result, brokenCount, failedCount } = checkResult;
    currentSession.brokenCount += brokenCount;
    currentSession.failedCount += failedCount;
    currentSession.results.push(result);
  }
}

function next(event, indexParam) {
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
    /* log.info(JSON.stringify({
      results: currentSession.results,
      key: currentSession.key,
      brokenCount: currentSession.brokenCount,
      failedCount: currentSession.failedCount
    }, null, 2)); */
    send(event.session.id, str);
    return;
  }

  if (index >= nodes.start + nodes.count) {
    nodes = getNodes(currentSession.content, event, index);
    currentSession.nodes = nodes;
  }

  const node = nodes.hits[index % PAGINATION_COUNT];
  checkContent(event, node);

  currentSession.index++;
  const str = JSON.stringify({
    index: index + 1,
    count: nodes.count,
    total: nodes.total,
    key: currentSession.key,
    brokenCount: currentSession.brokenCount,
    failedCount: currentSession.failedCount
  });
  send(event.session.id, str);
}

function startChecker(event) {
  const key = event.data.contentId;
  const currentContent = getContent({
    key,
    branch: event.data.branch
  });

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
        key
      });
      send(event.session.id, str);
      return;
    }

    let nodes = {
      count: 0,
      total: 0,
      hits: []
    };
    const selection = event.session.params.selection;
    if (selection === "children" || selection === "both") {
      nodes = getNodes(currentContent, event, 0);
    }

    const site = getSite({ key: currentContent._path });

    CURRENTLY_RUNNING[event.session.id] = {
      key,
      content: currentContent,
      cacheKey,
      index: 0,
      isRunning: true,
      nodes,
      site: {
        displayName: site.displayName,
        name: site._name,
        id: site._id
      },
      branch: event.data.branch,
      repoId: event.data.repository,
      results: [],
      brokenCount: 0,
      failedCount: 0
    };

    if (selection === "content" || selection === "both") {
      // Check selected content first outside the "loop" as to not mess with starts and counts.
      send(event.session.id, JSON.stringify({
        total: nodes.total,
        key,
        mainContent: true
      }));
      checkContent(event, currentContent);
    }
    send(event.session.id, JSON.stringify({
      index: 0,
      count: nodes.count,
      total: nodes.total,
      key
    }));
  } else {
    /**
     * @phrases ["services.link-checker.no-content"]
     */
    send(event.session.id, JSON.stringify({
      error: `${localize({
        key: "services.link-checker.no-content",
        locale
      })} :(` || "Content not found :(",
      key
    }));
  }
}

export function webSocketEvent(event) {
  const currentSession = CURRENTLY_RUNNING[event.session.id];
  const { message, type } = event;
  if (event?.data?.locale) {
    locale = event.data.locale;
  }

  runInContext(
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
          // eslint-disable-next-line no-case-declarations
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
              send(event.session.id, str);
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
}

export function get(req) {
  return {
    webSocket: {
      subProtocols: ["text"],
      data: {
        contentId: req.params.contentId,
        branch: req.params.branch,
        repository: req.params.repository,
        user: getUser().key, // Format: "user:idProvider:userLogin",
        locale: req.params.locale
      }
    }
  };
}
