import { saveResults } from "../../lib/utils";
import { getExternalLinks, getInternalReferences, checkInternalLink, checkExternalUrl } from "../../services/link-checker/link-checker";

const libs = {
  content: require("/lib/xp/content"),
  context: require("/lib/xp/context"),
  httpClient: require("/lib/http-client"),
  cache: require("/lib/cache"),
  auth: require("/lib/xp/auth"),
  webSocket: require("/lib/xp/websocket"),
  i18n: require("/lib/xp/i18n"),
};



const PAGINATION_COUNT = 500;
const BRANCH = 'draft';
let locale = 'no';


const iterateFetch = (start, types) => {
  const { hits, total: contentNodesTotal } = libs.content.query({
    start: start,
    count: PAGINATION_COUNT,
    query: "",
    contentTypes: types
  });
  let fetched = hits;
  if(start + fetched.length < contentNodesTotal){
    fetched = fetched.concat(iterateFetch(start + fetched.length, types))
  }
  return fetched;
}

const checkNode = (node) => {
  const brokenLinks = [];
  /**
   * @phrases ["services.link-checker.external-url", "services.link-checker.internal-content"]
   */
  const localizedExternalUrl = libs.i18n.localize({ key: "services.link-checker.external-url", locale }) || "External URL";
  const localizedInternalContent = libs.i18n.localize({ key: "services.link-checker.internal-content", locale }) || "Internal content";

  const urls = {
    externalLinks: getExternalLinks(JSON.stringify(node)),
    internalLinks: getInternalReferences(node)
  };


  urls.externalLinks.forEach((url) => {
    const { status, error } = checkExternalUrl(url);

    if (error) {
      // Local error with httpClient
      brokenLinks.push({ link: url, status: 0, type: localizedExternalUrl, internal: false });
    } else if (status >= 309 && status < 900) {
      // Under 900 to avoid annoying linkedIn response
      brokenLinks.push({ link: url, status: status, type: localizedExternalUrl, internal: false });
    }
  });

  urls.internalLinks.forEach((link) => {
    const { status } = checkInternalLink(link, BRANCH);
    if (status >= 309 && status < 900) {
      brokenLinks.push({ link: link, status, type: localizedInternalContent, internal: true });
    }
  });
  let data = null;

  if (brokenLinks.length > 0) {
    data = {
      displayName: node.displayName, path: node._path, brokenLinks
    };

  }
  return data
}



const checkLinks = () => {

  const allContentTypes = libs.content.getTypes().map((type) => type.name);
  const searchedContentTypes = allContentTypes.filter((type) => !type.startsWith("media:") && !type.startsWith("base:"));
  
  let nodesFetched = iterateFetch(0, searchedContentTypes)
  // nodesFetched = nodesFetched.slice(0,100)
  let checkedNodes = nodesFetched.map((node, index) => {
    if (node._id) {
      return checkNode(node);
    }
  }).filter(node => !!node);
  
  saveResults(checkedNodes)
  

}


export function run() {
  libs.context.run({
      branch: BRANCH,
      principals: ['role:system.admin']
    }, checkLinks);
  }

