import React from "react";
import { Link } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import LangSelect from "./LangSelect";
import { useTranslation } from "react-i18next";

export default function Header() {
  const { t } = useTranslation();

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <div className="app-header__theme">
          <ThemeToggle />
        </div>
        <Link to="/" className="brand app-header__brand" aria-label={t("go_home")}>
          <svg
            className="brand__logo"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 100 100"
            aria-hidden="true"
          >
            <defs>
              <mask id="pinCutout">
                <rect width="1902.01" height="859.59" fill="white" x="-248.4" y="-253.15" />
                <circle
                  cx="230.678"
                  cy="223.788"
                  r="10"
                  transform="matrix(1.031165, 0, 0, 0.942339, -186.980044, -181.433078)"
                  fill="black"
                />
              </mask>
            </defs>
            <ellipse
              cx="50"
              cy="72.8"
              rx="33"
              ry="13.191"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <ellipse
              cx="50"
              cy="72.8"
              rx="22.685"
              ry="7.538"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <path
              d="M 50.885 8.72 C 38.508 8.72 28.201 18.149 28.201 29.458 C 28.201 44.53 50.885 72.799 50.885 72.799 C 50.885 72.799 73.573 44.53 73.573 29.458 C 73.573 18.149 63.258 8.72 50.885 8.72 Z"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinejoin="round"
              mask="url(#pinCutout)"
            />
            <circle
              cx="217.377"
              cy="238.979"
              r="10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              transform="matrix(1.031209, 0, 0, 0.942346, -173.169162, -195.604404)"
            />
          </svg>
          ChooseEat
        </Link>
        <div className="app-header__right">
          <LangSelect />
        </div>
      </div>
    </header>
  );
}
