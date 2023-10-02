const libs = {
  repo: require("/lib/xp/repo"),
  context: require("/lib/xp/context"),
  content: require("/lib/xp/content"),
  node: require("/lib/xp/node"),
  io: require("/lib/xp/io")
};


const REPO_NAME = "link-checker";


/**
 * Sets up repository and structure.
 */
const initRepository = () => {
  let result = libs.context.run(
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
        const result1 = libs.repo.create({
          id: REPO_NAME
        });
        log.info(`Repository created with id ${result1.id}`);
      }

      // Set up repository
      libs.node.connect({
        repoId: REPO_NAME,
        branch: "master"
      });
    }
  );
};

exports.initRepository = initRepository;

const generateMailReport = (results) => {
  let resultstring = "Name, Path, Link, Status, Type, Internal ";
  results.forEach((result) => {
    // Commas break the format, but are legal in Enonic names
    resultstring += `\n ${result.displayName.replace(",", "")}, ${result.path}, `;
    result.brokenLinks.forEach((link, index) => {
      if (index === 0) {
        resultstring += `${link.link}, ${link.status}, ${link.type}, ${link.internal}`;
      } else {
        resultstring += `\n , , ${link.link}, ${link.status}, ${link.type}, ${link.internal}`;
      }
    });
  });
  const stream = libs.io.newStream(resultstring);
  return stream;
};


exports.generateMailReport = generateMailReport;


const getRepoConnection = () => libs.node.connect({
  repoId: REPO_NAME,
  branch: "master"
});
exports.getRepoConnection = getRepoConnection;

const saveResults = (result, name) => {
  const repo = getRepoConnection();
  if (repo.exists(`/${name}`)) {
    repo.delete(`/${name}`);
    log.info(`Removing old log at... ${name}`);
  }

  log.info(`Logging link checker results for ${name}`);
  repo.create({
    _name: name,
    displayName: name,
    brokenCount: result.length,
    timestamp: Date.now(),
    results: [].concat(result)
  });
};

exports.saveResults = saveResults;

const getSites = () => libs.content.query({
  query: `_path LIKE '/content/*' AND data.siteConfig.applicationKey = '${app.name}'`,
  contentTypes: ["portal:site"]
});

exports.getSites = getSites;
