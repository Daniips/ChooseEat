import React from "react";
import { useUi } from "../context/UIContext";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useUi();
  const isDark = theme === "dark";
  const label = isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro";

  return (
    <button
      className={`theme-switch ${isDark ? "is-dark" : "is-light"}`}
      onClick={toggleTheme}
      aria-label={label}
      title={label}
    >
      <span className="theme-switch__track">
        <span className="theme-switch__thumb" />
        <span className="theme-switch__icon theme-switch__icon--sun" aria-hidden>☀️</span>
        <span className="theme-switch__icon theme-switch__icon--moon" aria-hidden>🌙</span>
      </span>
    </button>
  );
}
