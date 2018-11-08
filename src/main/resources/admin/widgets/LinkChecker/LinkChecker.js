var portalLib = require("/lib/xp/portal");
var thymeleaf = require("/lib/xp/thymeleaf");

var view = resolve("LinkChecker.html");

exports.get = function(req) {
  var url = portalLib.serviceUrl({
    service: "LinkChecker",
    type: "absolute",
    params: {
      contentId: req.params.contentId,
      branch: "draft"
    }
  });
  url = url.replace(/^http:\/\//i, "ws://");
  url = url.replace(/^https:\/\//i, "wss://");
  var model = { serviceUrl: url, key: req.params.contentId };
  return {
    body: thymeleaf.render(view, model),
    contentType: "text/html"
  };
};
