/* eslint-disable no-param-reassign */
import { render } from "/lib/thymeleaf";
import { serviceUrl } from "/lib/xp/portal";
import { getPhrases } from "/lib/xp/i18n";
import { isRunning as isTaskRunning } from "/lib/xp/task";

import { getResultRepoConnection } from "/lib/utils";
import { getBrowserSyncScript, isRunning } from "/lib/browsersync";

export function get(request) {
  const linkRepo = getResultRepoConnection();

  let lastRun = "";
  const latest = linkRepo.query({
    sort: "_ts DESC",
    count: 1,
    start: 0
  }).hits[0];
  if (latest) {
    const latestReport = linkRepo.get({ key: latest.id });
    lastRun = latestReport._ts;
  }

  const inProgress = isTaskRunning(`${app.name}:check-sites`);
  const model = {
    props: JSON.stringify({
      api: {
        result: serviceUrl({ service: "result" }),
        trigger: serviceUrl({ service: "trigger" }),
        checkTaskStatus: serviceUrl({ service: "check-task-status" })
      },
      lastRun,
      appVersion: app.version,
      inProgress,
      i18n: {
        no: getPhrases("no", ["site/i18n/phrases"]),
        en: getPhrases("en", ["site/i18n/phrases"])
      }
    })
  };

  const view = resolve("./link-checker.html");
  let body = render(view, model);
  if (app.config.devBrowsersync === "true" && isRunning({ request })) {
    const contribution = getBrowserSyncScript({ request });
    body += contribution;
  }

  return {
    contentType: "text/html",
    body
  };
}
