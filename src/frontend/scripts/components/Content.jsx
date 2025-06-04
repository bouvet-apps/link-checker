import React from "react";
import { UpRightFromSquare } from "./Icons";

function getAdminPrefix() {
  const pathName = window.location.pathname;
  const prefix = pathName.slice(0, pathName.indexOf("/admin/tool/"));
  return prefix;
}

const Content = ({ content, repo }) => {
  const path = content._path.split("/").slice(3).join("/");
  const project = repo.split(".").pop();
  // PREFIX/admin/tool/com.enonic.app.contentstudio/main/PROJECT/edit/ID
  const contentStudioUrl = `${getAdminPrefix()}/admin/tool/com.enonic.app.contentstudio/main/${project}/edit/${content._id}`;

  return (
    <a href={contentStudioUrl} target="_blank" className="flex items-center group" title="Edit in Content Studio" rel="noreferrer">
      <img className="w-8 h-8 mr-4" src={`${getAdminPrefix()}/admin/rest-v2/cs/schema/content/icon/${content.type}`} alt="" />
      <div className="">
        <div className="text-sm">{content.displayName}</div>
        <div className="text-xs text-gray-500">{path}</div>
      </div>
      <div className="ml-4 w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <UpRightFromSquare />
      </div>
    </a>
  );
};

export const Site = ({
  site, repo = "", highlight, className = ""
}) => {
  const {
    displayName, name, id, icon
  } = site;
  const project = repo.split(".").pop();

  const iconSrc = `${getAdminPrefix()}/admin/rest-v2/cs/cms/${project}/content/content/icon/${id}`;
  const fallbackSrc = `${getAdminPrefix()}/admin/rest-v2/cs/schema/content/icon/portal:site`;
  return (
    <div className={`flex items-center w-[180px] min-w-[180px] ${highlight ? "bg-[#4294de] text-white" : ""} ${className}`}>
      <img
        className="w-8 h-8 mr-4"
        src={icon ? iconSrc : fallbackSrc}
        onError={({ currentTarget }) => {
          currentTarget.onerror = null;
          currentTarget.src = fallbackSrc;
        }}
        alt=""
      />
      <div className="">
        <div className="text-sm">{displayName}</div>
        <div className={`text-xs ${highlight ? "text-white" : "text-gray-500"}`}>{name}</div>
      </div>
    </div>
  );
};

export default Content;
