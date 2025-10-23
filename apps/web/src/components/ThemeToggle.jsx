import React, { useEffect, useState } from "react";

const THEME_KEY = "ce_theme";

function applyTheme(next) {
  const root = document.documentElement;
  const value = next === "dark" ? "dark" : "light";
  root.setAttribute("data-theme", value);
  localStorage.setItem(THEME_KEY, value);
}

export default function ThemeToggle() {
  const [mode, setMode] = useState("light");

  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") {
      setMode(saved);
      applyTheme(saved);
    } else {
      const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
      const initial = prefersDark ? "dark" : "light";
      setMode(initial);
      applyTheme(initial);
    }
  }, []);

  function toggle() {
    const next = mode === "dark" ? "light" : "dark";
    setMode(next);
    applyTheme(next);
  }

  const isDark = mode === "dark";
  const nextLabel = isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro";

  return (
    <button
      type="button"
      className={`theme-switch ${isDark ? "is-dark" : "is-light"}`}
      onClick={toggle}
      aria-label={nextLabel}
      title={nextLabel}
      role="switch"
      aria-checked={isDark}
    >
      <span className="theme-switch__track" aria-hidden="true">
        <span className="theme-switch__icon theme-switch__icon--moon">☀️</span>
        <span className="theme-switch__icon theme-switch__icon--sun">🌙</span>
        <span className="theme-switch__thumb" />
      </span>
      <span className="sr-only">{nextLabel}</span>
    </button>
  );
}
