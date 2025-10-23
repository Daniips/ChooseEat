import React from "react";
import { Link } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  return (
    <header className="app-header">
      <div className="app-header__inner">
        <div aria-hidden />

        <Link to="/" className="brand" aria-label="Ir a inicio">
          ChooseEat
        </Link>

        <div className="app-header__right">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
