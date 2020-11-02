const portalLib = require("/lib/xp/portal");
const thymeleaf = require("/lib/xp/thymeleaf");

const view = resolve("link-checker.html");

exports.get = req => {
  let url = portalLib.serviceUrl({
    service: "link-checker",
    type: "absolute",
    params: {
      contentId: req.params.contentId,
      branch: "draft"
    }
  });
  url = url.replace(/^http:\/\//i, "ws://");
  url = url.replace(/^https:\/\//i, "wss://");

  const widgetScriptUrl = portalLib.assetUrl({ path: "js/widget.js" });
  
  const model = { 
    serviceUrl: url, 
    key: req.params.contentId, 
    widgetScriptUrl
  };

  return {
    body: thymeleaf.render(view, model),
    contentType: "text/html"
  };
};
