// src/lib/theme.js

export function resolveTheme(theme) {
  if (theme === "system") {
    try {
      return (typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-color-scheme: dark)")?.matches)
        ? "dark"
        : "light";
    } catch {
      return "light";
    }
  }
  return theme === "dark" ? "dark" : "light";
}

export function applyTheme(theme) {
  const root = typeof document !== "undefined" ? document.documentElement : null;
  if (!root) return false;
  const resolved = resolveTheme(theme);
  root.setAttribute("data-theme", resolved);
  return true;
}

export function watchSystemTheme(onChange) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => onChange?.(mql.matches ? "dark" : "light");
  try {
    mql.addEventListener?.("change", handler) || mql.addListener?.(handler);
  } catch { /* noop */ }
  return () => {
    try {
      mql.removeEventListener?.("change", handler) || mql.removeListener?.(handler);
    } catch { /* noop */ }
  };
}
