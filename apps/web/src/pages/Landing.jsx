import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { listRememberedSessions, forgetSession } from "../lib/participant";

function extractSessionId(input) {
  if (!input) return "";
  const m = String(input).match(/\/s\/([^/\s]+)/);
  if (m && m[1]) return m[1];
  return String(input).trim();
}

export default function Landing() {
  const navigate = useNavigate();
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
    <div className="wrap">
      <Header />

      <main className="hero">
        <section className="hero__panel">
          <h1 className="hero__title">ChooseEat</h1>
          <p className="hero__subtitle">
            Decide dónde comer con tu grupo en minutos. Crea una sesión o únete con un enlace.
          </p>

          <div className="cta-grid">
            <article className="cta-card">
              <div className="cta-card__body">
                <h3>Crear sesión</h3>
                <p className="muted">
                  Elige radio, filtros y umbral de votos. Comparte el enlace con tu grupo.
                </p>
              </div>
              <div className="cta-card__actions">
                <button type="button" className="btn btn--primary" onClick={goCreate}>
                  Crear sesión
                </button>
              </div>
            </article>

            <article className="cta-card">
              <div className="cta-card__body">
                <h3>Unirme a una sesión</h3>
                <p className="muted">
                  Pega el enlace que te han pasado o escribe el ID de sesión.
                </p>
                <form onSubmit={doJoin} className="join-form">
                  <input
                    className="input"
                    placeholder="https://tudominio.com/s/abcd1234  o  abcd1234"
                    value={joinValue}
                    onChange={(e) => setJoinValue(e.target.value)}
                  />
                  <button type="submit" className="btn btn--ghost">Unirme</button>
                </form>
              </div>
            </article>
          </div>
          {sessions.length > 0 && (
            <section className="recent">
              <div className="recent__header">
                <h4>Tus sesiones recientes</h4>
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
