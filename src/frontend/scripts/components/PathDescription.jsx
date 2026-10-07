import React from "react";
import useAccordion from "./useAccordion";
import usei18nContext from "../context/i18nContext";

function renderDesc(fields) {
  return (
    <table>
      <tbody>
        {fields.map(([field, desc], i) => (
          <tr key={field + i}>
            <td>
              <div className="max-w-44 overflow-scroll">
                <pre className="inline-block mr-2 pb-3 text-slate-800">{field}</pre>
              </div>
            </td>
            <td><span className="block pl-2 pb-3">{desc}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function parseXData(fields, t) {
  const [x, appId, ...path] = fields;

  return renderDesc([
    [x, t("path.x")],
    [appId, t("path.x.appId")],
    [[].concat(path).join("."), t("path.x.path")]
  ]);
}

function parseData(fields, t) {
  const [data, ...path] = fields;

  return renderDesc([
    [data, t("path.data")],
    [[].concat(path).join("."), t("path.data.path")]
  ]);
}

function parseComponents(fields, t) {
  const [components, index, type, _, appId, componentId, ...path] = fields;

  let suffix = ".";
  const indexNumber = +index;

  if (t.locale !== "no") {
    suffix = "th";
    const lastDigit = indexNumber % 10;
    const isTeen = indexNumber % 100 >= 11 && indexNumber % 100 <= 13;
    if (!isTeen && lastDigit === 1) suffix = "st";
    if (!isTeen && lastDigit === 2) suffix = "nd";
    if (!isTeen && lastDigit === 3) suffix = "rd";
  }

  const d = [
    [components, t("path.components")],
    [index, t("path.components.index", indexNumber + suffix)],
    [type, t("path.components.type")],
    [_, ""],
    [appId, t("path.components.appId", type)],
    [componentId, t("path.components.componentId", type)],
    [[].concat(path).join("."), t("path.components.path", type)]
  ];

  return renderDesc(d);
}

function parsePage(fields, t) {
  if (fields[2] === "template") {
    const [components, page, template] = fields;
    return renderDesc([
      [components, t("path.page.components")],
      [page, t("path.page")],
      [template, t("path.page.template")]
    ]);
  }
  const [components, page, _, appId, pageName, ...path] = fields;

  return renderDesc([
    [components, t("path.page.components")],
    [page, t("path.page")],
    [_, ""],
    [appId, t("path.page.appId")],
    [pageName, t("path.page.pageId")],
    [[].concat(path).join("."), t("path.page.path")]
  ]);
}

const PathDescription = ({ fields }) => {
  const { t } = usei18nContext();
  const {
    contentWrapperRef, transitionRef, expanded, setExpanded
  } = useAccordion();
  return (
    <div className="mt-2 w-full bg-gray-100 rounded-md shadow-sm">
      <button className="w-full text-left p-4" onClick={() => setExpanded((_e) => !_e)}>
        {expanded ? t("hide-detailed") : t("show-detailed")}
      </button>
      <div ref={transitionRef} className="overflow-hidden transition-all" style={{ height: "0px" }}>
        <div ref={contentWrapperRef} className="p-4 border-t border-t-slate-200">
          {fields[0] === "x" && parseXData(fields, t)}
          {fields[0] === "data" && parseData(fields, t)}
          {fields[0] === "components" && Number.isInteger(+fields[1]) && parseComponents(fields, t)}
          {fields[0] === "components" && fields[1] === "page" && parsePage(fields, t)}
        </div>
      </div>
    </div>
  );
};

export default PathDescription;
