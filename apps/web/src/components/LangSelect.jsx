import React from "react";
import { useUi } from "../context/UIContext";
import { useTranslation } from "react-i18next";

const LANGS = [
  { code: "es", label: "Español" },
  { code: "en", label: "English" },
  //
];

export default function LangSelect() {
    const { lang, setLang } = useUi();
      const { t } = useTranslation();
    return (
    <select
      className="lang-select"
      value={lang}
      onChange={(e) => setLang(e.target.value)}
      aria-label={t("language")}
      title={t("language")}
    >
      {LANGS.map(l => (
        <option key={l.code} value={l.code}>{l.label}</option>
      ))}
    </select>
  );
}
