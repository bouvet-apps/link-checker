import React from "react";
import usei18nContext from "../context/i18nContext";

const Spinner = () => {
  const { t } = usei18nContext();
  return (
    <div role="status" className="mx-auto">
      <div className="border-gray-300 h-20 w-20 animate-spin rounded-full border-8 border-t-blue-900" />
      <span className="sr-only">{t("loading")}</span>
    </div>
  );
};

export default Spinner;
