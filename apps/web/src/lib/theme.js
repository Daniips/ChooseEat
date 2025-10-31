// src/lib/theme.js

const IS_DEV =
  typeof import.meta !== "undefined" &&
  import.meta.env &&
  !!import.meta.env.DEV;

export function resolveTheme(theme) {
  if (theme === "system") {
    try {
      const isDark =
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      return isDark ? "dark" : "light";
    } catch {
      return "light";
    }
  }
  return theme === "dark" ? "dark" : "light";
}

export function applyTheme(theme) {
  const root =
    typeof document !== "undefined" ? document.documentElement : null;
  if (!root) return false;
  const resolved = resolveTheme(theme);
  root.setAttribute("data-theme", resolved);
  return true;
}

export function watchSystemTheme(onChange) {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return () => {};
  }

  const mql = window.matchMedia("(prefers-color-scheme: dark)");

  const handler = () => {
    const mode = mql.matches ? "dark" : "light";
    try {
      onChange?.(mode);
    } catch (err) {
      if (IS_DEV) {
        console.error("[watchSystemTheme] onChange error:", err);
      }
    }
  };

  const hasAddEvt = typeof mql.addEventListener === "function";
  const hasRemEvt = typeof mql.removeEventListener === "function";
  const hasAddLegacy = typeof mql.addListener === "function";
  const hasRemLegacy = typeof mql.removeListener === "function";

  let subscribed = false;

  try {
    if (hasAddEvt) {
      mql.addEventListener("change", handler, { passive: true });
      subscribed = true;
    } else if (hasAddLegacy) {
      mql.addListener(handler);
      subscribed = true;
    } else if (IS_DEV) {
      console.warn(
        "[watchSystemTheme] matchMedia listener API not available."
      );
    }
  } catch (err) {
    if (IS_DEV) {
      console.warn(
        "[watchSystemTheme] Failed to subscribe to matchMedia:",
        err
      );
    }
  }
  handler();

  let cleaned = false;
  return () => {
    if (cleaned || !subscribed) return;
    try {
      if (hasRemEvt) {
        mql.removeEventListener("change", handler, { passive: true });
      } else if (hasRemLegacy) {
        mql.removeListener(handler);
      }
    } catch (err) {
      if (IS_DEV) {
        console.warn(
          "[watchSystemTheme] Failed to remove matchMedia listener:",
          err
        );
      }
    } finally {
      cleaned = true;
    }
  };
}
