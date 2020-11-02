const portalLib = require("/lib/xp/portal");
const thymeleaf = require("/lib/thymeleaf");

const view = resolve("link-checker.html");

exports.get = req => {
  var contentId = req.params.contentId;
  if (!contentId && portalLib.getContent()) {
    contentId = portalLib.getContent()._id;
  }

  if (!contentId) {
    return {
      contentType: 'text/html',
      body: '<widget class="error">No content selected</widget>'
    };
  }

  let url = portalLib.serviceUrl({
    service: "link-checker",
    type: "absolute",
    params: {
      contentId,
      branch: "draft"
    }
  });
  url = url.replace(/^http:\/\//i, "ws://");
  url = url.replace(/^https:\/\//i, "wss://");

  const widgetScriptUrl = portalLib.assetUrl({ path: "js/widget.js" });

  const model = {
    serviceUrl: url,
    key: contentId,
    widgetScriptUrl
  };

  return {
    body: thymeleaf.render(view, model),
    contentType: "text/html"
  };
};
