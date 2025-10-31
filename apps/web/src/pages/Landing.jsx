import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { listRememberedSessions, forgetSession } from "../lib/participant";
import { useTranslation } from "react-i18next";

function extractSessionId(input) {
  if (!input) return "";
  const m = String(input).match(/\/s\/([^/\s]+)/);
  if (m && m[1]) return m[1];
  return String(input).trim();
}

export default function Landing() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [joinValue, setJoinValue] = useState("");
  const sessions = useMemo(() => listRememberedSessions(), []);

  function goCreate() {
    navigate("/create");
  }

  function doJoin(e) {
    e.preventDefault();
    const id = extractSessionId(joinValue);
    if (!id) return;
    navigate(`/s/${id}`);
  }

  function goToSession(id) {
    navigate(`/s/${id}`);
  }

  return (
    <div className="wrap home-page">
      <Header />

      <main className="hero">
        <section className="hero__panel">
          <h1 className="hero__title">ChooseEat</h1>

          <p className="hero__subtitle">
            {t("welcome_message")}
          </p>

          <div className="cta-grid">
            <article className="cta-card">
              <div className="cta-card__body">
                <h3>{t("create_session")}</h3>
                <p className="muted">{t("info_create")}</p>
              </div>
              <div className="cta-card__actions">
                <button type="button" className="btn btn--primary" onClick={goCreate}>
                  {t("create_session")}
                </button>
              </div>
            </article>

            <article className="cta-card">
              <div className="cta-card__body">
                <h3>{t("join_session")}</h3>
                <p className="muted">{t("info_join")}</p>
                <form onSubmit={doJoin} className="join-form">
                  <input
                    className="input"
                    placeholder="https://tudominio.com/s/abcd1234  o  abcd1234"
                    value={joinValue}
                    onChange={(e) => setJoinValue(e.target.value)}
                  />
                  <button type="submit" className="btn btn--primary">
                    {t("join")}
                  </button>
                </form>
              </div>
            </article>
          </div>

          {sessions.length > 0 && (
            <section className="recent">
              <div className="recent__header">
                <h4>{t("recent_sessions")}</h4>
              </div>
              <ul className="recent__list">
                {sessions.map((s) => (
                  <li key={s.id} className="recent__item">
                    <button
                      type="button"
                      className="recent__btn"
                      onClick={() => goToSession(s.id)}
                      title="Abrir"
                    >
                      <span className="recent__id">{s.id}</span>
                      <span className="recent__link">{s.invitePath || `/s/${s.id}`}</span>
                    </button>
                    <button
                      type="button"
                      className="recent__forget"
                      onClick={() => {
                        forgetSession(s.id);
                        window.location.reload();
                      }}
                      aria-label="Olvidar"
                      title="Olvidar"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </section>
      </main>
    </div>
  );
}
