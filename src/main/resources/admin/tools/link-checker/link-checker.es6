/* eslint-disable no-param-reassign */
import { render } from "/lib/thymeleaf";
import { serviceUrl } from "/lib/xp/portal";
import { getPhrases } from "/lib/xp/i18n";
import { isRunning as isTaskRunning, list as listTasks } from "/lib/xp/task";

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
  // Lets the panel resume showing progress after a page reload
  const runningTask = inProgress
    ? listTasks({
      name: `${app.name}:check-sites`,
      state: "RUNNING"
    })[0]
    : null;
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
      runningTaskId: runningTask ? runningTask.id : null,
      i18n: {
        no: getPhrases("no", ["/i18n/phrases"]),
        en: getPhrases("en", ["/i18n/phrases"])
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
