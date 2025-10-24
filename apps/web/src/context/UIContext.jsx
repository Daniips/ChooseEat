import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import i18n from "../lib/i18n";

const UiContext = createContext(null);

const THEME_KEY = "ce_theme";
const LANG_KEY  = "ce_lang";

function systemTheme() {
  if (typeof window === "undefined") return "light";
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  return mql.matches ? "dark" : "light";
}

export function UiProvider({ children, persist = false }) {
  // === THEME ===
  const [theme, setTheme] = useState(systemTheme());
  useEffect(() => {
    try {
      if (persist) {
        const saved = localStorage.getItem(THEME_KEY);
        if (saved === "light" || saved === "dark") setTheme(saved);
      }
    } catch {
        // noop
    }
  }, [persist]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", theme);
    }
    try { if (persist) localStorage.setItem(THEME_KEY, theme); } catch {
        // noop
    }
  }, [theme, persist]);

  const toggleTheme = () => setTheme(t => (t === "dark" ? "light" : "dark"));

  // === LANGUAGE ===
  const [lang, setLang] = useState(() => i18n.language || "en");

  useEffect(() => {
    try {
      if (persist) {
        const saved = localStorage.getItem(LANG_KEY);
        if (saved) setLang(saved);
      }
    } catch {
        // noop
    }
  }, [persist]);

  useEffect(() => {
    i18n.changeLanguage(lang);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("lang", lang);
    }
    try { if (persist) localStorage.setItem(LANG_KEY, lang); } catch {
        // noop
    }
  }, [lang, persist]);

  const value = useMemo(() => ({
    theme, setTheme, toggleTheme,
    lang, setLang,
  }), [theme, lang]);

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUi() {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error("useUi must be used within UiProvider");
  return ctx;
}
