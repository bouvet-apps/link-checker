const libs = {
  portal: require("/lib/xp/portal"),
  thymeleaf: require("/lib/thymeleaf")
};

const view = resolve("link-checker.html");

exports.get = (req) => {
  let contentId = req.params.contentId;
  if (!contentId && libs.portal.getContent()) {
    contentId = libs.portal.getContent()._id;
  }

  if (!contentId) {
    return {
      contentType: "text/html",
      body: "<widget class=\"error\">No content selected</widget>"
    };
  }

  let url = libs.portal.serviceUrl({
    service: "link-checker",
    type: "absolute",
    params: {
      contentId,
      branch: "draft"
    }
  });
  url = url.replace(/^http:\/\//i, "ws://");
  url = url.replace(/^https:\/\//i, "wss://");

  const widgetScriptUrl = libs.portal.assetUrl({ path: "js/widget.js" });

  const model = {
    serviceUrl: url,
    key: contentId,
    widgetScriptUrl
  };

  return {
    body: libs.thymeleaf.render(view, model),
    contentType: "text/html"
  };
};
