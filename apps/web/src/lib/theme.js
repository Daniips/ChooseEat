// src/lib/theme.js
const STORAGE_KEY = "ce_theme";

export function getStoredTheme() {
  try { return localStorage.getItem(STORAGE_KEY) || "system"; }
  catch { return "system"; }
}

export function applyTheme(theme) {
  const root = document.documentElement;
  let resolved = theme;
  if (theme === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    resolved = prefersDark ? "dark" : "light";
  }
  root.setAttribute("data-theme", resolved);
  try { localStorage.setItem(STORAGE_KEY, theme); } catch {
    // noop
  }
}

export function initTheme() {
  const saved = getStoredTheme();
  applyTheme(saved);

  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => {
    if (getStoredTheme() === "system") applyTheme("system");
  };
  mq.addEventListener?.("change", handler);
  return () => mq.removeEventListener?.("change", handler);
}
