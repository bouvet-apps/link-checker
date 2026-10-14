import { get as getRepo, create as createRepo } from "/lib/xp/repo";
import { run as runInContext } from "/lib/xp/context";
import { query } from "/lib/xp/content";
import { connect } from "/lib/xp/node";
import { newStream } from "/lib/xp/io";

const REPO_NAME = `${app.name}.result`;

/**
 * Sets up repository and structure.
 */
export function initRepository() {
  runInContext(
    { principals: ["role:system.admin"] },
    () => {
      const existing = getRepo(REPO_NAME);
      if (existing) {
        log.info(`Link Checker result repository exists with id ${existing.id}`);
        return;
      }

      // Create repository
      log.info("Link Checker result repository does not exist, setting it up");
      const newRepo = createRepo({
        id: REPO_NAME
      });
      log.info(`Repository created with id ${newRepo.id}`);
    }
  );
}

function csvField(value) {
  const text = value === undefined || value === null ? "" : String(value);
  return `"${text.replace(/"/g, "\"\"")}"`;
}

export function generateMailReport(results) {
  let resultstring = "Name,Path,Owner,Last modified,Link,Status,Type,Internal";
  results.forEach((result) => {
    [].concat(result.brokenLinks).forEach((link, index) => {
      const contentFields = index === 0
        ? [result.displayName, result.path, result.owner, result.lastModified]
        : ["", "", "", ""];
      const row = contentFields.concat([link.link, link.status, link.type, link.internal]);
      resultstring += `\n${row.map(csvField).join(",")}`;
    });
  });
  const stream = newStream(resultstring);
  return stream;
}

export function getResultRepoConnection() {
  return connect({
    repoId: REPO_NAME,
    branch: "master"
  });
}

export function saveResults(result, site, repoId, branch) {
  const siteName = site._name;
  const repo = getResultRepoConnection();

  const name = `${repoId}__${siteName}__${branch}`;
  if (repo.exists(`/${name}`)) {
    repo.delete(`/${name}`);
    log.info(`Removing old log at... ${name}`);
  }

  log.info(`Logging link checker results for ${name}`);
  repo.create({
    _name: name,
    displayName: name,
    data: {
      siteName,
      site: {
        displayName: site.displayName,
        name: siteName,
        id: site._id
      },
      repoId,
      branch,
      brokenCount: result.length,
      timestamp: Date.now(),
      results: [].concat(result)
    }
  });
}

// Get all sites with app installed (in repo context)
export function getSites() {
  return query({
    query: `_path LIKE '/content/*' AND data.siteConfig.applicationKey = '${app.name}'`,
    contentTypes: ["portal:site"],
    count: -1
  }).hits;
}

/**
 *   Simple utility function for forcing something to be an array
 *
 *   Call by using forceArray(object)
 *   forceArray will always return an array.
 *   If the object we are forcing is undefined,
 *   the returned array will be empty
 * */
export function forceArray(object) {
  /* eslint-disable no-else-return */
  /* eslint-disable eqeqeq */
  if (!object || (typeof object === "object" && !Object.keys(object).length)) {
    return [];
  } else if (object.constructor != Array || typeof object === "string") {
    return [object];
  } else {
    return object;
  }
};
