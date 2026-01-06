// src/context/UIContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import i18n from "../lib/i18n";
import { applyTheme, resolveTheme, watchSystemTheme } from "../lib/theme";

const UiContext = createContext(null);

const THEME_KEY = "ce_theme";
const LANG_KEY  = "ce_lang";

function lsGet(key) {
  try { return localStorage.getItem(key); } catch (e) {
    console.error(`localStorage get ${key} failed:`, e); return null;
  }
}
function lsSet(key, value) {
  try { localStorage.setItem(key, value); return true; } catch (e) {
    console.error(`localStorage set ${key} failed:`, e); return false;
  }
}

export function UiProvider({ children, persist = false }) {
  // ===== THEME =====
  const [theme, setTheme] = useState(() => {
    const saved = persist ? lsGet(THEME_KEY) : null;
    return (saved === "light" || saved === "dark" || saved === "system") ? saved : "system";
  });

  useEffect(() => {
    try { applyTheme(theme); } catch (e) { console.error("applyTheme failed:", e); }
    if (persist) lsSet(THEME_KEY, theme);
  }, [theme, persist]);

  useEffect(() => {
    if (theme !== "system") return;
    const stop = watchSystemTheme(() => {
      try { applyTheme("system"); } catch (e) { console.error("re-apply system theme failed:", e); }
    });
    return stop;
  }, [theme]);

  const toggleTheme = () =>
    setTheme(t => (resolveTheme(t) === "dark" ? "light" : "dark"));

  // ===== LANGUAGE =====
  const [lang, setLang] = useState(() => i18n.language || "es");

  useEffect(() => {
    const handleLanguageChanged = (lng) => {
      setLang(lng);
    };
    i18n.on('languageChanged', handleLanguageChanged);
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, []);

  useEffect(() => {
    try { i18n.changeLanguage(lang); } catch (e) {
      console.error("i18n.changeLanguage failed:", e);
    }
    try {
      if (typeof document !== "undefined") {
        document.documentElement.setAttribute("lang", lang);
      }
      if (persist) lsSet(LANG_KEY, lang);
    } catch (e) {
      console.error("apply lang failed:", e);
    }
  }, [lang, persist]);

  const value = useMemo(() => ({
    theme, effectiveTheme: resolveTheme(theme),
    setTheme, toggleTheme,
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
