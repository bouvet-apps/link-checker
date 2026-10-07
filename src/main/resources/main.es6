// Not using import since we need try catch around everything in main, since it fails silently
try {
  const { isMaster } = require("/lib/xp/cluster");
  const { initRepository } = require("/lib/utils");
  const { get, create, delete: deleteJob } = require("/lib/xp/scheduler");

  if (isMaster()) {
    initRepository();

    const jobKey = "link-checker-task";
    const existingJob = get({ name: jobKey });
    if (existingJob) {
      deleteJob({ name: jobKey });
    }

    if (app.config.scheduleCron) {
      const newJob = create({
        name: jobKey,
        description: "Link Checker Task - Checks all sites with app installed for broken links",
        descriptor: `${app.name}:check-sites`,
        schedule: {
          type: "CRON",
          timeZone: app.config.scheduleTimeZone || "Europe/Oslo",
          value: app.config.scheduleCron
        },
        user: "user:system:su",
        enabled: true
      });

      if (!newJob) {
        log.error("Failed to create Link Checker job");
      } else {
        log.info("Link Checker job created");
      }
    } else {
      log.info("Link Checker job not created, no schedule defined in app config");
    }
  }
} catch (error) {
  log.error("Failed to start Link Checker app properly: ");
  log.error(error);
}
