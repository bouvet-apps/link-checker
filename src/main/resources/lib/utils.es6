const libs = {
  repo: require("/lib/xp/repo"),
  context: require("/lib/xp/context"),
  content: require("/lib/xp/content"),
  node: require("/lib/xp/node"),
};


const REPO_NAME = "link-checker";
const LINK_CHECK_NODE = "log";



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

const saveResults = (result, name) => {
  const repo = getRepoConnection();
  if (repo.exists(`/${name}`)) {
    repo.delete(`/${name}`);
    log.info("Removing old log at...")
    log.info(name)
  } 

  log.info("Logging link checker results for " + name)
    let createdNode = repo.create({
      _name: name,
      displayName: name,
      brokenCount: result.length,
      timestamp: Date.now(),
      results: result
    })


}

exports.saveResults = saveResults

const getSites = () => libs.content.query({
  query: "_path LIKE '/content/*' AND data.siteConfig.applicationKey = '" + app.name + "'",
  contentTypes: ["portal:site"]
});

exports.getSites = getSites;
