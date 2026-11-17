/* eslint-disable no-param-reassign */
import { render } from "/lib/thymeleaf";
import { serviceUrl } from "/lib/xp/portal";
import { getPhrases } from "/lib/xp/i18n";
import { list as listTasks } from "/lib/xp/task";

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

  const runningTask = listTasks({ name: `${app.name}:check-sites` })
    .filter((task) => task.state === "RUNNING" || task.state === "WAITING")[0];
  const inProgress = Boolean(runningTask);
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
