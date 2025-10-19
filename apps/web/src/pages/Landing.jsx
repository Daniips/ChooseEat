import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function extractSessionId(input) {
  if (!input) return null;
  const s = String(input).trim();
  const m = s.match(/\/s\/([a-zA-Z0-9_-]+)/);
  if (m && m[1]) return m[1];
  if (/^s_[a-z0-9]+$/i.test(s)) return s;
  return null;
}

export default function Landing() {
  const navigate = useNavigate();
  const [joinInput, setJoinInput] = useState("");
  const [error, setError] = useState("");

  const goCreate = () => navigate("/create");

  const onJoinSubmit = (e) => {
    e.preventDefault();
    setError("");
    const id = extractSessionId(joinInput);
    if (!id) {
      setError("Introduce un enlace /s/<id> o un ID de sesión válido (p. ej., s_abcd1234).");
      return;
    }
    navigate(`/s/${id}`);
  };

  return (
    <div className="landing">
      <main className="landing__container">
        <section className="landing__hero">
          <h1>ChooseEat</h1>
          <p className="muted">
            Decide rápido dónde comer con tu grupo. Crea una sesión o únete con un enlace.
          </p>

          <div className="landing__cta">
            <button className="btn btn--primary" style={{ marginTop:50 }} onClick={goCreate}>
              ✨ Crear sesión
            </button>
          </div>
        </section>

        <section className="landing__join card-soft">
          <h3 style={{ margin: 0 }}>Unirme a una sesión</h3>
          <p className="muted" style={{ marginTop: 6 }}>
            Pega el enlace que te han pasado o escribe el ID de sesión.
          </p>

          <form onSubmit={onJoinSubmit} className="join-input">
            <input
              className="input"
              placeholder="Ej. s_abcd1234"
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value)}
            />
            <button type="submit" className="btn btn--ghost">
              Unirme
            </button>
          </form>

          {error && (
            <div className="form-error" role="alert" style={{ marginTop: 8 }}>
              {error}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
