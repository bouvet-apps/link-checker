import React, { useState } from "react";
import cn from "classnames";

import BrokenLink from "./BrokenLink";
import { ChevronDown } from "./Icons";
import useAccordion from "./useAccordion";
import Content, { Site } from "./Content";
import usei18nContext from "../context/i18nContext";

const ContentResult = ({ result, api, onRefresh }) => {
  const { t } = usei18nContext();

  const content = result.content;
  const {
    contentWrapperRef, transitionRef, setExpanded, expanded
  } = useAccordion();

  const [isChecking, setIsChecking] = useState(false);

  const recheckNode = async () => {
    setIsChecking(true);

    const path = `/${content._path.split("/").slice(2).join("/")}`;

    const res = await fetch(api.trigger, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        repo: result.repo,
        branch: result.branch,
        site: result.site,
        nodePath: path
      })
    });
    const status = res.status;
    if (status === 409) {
      alert("Check already running");
    } else if (status !== 200) {
      alert("Failed to start task");
    }

    onRefresh();

    setIsChecking(false);
  };

  const renderOwner = () => {
    let text;
    if (!result.owner?.displayName) {
      text = (
        <span>
          Owner:
          {" "}
          <pre className="inline">{result.owner}</pre>
        </span>
      );
    } else {
      text = (
        <span>
          Owner:
          {" "}
          {result.owner.displayName}
          {" "}
          {result.owner.email ? `(${result.owner.email})` : ""}
        </span>
      );
    }

    return (
      <div>
        {text}
      </div>
    );
  };

  return (
    <section className="overflow-hidden rounded-md shadow-sm border border-gray-100">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center">
          <Site site={result.site} repo={result.repo} />
          <span className="ml-2 mr-12 text-lg text-gray-300">/</span>
          <Content content={content} repo={result.repo} />
          {(content.originProject) && (
            <div className="ml-4 text-xs text-gray-500">
              <span className="font-bold">{t("layer-of")}</span>
              {" "}
              {content.originProject}
            </div>
          )}
        </div>
        <div className="flex items-center">
          <div className="text-xl text-red-500 font-bold">
            {result.brokenLinks.length}
          </div>
          <button className="w-10 h-10 ml-8" onClick={() => setExpanded((_e) => !_e)}>
            <span className="sr-only">{expanded ? t("close") : t("open")}</span>
            <span className="block w-6 h-6">
              <ChevronDown />
            </span>
          </button>
        </div>
      </div>

      <div ref={transitionRef} className="overflow-hidden transition-all" style={{ height: "0px" }}>
        <div ref={contentWrapperRef} className="p-4 pt-2 bg-gray-100">
          <div className="mb-4 flex justify-between text-gray-500 text-sm">
            {renderOwner()}
            <div>
              {t("last-updated")}
              {" "}
              {new Date(result.lastModified).toLocaleString(t.locale === "en" ? "en-GB" : "no")}
            </div>
          </div>
          <ul className="flex flex-col gap-4">
            {result.brokenLinks.map((link, i) => (
              <BrokenLink
                key={result.site.id + link.link + i}
                link={link}
                content={content}
                branch={result.branch}
              />
            ))}
          </ul>
          <div>
            <button
              className={cn("mt-4 bg-slate-600 px-4 py-2 rounded-md hover:bg-slate-500 transition-all shadow-sm block ml-auto text-white", {
                "opacity-50 cursor-not-allowed": isChecking
              })}
              onClick={recheckNode}
              disabled={isChecking}
            >
              {isChecking ? "Checking..." : "Recheck now"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContentResult;
