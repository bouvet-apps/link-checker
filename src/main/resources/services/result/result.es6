/* eslint-disable no-param-reassign */
import { connect } from "/lib/xp/node";
import { getPrincipal } from "/lib/xp/auth";
import { newCache } from "/lib/cache";
import { getResultRepoConnection } from "/lib/utils";

const resultCache = newCache({
  size: 1000,
  expire: 60 * 60 * 24
});

export function clearCache() {
  resultCache.clear();
}

export function get(req) {
  const {
    branch, start, count, sort, sortDirection, filter
  } = req.params;

  const { logs, sites } = resultCache.get(`result-${branch}`, () => mapReportsToResult(branch));
  let filtered = [...logs];
  if (filter) {
    filtered = filtered.filter((log) => filter.split(",").indexOf(`${log.repo}__${log.site.name}`) !== -1);
  }

  // Sort and filter on whole list is done each request, no matter the sort and filter
  // Will not be a problem since its only array operations, but might be slow on looooong lists
  let sorted = filtered.sort((a, b) => {
    switch (sort) {
      // Todo: Figure out a shared contstants file, that both server and jsx can use
      case "numBroken":
        return [].concat(a.brokenLinks).length - [].concat(b.brokenLinks).length;
      case "modified":
        return (a.lastModified < b.lastModified) ? -1 : ((a.lastModified > b.lastModified) ? 1 : 0);
      default:
        return 0;
    }
  });
  sorted = sortDirection === "ascending" ? sorted : sorted.reverse();

  const segment = sorted.slice(Number(start), Number(start) + Number(count));
  return {
    body: {
      hits: segment,
      total: filtered.length,
      branchTotal: logs.length,
      start: +start,
      count: +count,
      sites
    },
    contentType: "application/json"
  };
}

function mapReportsToResult(branch) {
  const sites = {};
  const linkRepo = getResultRepoConnection();
  const reportNodeHits = linkRepo.findChildren({ parentKey: "/" }).hits;
  const reports = reportNodeHits.map((reportHit) => linkRepo.get({ key: reportHit.id }));

  let logs = [];
  reports.forEach((report) => {
    const { data } = report;

    const contentRepo = connect({
      repoId: data.repoId,
      branch: data.branch
    });

    // Create list of sites to use for filter
    const uniqueSiteKey = `${data.repoId}__${data.site.name}`;
    if (!sites[uniqueSiteKey]) sites[uniqueSiteKey] = data.site;

    if (!sites[uniqueSiteKey].icon) {
      const siteContent = contentRepo.get({ key: data.site.id });
      const attachments = [].concat(siteContent?.attachment);
      if (attachments.length > 0 && attachments.filter((a) => a?.name === "_thumbnail").length > 0) {
        sites[uniqueSiteKey].icon = true;
      }
    }

    if (data.branch === branch && data.results && data.results.length > 0) {
      logs = logs.concat(enrichNodes(data, contentRepo));
    }
  });

  return {
    logs,
    sites
  };
}

function enrichNodes(data, contentRepo) {
  // Content with broken links under this site
  const nodes = [].concat(data.results);
  const logs = nodes.map((node) => {
    const content = contentRepo.get({ key: `/content${node.path}` });
    // Content may have been deleted since the report was saved
    if (!content) return null;

    if (node.owner) {
      const owner = getPrincipal(node.owner);
      if (owner) node.owner = owner;
    }

    node.brokenLinks = [].concat(node.brokenLinks).map((link) => enrichLink(link, content));
    node.repo = data.repoId;
    node.site = data.site;
    node.branch = data.branch;
    // Extract only fields we need
    node.content = {
      _path: content._path,
      _id: content._id,
      displayName: content.displayName,
      type: content.type,
      // Need these to detect if this content is in layer
      inherit: content.inherit,
      originProject: content.originProject
    };

    return node;
  });

  return logs.filter(Boolean);
}

export function enrichLink(link, content) {
  if (link.auditLog?.user) {
    const user = getPrincipal(link.auditLog.user);
    if (user) link.auditLog.user = user;
  }
  // Todo: Consider doing the audit log lookup here istead of during task

  const [field, value] = findKeyPathByValueInJson(content, link.link);
  if (field) link.field = field;
  if (field && value && value !== link.link) link.surroundingText = value;

  return link;
}

// Traverse content json to find the object path to the value.
// E.g. components.3.part.config.my-app.my-part.body
function findKeyPathByValueInJson(_obj, value) {
  const keyPath = [];
  let fullValue;

  function findKeyPathByValueInJsonRecursive(obj) {
    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (obj[key] === value || (typeof obj[key] === "string" && obj[key].indexOf(value) !== -1)) {
        keyPath.push(key);
        fullValue = obj[key];
        return keyPath;
      } if (typeof obj[key] === "object" && obj[key] instanceof Object) {
        keyPath.push(key);
        const result = findKeyPathByValueInJsonRecursive(obj[key]);
        if (result) {
          return result;
        }
        keyPath.pop();
      }
    }
    return false;
  }
  try {
    const path = findKeyPathByValueInJsonRecursive(_obj, value);
    return [path, fullValue];
  } catch (e) {
    log.error(e);
    return [];
  }
}
