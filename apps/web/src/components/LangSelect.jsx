import React, { useState, useRef, useEffect } from "react";
import { useUi } from "../context/UIContext";
import { useTranslation } from "react-i18next";

const LANGS = [
  { code: "es", label: "Español", short: "ES" },
  { code: "en", label: "English", short: "EN" },
  { code: "cat", label: "Català", short: "CAT" },
];


/*COLLECTION: Iconoir Icons
  LICENSE: MIT License
  AUTHOR: iconoir
  SOURCE: https://svgrepo.com
*/
export default function LangSelect() {
  const { lang, setLang } = useUi();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const currentLang =
    LANGS.find((l) => l.code === lang) || LANGS[0];

  useEffect(() => {
    function handleClickOutside(e) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (code) => {
    setLang(code);
    setOpen(false);
  };

  return (
    <div className="lang-select-wrapper" ref={wrapperRef}>
      <button
        type="button"
        className="lang-select lang-select-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("language")}
        title={t("language")}
      >
        <span className="lang-select-icon" aria-hidden="true">
          <span className="lang-select-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </span>
        </span>
        <span className="lang-select-code">
          {currentLang.short}
        </span>
      </button>

      {open && (
        <ul
          className="lang-select-menu"
          role="listbox"
          aria-label={t("language")}
        >
          {LANGS.map((l) => (
            <li key={l.code}>
              <button
                type="button"
                className={
                  "lang-select-option" +
                  (l.code === lang ? " is-active" : "")
                }
                role="option"
                aria-selected={l.code === lang}
                onClick={() => handleSelect(l.code)}
              >
                <span className="lang-option-label">{l.label}</span>
                <span className="lang-option-short">{l.short}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
