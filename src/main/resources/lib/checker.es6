import { exists } from "/lib/xp/content";
import { connect } from "/lib/xp/node";
import { get as getContext } from "/lib/xp/context";
import { request } from "/lib/http-client";

// Assume correct context
export function getInternalReferences(node) {
  const bean = __.newBean("no.bouvet.xp.lib.outboundreferences.OutboundReferences");
  const references = __.toNativeObject(bean.getOutboundReferences(node._id));
  return references;
}

export function getExternalLinks(text) {
  // Do not have global regex, they must be initialized each time.
  const externalExpression = /((https?:\/\/|ftp:\/\/|www\.|[^\s:=]+@www\.).*?[a-z_/0-9\-#=&()])(?=(\.|,|;|\?|!)?(?:“|”|"|'|«|»|\[\/|\s|\r|\n|\\|<|>|\[\n))/gi; // (s:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/|www\.)[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/[^" \\><]*)?/gi;
  return text.match(externalExpression) || [];
}

// Assume correct context
export function checkInternalRef(id, auditCheck = false) {
  const _exists = exists({
    key: id
  });
  if (_exists) return { status: 200 };
  if (!auditCheck) return { status: 404 };

  const { branch, repository } = getContext();

  const connection = connect({
    repoId: "system.auditlog",
    branch: "master"
  });

  let auditLog = false;

  let queryString = `data.result.deletedContents LIKE '${id}' OR data.result.archivedContents LIKE '${id}'`;
  if (branch === "master") queryString += ` OR data.result.unpublishedContents LIKE '${id}'`;

  const auditLogHit = connection.query({
    query: queryString,
    sort: "_ts DESC"
  }).hits[0];

  if (auditLogHit) {
    const { type, user, time } = connection.get(auditLogHit.id);
    auditLog = {
      type,
      user,
      time
    };
  } else {
    // Need repo connection to be able to check archived content

    const repoConnection = connect({
      repoId: repository,
      branch
    });
    const content = repoConnection.get(id);
    if (content && content._path.startsWith("/archive")) {
      auditLog = {
        type: "system.content.archive",
        user: content.archivedBy,
        time: content.archivedTime
      };
    }
  }

  return {
    status: 404,
    auditLog
  };
}

const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:124.0) Gecko/20100101 Firefox/124.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.13; rv:62.0) Gecko/20100101 Firefox/62.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0"
];

export function checkExternalUrl(url) {
  try {
    let completeUrl = url;
    if (url.indexOf("http://") === -1 && url.indexOf("https://") === -1) {
      completeUrl = `http://${url}`;
    }
    const response = request({
      url: completeUrl,
      method: "GET",
      headers: {
        // Random user agent to simulate real user
        // We want the result to be as close to real (end user visiting link) as possible
        // We only care about the response status, no scraping or anything
        // Should be updated regularly
        "User-Agent": USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      },
      connectionTimeout: app.config.connectionTimeout ? +app.config.connectionTimeout : 5000,
      readTimeout: app.config.readTimeout ? +app.config.readTimeout : 3000
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
    return { error };
  }
}

export function checkNode(node, auditCheck = false) {
  const brokenLinks = [];
  let brokenCount = 0;
  let failedCount = 0;

  const externalLinks = getExternalLinks(JSON.stringify(node));
  const internalLinks = getInternalReferences(node);

  externalLinks.forEach((url) => {
    const { status, error } = checkExternalUrl(url);

    if (error) {
      // Local error with httpClient
      failedCount++;
      brokenLinks.push({
        link: url,
        status: 0,
        error,
        type: "external",
        internal: false
      });
    } else if (status >= 309 && status < 900) {
      // Under 900 to avoid annoying linkedIn response
      brokenCount++;
      brokenLinks.push({
        link: url,
        status,
        type: "external",
        internal: false
      });
    }
  });

  internalLinks.forEach((link) => {
    const { status, auditLog } = checkInternalRef(link, auditCheck);
    if (status >= 309 && status < 900) {
      brokenCount++;
      const brokenLink = {
        link,
        status,
        type: "internal",
        internal: true
      };
      if (auditCheck) {
        brokenLink.auditLog = auditLog;
      }
      brokenLinks.push(brokenLink);
    }
  });

  if (brokenLinks.length === 0) return false;
  return {
    result: {
      displayName: node.displayName,
      path: node._path,
      lastModified: node.modifiedTime,
      owner: node.owner,
      brokenLinks
    },
    brokenCount,
    failedCount
  };
}
