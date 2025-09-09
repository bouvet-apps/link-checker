import { query, getSiteConfig } from "/lib/xp/content";
import { list as listRepos } from "/lib/xp/repo";
import { run as runInContext } from "/lib/xp/context";
import { getPrincipal } from "/lib/xp/auth";
import { progress } from "/lib/xp/task";

import { saveResults, getSites } from "/lib/utils";
// import { sendSiteEmails, sendOwnerEmails } from "/lib/email";
import { checkNode } from "/lib/checker";

const PAGINATION_COUNT = 20;

let emailMap = {};
let ownerMap = {};

export function run() {
  progress({ info: "Check Sites - Initializing task" });
  emailMap = {};
  ownerMap = {};
  const contentRepos = runInContext({
    principals: ["role:system.admin"]
  }, () => listRepos().filter((repo) => repo.id.indexOf("com.enonic.cms") !== -1));

  contentRepos.forEach(runForRepo);

  // sendSiteEmails(emailMap);
  // sendOwnerEmails(ownerMap);
  // log.info(JSON.stringify(emailMap, null, 2));
  // log.info(JSON.stringify(ownerMap, null, 2));

  emailMap = {};
  ownerMap = {};
}

function runForRepo(repo) {
  runForBranch(repo.id, "draft");
  runForBranch(repo.id, "master");
}

function runForBranch(repository, branch) {
  runInContext({
    repository,
    branch,
    principals: ["role:system.admin", "role:cms.expert", "role:cms.admin"]
  }, () => {
    runForSites(repository, branch);
  });
}

function runForSites(repoId, branch) {
  const sites = getSites();
  sites.forEach((site, i) => {
    const {
      fromEmail, toEmail, alertOwner, alertSuffix
    } = getSiteConfig({
      key: site._id,
      applicationKey: app.name
    });

    const contentWithBroken = [];

    let total = 9999;
    let start = 0;

    while (start < total) {
      // Sites within sites will produce duplicated results...
      const queryString = `_path LIKE '/content${site._path}/*'`;
      const { hits, total: queryTotal } = query({
        start,
        count: PAGINATION_COUNT,
        query: queryString
      });

      total = queryTotal;

      // Only PAGINATION_COUNT amount of content nodes are kept in memory at a time
      // eslint-disable-next-line no-loop-func
      hits.forEach((node, index) => {
        const checkResult = checkNode(node, true);
        if (checkResult && checkResult.result) {
          contentWithBroken.push(checkResult.result);
        }
        if (((index + 1) % 20 === 0) || index + start + 1 === total) {
          progress({
            info: `Check Sites - ${repoId} - ${i + 1}/${sites.length} - ${site._name} ${branch}`,
            current: index + start + 1,
            total: queryTotal
          });
        }
      });

      start += PAGINATION_COUNT;
    }

    saveResults(contentWithBroken, site, repoId, branch);

    // We want recipients to recieve the least amount of emails possible,
    // so we'll create a map to optimize for that

    if (fromEmail && toEmail) {
      // Email for whole site
      emailMap[toEmail] = emailMap[toEmail] || {};
      emailMap[toEmail][fromEmail] = emailMap[toEmail][fromEmail] || [];
      emailMap[toEmail][fromEmail].push({
        site,
        repoId,
        branch,
        nodes: contentWithBroken
      });
    }

    if (fromEmail && alertOwner) {
      // Email per owner of content, have to create array of nodes for each owner
      contentWithBroken.forEach((node) => {
        if (node) {
          const { owner } = node;
          const user = getPrincipal(owner);
          if (!user || !user?.email) return;
          const ownerEmail = user.email;

          const home = `${repoId}__${site._name}__${branch}`;

          ownerMap[ownerEmail] = ownerMap[ownerEmail] || {};
          ownerMap[ownerEmail][fromEmail] = ownerMap[ownerEmail][fromEmail] || [];
          ownerMap[ownerEmail][fromEmail][home] = ownerMap[ownerEmail][fromEmail][home] || {
            alertSuffix,
            site,
            repoId,
            branch,
            nodes: []
          };
          ownerMap[ownerEmail][fromEmail][home].nodes.push(node);
        }
      });
    }
  });
}
