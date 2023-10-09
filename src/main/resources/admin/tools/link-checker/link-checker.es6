const { getRepoConnection } = require("../../../lib/utils");

const libs = {
  thymeleaf: require("/lib/thymeleaf"),
  node: require("/lib/xp/node")
};

exports.get = () => {
  const view = resolve("./link-checker.html");

  const linkRepo = getRepoConnection();
  const logNodes = linkRepo.findChildren({ parentKey: "/" });


  const report = logNodes.hits.map(site => linkRepo.get({ key: site.id }));
  const logArray = [];
  report.forEach((site) => {
    site.results.forEach((node) => {
      logArray.push(
        {
          ...node,
          site: site.displayName
        }
      );
    });
  });

  const model = {
    report: JSON.stringify(logArray, null, 4)
  };


  return {
    contentType: "text/html",
    body: libs.thymeleaf.render(view, model)
  };
};
