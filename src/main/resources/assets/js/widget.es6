
/*
  Each function needs to select HTML content anew,
  in case the html has been rerended by switching content in content studio.
*/
function getElements(selectors) {
  var elements = {};
  selectors.forEach(function(selector) {
    elements[selector] = document.querySelector(selector);
  });
  return elements;
}


function createReport (message) {
  window.downloadCSV = function () {
    generateSpreadsheet(message.results);
  }
  const result = document.getElementById("link-checker__result");
  let report = "";
  if (message.brokenCount > 8) {
    report = generateShortReport(message);
  } else if (message.brokenCount > 0) {
    report = generateLongReport(message);
  }
  else {
    report = '<div class="widget-view internal-widget success"><h5 class="success-text">&#10004; No broken links found!</h5></div>';
  }
  result.innerHTML = report;
}

function generateSpreadsheet(results) {
  const ws = XLSX.utils.json_to_sheet([],
    {header: ["displayName", "path", "broken link", "status"], skipHeader: false});
  /* Write data starting at A2 */
  results.forEach(function(result, index) {
    const links = result.brokenLinks.map(function(link) {
      return {C: link.link, D: link.status};
    });
    const data = [{ A: result.displayName, B: result.path, C: links[0].C, D: links[0].D }].concat(links.slice(1));
    XLSX.utils.sheet_add_json(ws, data, {skipHeader: true, origin: index === 0 ? "A2": -1});
  })

  const date = new Date();
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "WorksheetName");
  XLSX.writeFile(wb, `report-linkchecker-${date.toLocaleDateString()}-${date.toLocaleTimeString()}.xlsx`, {});
}

function generateLongReport(message) {
  let report = "";
  document.getElementById("btn-download").style.display = "initial";
  message.results.forEach(node => {
    report += `<div class="widget-view internal-widget">
                <div class="widget-item-view properties-widget-item-view">
                  <div class="broken-links-error">
                    <h3>Found ${node.brokenLinks.length} invalid link${(node.brokenLinks.length > 1 ? 's':'')}</h3>
                    <div class="broken-links-error__body">
                      <h4>${node.displayName}</h4>
                      <p>${node.path}</p>`;
          node.brokenLinks.forEach(link => {
            report += `<div class="broken-links-error__link">
                        <div style="margin-right: 5px;">&#10007;</div>
                        <div class="broken-links-error__link__target">
                          <a href="${link.link}" target="_blank">${link.link}</a>
                        </div>
                        <span style="margin-left: 5px">${(link.status == 408 ? 'Timeout' : link.status)}</span>
                      </div>`;
          });
          report += `</div>
                  </div>
                </div>
              </div>`;
  });
  return report;
}

// If many links are found, generate a shorter report and promote download of spreadsheet

const MAX_BROKEN_SHOWN = 8;

function generateShortReport(message) {
  var report = "";
  document.getElementById("btn-download").style.display = "initial";
  report += `<div class="widget-view internal-widget">
              <div class="widget-item-view properties-widget-item-view">
                <div class="broken-links-error">
                  <h3>Found ${message.brokenCount} invalid link ${(message.brokenCount > 1 ? 's':'')}</h3>
                  <div class="broken-links-error__body">`;
  
  let countShown = 0;
  for (let i = 0; i < message.results.length; i++) {
    for (let j = 0; j < message.results[i].brokenLinks.length; j++) {

      if (countShown > MAX_BROKEN_SHOWN) break;

      const link = message.results[i].brokenLinks[j];
      report += `<div class="broken-links-error__body__status">
                  <div style="margin-right: 5px;">&#10007;</div>
                  <div style="flex-grow:1;">
                    <a href="${link.link}" target="_blank">${link.link}</a>
                  </div>
                  <span style="margin-left: 5px">${(link.status == 408 ? 'Timeout' : link.status)}</span>
                </div>`;
      countShown++;
    }
    if (countShown >= MAX_BROKEN_SHOWN) break;
  }
      report += `<p class="download-more">...</p>
                <p class="download-more">Detailed in spreadsheet</p>
                </div>
              </div>
            </div>
          </div>`;
  return report;
}

function updateProgress(message) {
  const key = document.querySelector("#contentId");
  if (key && (key.value == message.key)) {
    const elements = getElements([".link-checker__progress", ".link-checker__status",
      ".progress-indicator__counter", "#btn-stop", "#btn-start", ".selection-radios"]);

    elements[".link-checker__progress"].style.display = "block";

    const count = message.index;
    let total = message.total;

    if (message.brokenCount) {
      elements[".link-checker__status"].innerHTML = `Found <span class="broken-count">${message.brokenCount}</span> broken links`;
    }

    const selection = document.querySelector('input[name="selection"]:checked').value;
    if (selection == "both" || selection == "content") {
      total++;
    }
    elements[".progress-indicator__counter"].innerHTML = `${count} / ${total}`;
    const percent = parseInt(count / total * 100);
    updateIndicator(percent);
    elements["#btn-start"].style.display = "none";
    elements[".selection-radios"].style.display = "none";
    elements["#btn-stop"].style.display = "inline-block";
  }
}

function updateIndicator(percent) {
  const circle = document.querySelector("#progress-indicator__bar");
  const circumference = 339.29;
  const offset = ((100-percent)/100)*circumference;
  circle.style["stroke-dashoffset"] = offset;
}

function setResult(message) {
  const key = document.querySelector("#contentId");
  if (key && (key.value == message.key)) {
    updateIndicator(100);
    setTimeout(function() {
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
}

function setError(message) {
  const result = document.getElementById("link-checker__result");
  result.innerHTML = `<div class="widget-view internal-widget">
                        <div class="widget-item-view properties-widget-item-view version-widget-item-view">
                          <div class="broken-links-error">
                            <h3 style="text-align: center">${message.error}</h3>
                          </div>
                        </div>
                      </div>`;
}


function startCheck() {
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

  const selection = document.querySelector('input[name="selection"]:checked').value;
  const url = `${form.action}&selection=${selection}`;
  const ws = new WebSocket(url);
  ws.onopen = event => {
    /*
      Need to attach function to window object to make it last between rendering of widget window.
      Clicking on new content in content studio will rerender the HTML and run the JS again
    */
    window.stopCheck = () => {
      ws.send("STOP");
    }
  }
  ws.onmessage = event => {
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
  }
  ws.onerror = event => {
    console.error("ERROR in LinkChecker websocket")
  }
};