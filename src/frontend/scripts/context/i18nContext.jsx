import { createContext, useContext } from "react";

const i18nContext = createContext();

const localeMap = {
  en: "en",
  "en-US": "en",
  "en-GB": "en",
  no: "no",
  nb: "no",
  nn: "no",
  "nb-NO": "no",
  "nn-NO": "no"
};

/**
 * By doing
 * const { t } = usei18nContext();
 *
 * You can then do t("some.phrase") to get the translation of "some.phrase" in the current locale.
 * Translations are managed in the /code/src/main/resources/site/i18n/.
 */

const usei18nContext = () => {
  const { en, no } = useContext(i18nContext);

  const locale = localeMap[window.navigator.language] || "en";

  const t = (key, replace) => {
    let text = en[key] || key;
    if (locale === "no" && no[key]) {
      text = no[key];
    }

    if (replace) text = text.replace("{0}", replace);

    return text;
  };
  t.locale = locale;

  return {
    t
  };
};

export default usei18nContext;

export {
  i18nContext
};
