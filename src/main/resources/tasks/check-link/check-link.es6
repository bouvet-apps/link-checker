import { saveResults, generateMailReport, getSites } from "../../lib/utils";
import {
  getExternalLinks, getInternalReferences, checkInternalLink, checkExternalUrl
} from "../../services/link-checker/link-checker";

const libs = {
  content: require("/lib/xp/content"),
  context: require("/lib/xp/context"),
  httpClient: require("/lib/http-client"),
  cache: require("/lib/cache"),
  auth: require("/lib/xp/auth"),
  webSocket: require("/lib/xp/websocket"),
  i18n: require("/lib/xp/i18n"),
  mail: require("/lib/xp/mail")
};


const PAGINATION_COUNT = 500;
const BRANCH = "draft";
const locale = "no";
const QUERYBASE = "_path LIKE '/content";

const iterateFetch = (start, siteName) => {
  const queryString = `${QUERYBASE}/${siteName}/*'`;
  const { hits, total: contentNodesTotal } = libs.content.query({
    start,
    count: PAGINATION_COUNT,
    query: queryString
  });
  let fetched = hits;
  if (start + fetched.length < contentNodesTotal) {
    fetched = fetched.concat(iterateFetch(start + fetched.length, siteName));
  }
  return fetched;
};

const checkNode = (node) => {
  const brokenLinks = [];
  /**
   * @phrases ["services.link-checker.external-url", "services.link-checker.internal-content"]
   */
  const localizedExternalUrl = libs.i18n.localize({
    key: "services.link-checker.external-url",
    locale
  }) || "External URL";
  const localizedInternalContent = libs.i18n.localize({
    key: "services.link-checker.internal-content",
    locale
  }) || "Internal content";

  const urls = {
    externalLinks: getExternalLinks(JSON.stringify(node)),
    internalLinks: getInternalReferences(node)
  };


  urls.externalLinks.forEach((url) => {
    const { status, error } = checkExternalUrl(url);

    if (error) {
      // Local error with httpClient
      brokenLinks.push({
        link: url,
        status: 0,
        type: localizedExternalUrl,
        internal: false
      });
    } else if (status >= 309 && status < 900) {
      // Under 900 to avoid annoying linkedIn response
      brokenLinks.push({
        link: url,
        status,
        type: localizedExternalUrl,
        internal: false
      });
    }
  });

  urls.internalLinks.forEach((link) => {
    const { status } = checkInternalLink(link, BRANCH);
    if (status >= 309 && status < 900) {
      brokenLinks.push({
        link,
        status,
        type: localizedInternalContent,
        internal: true
      });
    }
  });
  let data = null;

  if (brokenLinks.length > 0) {
    data = {
      displayName: node.displayName,
      path: node._path,
      lastModified: node.modifiedTime,
      owner: node.owner,
      brokenLinks
    };
  }
  return data;
};


const checkLinks = () => {
  const sites = getSites();

  [].concat(sites.hits).forEach((site) => {
    const siteConfig = libs.content.getSiteConfig({
      key: site._id,
      applicationKey: app.name
    });
    const nodesFetched = iterateFetch(0, site._name);

    // nodesFetched = nodesFetched.slice(0,100)
    const checkedNodes = nodesFetched.map((node) => {
      if (node._id) {
        return checkNode(node);
      }
      return false;
    }).filter(node => !!node);
    const report = generateMailReport(checkedNodes);
    saveResults(checkedNodes, site._name);

    if (siteConfig.email && siteConfig.email !== "") {
      libs.mail.send({
        from: "christian.b.rokke@gmail.com",
        to: siteConfig.email,
        subject: "test",
        body: "hei",
        attachments: [
          {
            // .xlsx is difficult to build on the backend, but .csv is easy.
            // Excel reads it just fine.
            fileName: `${site._name}.csv`,
            mimeType: "text/csv",
            data: report
          }
        ]
      });
    }
  });
};

/* eslint-disable import/prefer-default-export */
export function run() {
  libs.context.run({
    branch: BRANCH,
    principals: ["role:system.admin"]
  }, checkLinks);
}
