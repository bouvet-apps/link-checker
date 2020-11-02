const libs = {
  freemarker: require("/lib/tineikt/freemarker"),
  portal: require("/lib/xp/portal"),
  admin: require("/lib/xp/admin")
};


exports.get = () => {
  const view = resolve("./link-checker.ftl");

  const params = {
    adminUrl: libs.admin.getBaseUri(),
    assetsUrl: libs.portal.assetUrl({
      path: ""
    }),
    launcherPath: libs.admin.getLauncherPath(),
    launcherUrl: libs.admin.getLauncherUrl(),
    appId: "link-checker-admin-tool" // TODO: generere? i site template eller fra toolen?
  };

  log.info("");

  return {
    contentType: "text/html",
    body: libs.freemarker.render(view, params).replace(/img src="images\/(.*)"/g, `img src="${params.assetsUrl}/images/userdoc/$1"`)
  };
}
