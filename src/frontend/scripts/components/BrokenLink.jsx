import React, { useState, useEffect, useRef } from "react";
import * as DOMPurify from "dompurify";

import { UpRightFromSquare, ChevronDown, CircleExclamation } from "./Icons";
import PathDescription from "./PathDescription";
import useAccordion from "./useAccordion";
import usei18nContext from "../context/i18nContext";
import useModalContext from "../context/modalContext";

// Add hook to DOMPurify to replace all links with spans. We want to show a "fake" blue link in the preview
DOMPurify.addHook("uponSanitizeElement", (node) => {
  if (node.tagName === "A") {
    const newSpan = document.createElement("span");
    newSpan.style.color = "blue";
    newSpan.innerHTML = node.textContent;
    node.parentNode.replaceChild(newSpan, node);
  }
  return node;
});

const BrokenLink = ({ link, branch }) => {
  const { t } = usei18nContext();
  const { setModalText } = useModalContext();

  const field = link.field || "";
  let surroundingText = false;
  if (link.surroundingText) {
    surroundingText = DOMPurify.sanitize(link.surroundingText.replace(/\\n/g, "\n"), { ALLOWED_TAGS: ["p", "span", "strong", "ul", "li"] });
  }
  const surroundingTextRef = useRef(null);
  const [isClamped, setClamped] = useState(false);

  useEffect(() => {
    // Function that should be called on window resize
    function handleResize() {
      if (surroundingTextRef && surroundingTextRef.current) {
        setClamped(
          surroundingTextRef.current.scrollHeight > surroundingTextRef.current.clientHeight
        );
      }
    }
    handleResize();

    // Add event listener to window resize
    window.addEventListener("resize", handleResize);

    // Remove event listener on cleanup
    return () => window.removeEventListener("resize", handleResize);
  }, [surroundingTextRef.current]);

  const {
    contentWrapperRef, transitionRef, setExpanded, expanded
  } = useAccordion();

  const getInternalWhy = () => {
    const { type, user, time } = link.auditLog;

    let what = "";

    if (type === "system.content.unpublishContent") {
      if (branch === "draft") {
        what = t("why.unpublished-unsure");
      } else {
        what = t("why.unpublished");
      }
    } else if (type === "system.content.delete") {
      what = t("why.deleted");
    } else if (type === "system.content.archive") {
      what = t("why.archived");
    }
    return (
      <div>
        {what}
        {" "}
        <pre className="inline">{new Date(time).toLocaleString(t.locale === "en" ? "en-GB" : "no")}</pre>
        {" "}
        {t("of")}
        {" "}
        {user?.displayName || user}
        {" "}
        {user?.email ? `(${user.email})` : ""}
      </div>
    );
  };

  return (
    <li className="w-full rounded-md overflow-hidden shadow-sm">
      <div className="flex items-center justify-between bg-slate-500 p-2 text-white w-full">
        <div className="flex items-center w-[calc(100%_-_4.5rem)]">
          <span className="text-2xl mr-6 px-2 py-1 bg-slate-700 rounded-md font-bold w-16">{link.status || <CircleExclamation className="w-full h-5 py-1 box-content" fill="white" />}</span>
          {link.internal && (
            <pre className="text-1xl">{link.link}</pre>
          )}
          {!link.internal && (
            <a href={link.link} target="_blank" className="flex items-center w-[80%]" rel="noreferrer">
              <pre className="text-1xl overflow-hidden text-ellipsis ">{link.link}</pre>
              <div className="min-w-4 w-4 h-4 ml-1"><UpRightFromSquare fill="white" /></div>
            </a>
          )}
        </div>
        <button className="w-10 h-10 ml-8" onClick={() => setExpanded((_e) => !_e)}>
          <span className="sr-only">{expanded ? t("close") : t("open")}</span>
          <span className="block w-6 h-6">
            <ChevronDown fill="white" />
          </span>
        </button>
      </div>
      <div ref={transitionRef} className="overflow-hidden transition-all" style={{ height: "0px" }}>
        <div ref={contentWrapperRef} className="p-4 bg-white text-lg">
          {link.error && (
            <div className="text-lg mb-4">
              {t("failed")}
            </div>
          )}
          {!(surroundingText || field.length > 0) && (
            <div>
              <div className="text-2xl font-bold">{t("where")}</div>
              <p>
                {t("where.not-found")}
                {" "}
                {t("where.updated")}
              </p>
              <p>{t("where.try-again")}</p>
            </div>
          )}
          {(surroundingText || field.length > 0) && (
            <div>
              <div className="text-2xl font-bold">{t("where")}</div>
              <div className="mb-4">
                {field.length === 0 && (
                  <span>
                    {" "}
                    {t("where.not-found")}
                  </span>
                )}
                {field.length > 0 && (
                  <div className="flex flex-col items-start">
                    <span>{t("techinal-found")}</span>
                    <pre className="rounded-md block text-lg bg-slate-800 text-white px-2 py-1 max-w-full overflow-scroll">{field.join(".")}</pre>
                    <PathDescription fields={field} />
                  </div>
                )}
              </div>

              {surroundingText && (
                <div className="flex flex-col mt-2">
                  <span>
                    {t("surrounding-text")}
                    {" "}
                    {isClamped ? t("surrounding-text.click") : ""}
                    :
                  </span>
                  <button disabled={!isClamped} onClick={() => setModalText(surroundingText)} className="text-left flex items-center">
                    <span className="sr-only">{t("surrounding-text.show")}</span>
                    <span className="text-blue-900 text-3xl block pr-2 pb-1">«</span>
                    <span className="truncate-2-lines px-2" ref={surroundingTextRef} dangerouslySetInnerHTML={{ __html: surroundingText }} />
                    <span className="text-blue-900 text-3xl block pl-2 pb-1">»</span>
                  </button>
                </div>
              )}
            </div>
          )}
          {link.internal && (
            <div>
              <div className="text-2xl font-bold">{t("why")}</div>
              {link.auditLog && (
                getInternalWhy()
              )}
              {!link.auditLog && <div>{t("why.unknown")}</div>}
            </div>
          )}
        </div>
      </div>
    </li>
  );
};

export default BrokenLink;
