const libs = {
  repo: require("/lib/xp/repo"),
  context: require("/lib/xp/context"),
  node: require("/lib/xp/node"),
};


const REPO_NAME = "link-checker";
const LINK_CHECK_NODE = "log";
const LOG_PATH = `/${LINK_CHECK_NODE}`;

exports.LOG_PATH = LOG_PATH



/**
 * Sets up repository and structure.
 */
const initRepository = () => {
  var result = libs.context.run(
    {
      repository: "system-repo",
      branch: "master",
      user: {
        login: "su",
        userStore: "system"
      },
      principals: ["role:system.admin"],
      attributes: {
        ignorePublishTimes: true
      }
    },
    () => {
      result = libs.repo.get(REPO_NAME);

      // Create repository
      if (result) {
        log.info("Link Checker storage repository exists");
      } else {
        log.info("Link Checker storage repository does not exist, setting it up");
        var result1 = libs.repo.create({
          id: REPO_NAME
        });
        log.info("Repository created with id " + result1.id);
      }

      // Set up repository
      const repo = libs.node.connect({
        repoId: REPO_NAME,
        branch: 'master'
      });

    }
  );

};

exports.initRepository = initRepository;


const getRepoConnection = () => {
  return libs.node.connect({
    repoId: REPO_NAME,
    branch: 'master'
  });
};
exports.getRepoConnection = getRepoConnection;

const saveResults = (result) => {
  const repo = getRepoConnection();
  if (!repo.exists(LOG_PATH)) {
    log.info("Logging link checker results")
    let createdNode = repo.create({
      _name: LINK_CHECK_NODE,
      displayName: 'Link Checker scan results',
      brokenCount: result.length,
      results: result
    })
  } else {
    repo.delete(LOG_PATH);
    log.info("Removing old log...")
    saveResults(result);
  }

}

exports.saveResults = saveResults
