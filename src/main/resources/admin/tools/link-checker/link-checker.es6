const { getRepoConnection } = require("../../../lib/utils");

const libs = {
  thymeleaf: require("/lib/thymeleaf"),
  node: require("/lib/xp/node")
};

exports.get = () => {
  const view = resolve("./link-checker.html");

  const linkRepo = getRepoConnection();
  const logNodes = linkRepo.findChildren({ parentKey: "/" });


  const renderLink = (link) => {
    let brokenLinkTarget = `<a href="${link.link}" target="_blank">${link.link}</a>`;
    if (link.internal) {
      brokenLinkTarget = `<p>${link.link}</p>`;
    }
    return (`
        <div class="broken-links-error__link">
          <div class="broken-links-error__link__body">
            <div style="margin-right: 5px;">${link.type}</div>
            <span style="margin-left: 5px">${link.status}</span>
          </div>
          <div class="broken-links-error__link__target">
            ${brokenLinkTarget}
          </div>
        </div>
      `);
  };

  let report = "";
  logNodes.hits.forEach((logNode) => {
    const linkResultNode = linkRepo.get({ key: logNode.id });
    report += `<h1>Log for ${linkResultNode.displayName}</h1>`;
    linkResultNode.results.forEach((result) => {
      report += (`
        <div class="widget-view active internal-widget">
          <div class="widget-item-view properties-widget-item-view">
            <div class="broken-links-error">
              <h3>
                Found ${[].concat(result.brokenLinks).length} ${([].concat(result.brokenLinks).length > 1 ? "invalid links" : "invalid link")}
              </h3>
              <h4>${result.displayName}</h4>
              <div class="broken-links-error__body">
      `);


      [].concat(result.brokenLinks).forEach((link) => {
        report += renderLink(link);
      });


      report += (`
              </div>
            </div>
          </div>
        </div>
      `);
    });
  });


  const model = {
    report,
    log: JSON.stringify(logNodes)
  };


  return {
    contentType: "text/html",
    body: libs.thymeleaf.render(view, model)
  };
};
