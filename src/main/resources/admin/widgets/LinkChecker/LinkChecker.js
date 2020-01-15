var portalLib = require("/lib/xp/portal");
var thymeleaf = require("/lib/thymeleaf");

var view = resolve("LinkChecker.html");

exports.get = function(req) {
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

  var url = portalLib.serviceUrl({
    service: "LinkChecker",
    type: "absolute",
    params: {
      contentId,
      branch: "draft"
    }
  });
  url = url.replace(/^http:\/\//i, "ws://");
  url = url.replace(/^https:\/\//i, "wss://");
  var model = { serviceUrl: url, key: contentId };
  return {
    body: thymeleaf.render(view, model),
    contentType: "text/html"
  };
};
