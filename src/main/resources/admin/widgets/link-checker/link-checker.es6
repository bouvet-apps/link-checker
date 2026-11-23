const libs = {
  portal: require("/lib/xp/portal"),
  content: require("/lib/xp/content"),
  thymeleaf: require("/lib/thymeleaf"),
  i18n: require("/lib/xp/i18n")
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

  const content = libs.content.get({ key: contentId });

  let publishedContent = false;
  if (content?.publish?.from) {
    // Content exist in master branch
    publishedContent = true;
  }

  let url = libs.portal.serviceUrl({
    service: "link-checker",
    type: "absolute",
    params: {
      contentId,
      repository: req.params.repository
    }
  });
  url = url.replace(/^http:\/\//i, "ws://");
  url = url.replace(/^https:\/\//i, "wss://");

  const widgetScriptUrl = libs.portal.assetUrl({ path: "js/widget.js" });

  const locale = content?.language || "no";

  const model = {
    serviceUrl: url,
    key: contentId,
    widgetScriptUrl,
    publishedContent,
    locale,
    /**
     * @phrases ["info", "start", "radio-legend", "radio-this-content",
     * "radio-child-content", "radio-both", "stop", "download-report",
     * "loading","from", "draft-explanation", "master-explanation",
     * "explanation-title",
     *
     * "manual-review", "broken-link", "broken-links", "report",
     * "found", "invalid-link", "invalid-links",
     * "download-more", "no-broken-links", "tips-and-info",
     * "internal-content-links-tip", "common-cause-internal-tip", "target-content-deleted-tip",
     * "content-imported-tip", "content-not-found-tip", "cache-tip",
     * "http403", "http404", "http408", "http500", "http503", "status-code", "status-message"]
     */
    localized: {
      info: libs.i18n.localize({
        key: "info",
        locale
      }),
      start: libs.i18n.localize({
        key: "start",
        locale
      }),
      radioLegend: libs.i18n.localize({
        key: "radio-legend",
        locale
      }),
      radioThisContent: libs.i18n.localize({
        key: "radio-this-content",
        locale
      }),
      radioChildContent: libs.i18n.localize({
        key: "radio-child-content",
        locale
      }),
      radioBoth: libs.i18n.localize({
        key: "radio-both",
        locale
      }),
      stop: libs.i18n.localize({
        key: "stop",
        locale
      }),
      downloadReport: libs.i18n.localize({
        key: "download-report",
        locale
      }),
      loading: libs.i18n.localize({
        key: "loading",
        locale
      }),
      from: libs.i18n.localize({
        key: "from",
        locale
      }),
      draftExplanation: libs.i18n.localize({
        key: "draft-explanation",
        locale
      }),
      masterExplanation: libs.i18n.localize({
        key: "master-explanation",
        locale
      }),
      explanationTitle: libs.i18n.localize({
        key: "explanation-title",
        locale
      })
    },
    localizedString: JSON.stringify({
      manualReview: libs.i18n.localize({
        key: "manual-review",
        locale
      }),
      brokenLink: libs.i18n.localize({
        key: "broken-link",
        locale
      }),
      brokenLinks: libs.i18n.localize({
        key: "broken-links",
        locale
      }),
      report: libs.i18n.localize({
        key: "report",
        locale
      }),
      found: libs.i18n.localize({
        key: "found",
        locale
      }),
      invalidLink: libs.i18n.localize({
        key: "invalid-link",
        locale
      }),
      invalidLinks: libs.i18n.localize({
        key: "invalid-links",
        locale
      }),
      downloadMore: libs.i18n.localize({
        key: "download-more",
        locale
      }),
      noBrokenLinks: libs.i18n.localize({
        key: "no-broken-links",
        locale
      }),
      tipsAndInfo: libs.i18n.localize({
        key: "tips-and-info",
        locale
      }),
      internalContentLinksTip: libs.i18n.localize({
        key: "internal-content-links-tip",
        locale
      }),
      commonCauseInternalTip: libs.i18n.localize({
        key: "common-cause-internal-tip",
        locale
      }),
      targetContentDeletedTip: libs.i18n.localize({
        key: "target-content-deleted-tip",
        locale
      }),
      contentImportedTip: libs.i18n.localize({
        key: "content-imported-tip",
        locale
      }),
      contentNotFoundTip: libs.i18n.localize({
        key: "content-not-found-tip",
        locale
      }),
      cacheTip: libs.i18n.localize({
        key: "cache-tip",
        locale
      }),
      http403: libs.i18n.localize({
        key: "http403",
        locale
      }),
      http404: libs.i18n.localize({
        key: "http404",
        locale
      }),
      http408: libs.i18n.localize({
        key: "http408",
        locale
      }),
      http500: libs.i18n.localize({
        key: "http500",
        locale
      }),
      http503: libs.i18n.localize({
        key: "http503",
        locale
      }),
      statusCode: libs.i18n.localize({
        key: "status-code",
        locale
      }),
      statusMessage: libs.i18n.localize({
        key: "status-message",
        locale
      })
    })
  };

  return {
    body: libs.thymeleaf.render(view, model),
    contentType: "text/html"
  };
};
