
/*
  Each function needs to select HTML content anew,
  in case the html has been rerended by e.g. switching content in content studio.
*/
const getElements = (selectors) => {
  const elements = {};
  selectors.forEach((selector) => {
    elements[selector] = document.querySelector(selector);
  });
  return elements;
};

const mapStatus = (status) => {
  switch (status) {
    case 0:
      return "Needs manuel review";
    case 408:
      return "Timeout";
    default:
      return status;
  }
};

const generateSpreadsheet = (results) => {
  const ws = XLSX.utils.json_to_sheet([],
    { header: ["displayName", "path", "type", "broken link", "status"], skipHeader: false });
  /* Write data starting at A2 */
  results.forEach((result, index) => {
    const links = result.brokenLinks.map(link => ({ C: link.type, D: link.link, E: mapStatus(link.status) }));
    const data = [{
      A: result.displayName, B: result.path, C: links[0].C, D: links[0].D, E: links[0].E
    }].concat(links.slice(1));
    XLSX.utils.sheet_add_json(ws, data, { skipHeader: true, origin: index === 0 ? "A2" : -1 });
  });

  const date = new Date();
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "WorksheetName");
  XLSX.writeFile(wb, `report-linkchecker-${date.toLocaleDateString()}-${date.toLocaleTimeString()}.xlsx`, {});
};

const renderLink = link => `
<div class="broken-links-error__link">
  <div class="broken-links-error__link__body">
    <div style="margin-right: 5px;">${link.type}</div>
    <span style="margin-left: 5px">${mapStatus(link.status)}</span>
  </div>
  <div class="broken-links-error__link__target">
    <a href="${link.link}" target="_blank">${link.link}</a>
  </div>
</div>
`;

const generateLongReport = (message) => {
  let report = "";
  document.getElementById("btn-download").style.display = "initial";
  message.results.forEach((node) => {
    report += `<div class="widget-view active internal-widget">
                <div class="widget-item-view properties-widget-item-view">
                  <div class="broken-links-error">
                    <h3>Found ${node.brokenLinks.length} invalid link${(node.brokenLinks.length > 1 ? "s" : "")}</h3>
                    <div class="broken-links-error__body">
                      <h4>${node.displayName}</h4>
                      <p>${node.path}</p>`;
    node.brokenLinks.forEach((link) => {
      report += renderLink(link);
    });
    report += `</div>
                  </div>
                </div>
              </div>`;
  });
  return report;
};

// If many links are found, generate a shorter report and promote download of spreadsheet
const MAX_BROKEN_SHOWN = 8;

const generateShortReport = (message) => {
  let report = "";
  document.getElementById("btn-download").style.display = "initial";
  report += `<div class="widget-view active internal-widget">
              <div class="widget-item-view properties-widget-item-view">
                <div class="broken-links-error">
                  <h3>Found ${message.brokenCount} invalid link${(message.brokenCount > 1 ? "s" : "")}</h3>
                  <div class="broken-links-error__body">`;

  let countShown = 0;

  message.results.some((result) => {
    result.brokenLinks.some((link) => {
      if (countShown > MAX_BROKEN_SHOWN) return true;
      report += renderLink(link);
      countShown++;
      return false;
    });
    return countShown >= MAX_BROKEN_SHOWN;
  });

  report += `<p class="download-more">...</p>
                <p class="download-more">More details in report</p>
                </div>
              </div>
            </div>
          </div>`;
  return report;
};

const generateTipsSection = () => `
  <div class="widget-view active internal-widget link-checker__tips">
    <div class="widget-item-view properties-widget-item-view">
      <h3>Tips and information</h3>
      <div class="link-checker__tips__body">
        <ul>
          <li>Only the <em>draft</em> branch is checked, which means the latest updated version of the content (which may or may not be the published version).</li>
          <li>
            <p>
              <em>Internal content</em> links referes to connections to other content in Enonic XP. The text which looks something like <span class="pre">1397f305-c7ef-43e6-a563-4980883b6396</span> is the unique ID of the targeted content.
            </p>
            <p>
              The most common cause for these errors are:
              <ul>
                <li>The targeted content has been deleted.</li>
                <li>This content was imported from another site or server, but the targeted content was not.</li>
              </ul>
            </p>
          </li>
          <li>If an <em>Internal content</em> link begins with <span class="pre">content://</span>, <span class="pre">media://</span> or <span class="pre">image://</span>; it means the link was found in a rich text field.</li>
        </ul>
      </div>
    </div>
  </div>
`;

