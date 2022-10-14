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

  const locale = content?.language || 'no';

  const model = {
    serviceUrl: url,
    key: contentId,
    widgetScriptUrl,
    publishedContent,
    locale,
    /**
     * @phrases ["widgets.link-checker.info", "widgets.link-checker.start", "widgets.link-checker.radio-legend", "widgets.link-checker.radio-this-content",
     * "widgets.link-checker.radio-child-content", "widgets.link-checker.radio-both", "widgets.link-checker.stop", "widgets.link-checker.download-report",
     * "widgets.link-checker.loading","widgets.link-checker.from", "widgets.link-checker.draft-explanation", "widgets.link-checker.master-explanation",
     * "widgets.link-checker.explanation-title",
     *
     * "widgets.link-checker.manual-review", "widgets.link-checker.broken-link", "widgets.link-checker.broken-links", "widgets.link-checker.report",
     * "widgets.link-checker.found", "widgets.link-checker.invalid-link", "widgets.link-checker.invalid-links",
     * "widgets.link-checker.download-more", "widgets.link-checker.no-broken-links", "widgets.link-checker.tips-and-info",
     * "widgets.link-checker.internal-content-links-tip", "widgets.link-checker.common-cause-internal-tip", "widgets.link-checker.target-content-deleted-tip",
     * "widgets.link-checker.content-imported-tip", "widgets.link-checker.content-not-found-tip", "widgets.link-checker.cache-tip",
     * "http403", "http404", "http408", "http500", "http503", "status-code", "status-message"]
     */
    localized: {
      info: libs.i18n.localize({ key: "widgets.link-checker.info", locale }),
      start: libs.i18n.localize({ key: "widgets.link-checker.start", locale }),
      radioLegend: libs.i18n.localize({ key: "widgets.link-checker.radio-legend", locale }),
      radioThisContent: libs.i18n.localize({ key: "widgets.link-checker.radio-this-content", locale }),
      radioChildContent: libs.i18n.localize({ key: "widgets.link-checker.radio-child-content", locale }),
      radioBoth: libs.i18n.localize({ key: "widgets.link-checker.radio-both", locale }),
      stop: libs.i18n.localize({ key: "widgets.link-checker.stop", locale }),
      downloadReport: libs.i18n.localize({ key: "widgets.link-checker.download-report", locale }),
      loading: libs.i18n.localize({ key: "widgets.link-checker.loading", locale }),
      from: libs.i18n.localize({ key: "widgets.link-checker.from", locale }),
      draftExplanation: libs.i18n.localize({ key: "widgets.link-checker.draft-explanation", locale }),
      masterExplanation: libs.i18n.localize({ key: "widgets.link-checker.master-explanation", locale }),
      explanationTitle: libs.i18n.localize({ key: "widgets.link-checker.explanation-title", locale })
    },
    localizedString: JSON.stringify({
      manualReview: libs.i18n.localize({ key: "widgets.link-checker.manual-review", locale }),
      brokenLink: libs.i18n.localize({ key: "widgets.link-checker.broken-link", locale }),
      brokenLinks: libs.i18n.localize({ key: "widgets.link-checker.broken-links", locale }),
      report: libs.i18n.localize({ key: "widgets.link-checker.report", locale }),
      found: libs.i18n.localize({ key: "widgets.link-checker.found", locale }),
      invalidLink: libs.i18n.localize({ key: "widgets.link-checker.invalid-link", locale }),
      invalidLinks: libs.i18n.localize({ key: "widgets.link-checker.invalid-links", locale }),
      downloadMore: libs.i18n.localize({ key: "widgets.link-checker.download-more", locale }),
      noBrokenLinks: libs.i18n.localize({ key: "widgets.link-checker.no-broken-links", locale }),
      tipsAndInfo: libs.i18n.localize({ key: "widgets.link-checker.tips-and-info", locale }),
      internalContentLinksTip: libs.i18n.localize({ key: "widgets.link-checker.internal-content-links-tip", locale }),
      commonCauseInternalTip: libs.i18n.localize({ key: "widgets.link-checker.common-cause-internal-tip", locale }),
      targetContentDeletedTip: libs.i18n.localize({ key: "widgets.link-checker.target-content-deleted-tip", locale }),
      contentImportedTip: libs.i18n.localize({ key: "widgets.link-checker.content-imported-tip", locale }),
      contentNotFoundTip: libs.i18n.localize({ key: "widgets.link-checker.content-not-found-tip", locale }),
      cacheTip: libs.i18n.localize({ key: "widgets.link-checker.cache-tip", locale }),
      http403: libs.i18n.localize({ key: "http403", locale }),
      http404: libs.i18n.localize({ key: "http404", locale }),
      http408: libs.i18n.localize({ key: "http408", locale }),
      http500: libs.i18n.localize({ key: "http500", locale }),
      http503: libs.i18n.localize({ key: "http503", locale }),
      statusCode: libs.i18n.localize({ key: "status-code", locale }),
      statusMessage: libs.i18n.localize({ key: "status-message", locale })
    })
  };

  return {
    body: libs.thymeleaf.render(view, model),
    contentType: "text/html"
  };
};
