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
          ChooseEat
        </Link>
        <div className="app-header__right">
          <LangSelect />
        </div>
      </div>
    </header>
  );
}
