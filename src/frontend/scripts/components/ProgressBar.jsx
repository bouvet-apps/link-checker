import React from "react";
import usei18nContext from "../context/i18nContext";

const ProgressBar = ({
  current, total, info, styles
}) => {
  const { t } = usei18nContext();
  const percentage = total > 0 ? Math.min((current / total) * 100, 100) : 0;

  return (
    <div className={`${!total && "hidden"} h-5 flex items-center gap-4 w-full ${styles}`}>
      <span className="opacity-60 text-xs">{percentage === 100 ? t("finished") : info}</span>
      <div className="max-w-72 w-full bg-[#eee] rounded-lg overflow-hidden">
        <div
          className={`${total ? "bg-[#4caf50]" : ""} h-5 transition-all duration-300 ease-in-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
