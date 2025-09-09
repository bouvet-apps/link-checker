import { generateMailReport } from "/lib/utils";
import { send as sendMail } from "/lib/xp/mail";

export function sendSiteEmails(emailMap) {
  const now = new Date().toISOString();
  const date = now.split("T")[0];
  const recipients = Object.keys(emailMap);

  recipients.forEach((recipient) => {
    const senders = Object.keys(emailMap[recipient]);

    senders.forEach((sender) => {
      const sites = [];
      const attachments = [];
      let contentCount = 0;
      let brokenCount = 0;
      emailMap[recipient][sender].forEach((batch) => {
        const report = generateMailReport(batch.nodes);
        sites.push({
          ...batch.site,
          branch: batch.branch,
          repoId: batch.repoId
        });
        contentCount += batch.nodes.length;
        brokenCount += batch.nodes.reduce((acc, node) => {
          // eslint-disable-next-line no-param-reassign
          acc += node.brokenLinks.length; return acc;
        }, 0);
        attachments.push({
          // .xlsx is difficult to build on the backend, but .csv is easy.
          // Excel reads it just fine.
          fileName: `${batch.site._name}__${batch.branch}__${date}.csv`,
          mimeType: "text/csv",
          data: report
        });
      });

      if (brokenCount === 0) return;

      const body = `
        <p>There was found <strong>${brokenCount}</strong> broken links in ${contentCount} content items on the following sites:</p>
        <ul>
          ${sites.map((site) => {
    let text = `${site.displayName} - ${site._path} - ${site.branch}`;
    const contentStudioUrl = getContentStudioUrl(site.repoId);

    if (contentStudioUrl) {
      text = `<a href="${contentStudioUrl}" target="_blank">${text}</a>`;
    }

    return `<li>${text}</li>`;
  }).join("")}
        </ul>
        <br>
        <br>
        <p>See attached report for details.</p>
        <p>You are recieving this email because you are listed as a recipient for broken link alerts on these sites. If this is an error, change the app config for the affected sites.</p>
      `;

      // TODO: Change this to get the emails from the app's site-config
      sendMail({
        from: "omsaggau@gmail.com", // sender,
        to: "omsaggau@gmail.com", // recipient,
        subject: `Enonic XP - Link checker - Report for sites: ${sites.map((site) => site.displayName).join(", ")}`,
        body,
        contentType: "text/html; charset=\"UTF-8\"",
        attachments
      });
    });
  });
}

export function sendOwnerEmails(ownerMap) {
  const now = new Date().toISOString();
  const date = now.split("T")[0];
  const recipients = Object.keys(ownerMap);

  recipients.forEach((recipient) => {
    const senders = Object.keys(ownerMap[recipient]);

    senders.forEach((sender) => {
      const sites = [];
      const attachments = [];
      let contentCount = 0;
      let brokenCount = 0;
      // Each home is a site in a repo on a branch
      const homes = Object.keys(ownerMap[recipient][sender]);

      homes.forEach((home) => {
        const {
          alertSuffix, site, branch, nodes, repoId
        } = ownerMap[recipient][sender][home];
        const report = generateMailReport(nodes);
        const _brokenCount = nodes.reduce((acc, node) => {
          // eslint-disable-next-line no-param-reassign
          acc += node.brokenLinks.length; return acc;
        }, 0);
        sites.push({
          ...site,
          branch,
          repoId,
          alertSuffix,
          contentCount: nodes.length,
          brokenCount: _brokenCount
        });

        contentCount += nodes.length;
        brokenCount += _brokenCount;
        attachments.push({
          // .xlsx is difficult to build on the backend, but .csv is easy.
          // Excel reads it just fine.
          fileName: `${site._name}__${branch}__${date}.csv`,
          mimeType: "text/csv",
          data: report
        });
      });

      if (brokenCount === 0) return;

      const body = `
        <p>A check has found <strong>${brokenCount}</strong> broken links in ${contentCount} content items which you are owner of.</p>
        ${sites.map((site) => `
          <h2>${site.displayName} - ${site._path} - ${site.branch}</h2>
          <p><strong>${site.brokenCount}</strong> broken links in ${site.contentCount} content.</p>
          <p>${site.alertSuffix || ""}</p>
          ${getContentStudioAnchor(site.repoId)}
        `).join("<br>")}
        <br>
        <br>
        <p>See attached report for details.</p>
        <p>You are recieving this email because you are the owner of these content. If this is an error, change the owner of the content in Content Studio.</p>
      `;

      sendMail({
        from: "vadamatsove@gmail.com", // sender,
        to: "vadamatsove@gmail.com", // recipient,
        subject: "Enonic XP - Link checker - Your content has broken links",
        body,
        contentType: "text/html; charset=\"UTF-8\"",
        attachments
      });
    });
  });
}

function getContentStudioUrl(repo) {
  if (!repo) return "";

  const adminUrl = getAdminUrl();
  if (!adminUrl) return "";

  const project = repo.split(".").pop();
  return `${adminUrl}tool/com.enonic.app.contentstudio/main#/${project}/browse`;
}

function getLinkCheckerUrl(url) {
  if (!url) return "";

  const adminUrl = getAdminUrl();
  if (!adminUrl) return "";

  return `${adminUrl}tool/no.bouvet.app.linkchecker/link-checker`;
}

function getAdminUrl() {
  const url = app.config.adminUrl;
  if (!url) return "";

  const parts = url.split("/");
  const indexAdmin = parts.indexOf("admin");
  if (indexAdmin === -1) return "";

  let completeUrl = parts.slice(0, indexAdmin).join("/");
  if (!(url.startsWith("https://") || url.startsWith("http://"))) {
    completeUrl = `https://${completeUrl}`;
  }
  if (completeUrl.slice(-1) !== "/") completeUrl += "/";

  return `${completeUrl}admin/`;
}

function getContentStudioAnchor(repo) {
  const href = getContentStudioUrl(repo);
  if (!href) return "";

  return `<br><a href="${href}" target="_blank">Go to ContentStudio</a><br>`;
}