const createReport = (message) => {
  window.downloadCSV = () => {
    generateSpreadsheet(message.results);
  };

  const result = document.getElementById("link-checker__result");
  let report = "";
  if (message.brokenCount > 8) {
    report = generateShortReport(message);
  } else if (message.brokenCount > 0) {
    report = generateLongReport(message);
  } else {
    report = "<div class=\"widget-view internal-widget success active\"><h5 class=\"success-text\">&#10004; No broken links found!</h5></div>";
  }

  if (message.brokenCount > 0) {
    report += generateTipsSection();
  }
  result.innerHTML = report;
};

const updateIndicator = (percent) => {
  const circle = document.querySelector("#progress-indicator__bar");
  const circumference = 339.29;
  const current = parseInt(circle.style["stroke-dashoffset"]);

  const offset = ((100 - percent) / 100) * circumference;
  circle.style["stroke-dashoffset"] = offset;

  const difference = Math.min(offset - current, -5);
  const circleNext = document.querySelector("#progress-indicator__next");
  circleNext.style["stroke-dashoffset"] = offset + difference;
};

const updateProgress = (message) => {
  const key = document.querySelector("#contentId");
  if (key && (key.value === message.key)) {
    const elements = getElements([".link-checker__progress", ".link-checker__status",
      ".progress-indicator__counter", "#btn-stop", "#btn-start", ".selection-radios"]);

    elements[".link-checker__progress"].style.display = "block";

    const count = message.index;
    let total = message.total;

    if (message.brokenCount) {
      elements[".link-checker__status"].innerHTML = `Found <span class="broken-count">${message.brokenCount}</span> broken links`;
    }

    const selection = document.querySelector("input[name=\"selection\"]:checked").value;
    if (selection === "both" || selection === "content") {
      total++;
    }
    elements[".progress-indicator__counter"].innerHTML = `${count} / ${total}`;
    const percent = parseInt(count / total * 100);
    updateIndicator(percent);
    elements["#btn-start"].style.display = "none";
    elements[".selection-radios"].style.display = "none";
    elements["#btn-stop"].style.display = "inline-block";
  }
};


const setResult = (message) => {
  const key = document.querySelector("#contentId");
  if (key && (key.value === message.key)) {
    updateIndicator(100);
    setTimeout(() => {
      const elements = getElements([".link-checker__progress", ".link-checker__status",
        "#btn-stop", "#btn-start", ".progress-indicator__wrapper", ".selection-radios"]);

      elements[".link-checker__progress"].style.display = "none";
      elements["#btn-start"].style.display = "inline-block";
      elements[".selection-radios"].style.display = "inline-block";
      elements["#btn-stop"].style.display = "none";
      elements[".progress-indicator__wrapper"].style.display = "none";
      elements[".link-checker__status"].innerHTML = "Loading...";
      createReport(message);
    }, 400);
  }
};

const setError = (message) => {
  const result = document.getElementById("link-checker__result");
  result.innerHTML = `<div class="widget-view active internal-widget">
                        <div class="widget-item-view properties-widget-item-view version-widget-item-view">
                          <div class="broken-links-error">
                            <h3 style="text-align: center">${message.error}</h3>
                          </div>
                        </div>
                      </div>`;
};


// Triggered by onclick
// eslint-disable-next-line no-unused-vars
const startCheck = () => {
  const form = document.getElementById("link-checker__form");
  const elements = getElements([".link-checker__progress", ".link-checker__status",
    ".progress-indicator__wrapper", "#btn-stop", "#btn-start", "#btn-download", ".selection-radios", "#checkChildren"]);

  elements[".progress-indicator__wrapper"].style = "display: inline";
  elements["#btn-start"].style.display = "none";
  elements["#btn-download"].style.display = "none";
  elements[".selection-radios"].style.display = "none";
  elements["#btn-stop"].style.display = "inline-block";
  updateIndicator(0);
  elements[".link-checker__progress"].style.display = "inline";

  const selection = document.querySelector("input[name=\"selection\"]:checked").value;
  const url = `${form.action}&selection=${selection}`;
  const ws = new window.WebSocket(url);
  ws.onopen = () => {
    /*
      Need to attach function to window object to make it last between rendering of widget window.
      Clicking on new content in content studio will rerender the HTML and run the JS again
    */
    window.stopCheck = () => {
      ws.send("STOP");
    };
  };
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if ("index" in message) {
      updateProgress(message);
      if (message.index <= message.total) {
        ws.send(`NEXT:${message.index}`);
      }
    } else if ("results" in message) {
      ws.close();
      setResult(message);
    } else if ("mainContent" in message) {
      updateProgress({ total: message.total, index: 0, key: message.key });
    } else if ("error" in message) {
      setError(message);
    }
  };
  ws.onerror = () => {
    console.error("ERROR in LinkChecker websocket");
  };
};
