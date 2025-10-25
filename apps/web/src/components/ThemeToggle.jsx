// src/components/ThemeToggle.jsx
import React from "react";
import { useUi } from "../context/UIContext";

export default function ThemeToggle() {
  const { effectiveTheme, toggleTheme } = useUi();
  const isDark = effectiveTheme === "dark";
  const label = isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro";

  return (
    <button
      type="button"
      className={`theme-switch ${isDark ? "is-dark" : "is-light"}`}
      onClick={toggleTheme}
      role="switch"
      aria-checked={isDark}
      aria-label={label}
      title={label}
    >
      <span className="theme-switch__track">
        <span className="theme-switch__thumb" />
      </span>
    </button>
  );
}
