// apps/web/src/pages/Landing.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { listRememberedSessions, forgetSession } from "../lib/participant";
import { pruneParticipants } from "../lib/participant";



export default function Landing() {
  const navigate = useNavigate();
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    pruneParticipants({ maxItems: 100, maxAgeDays: 90 });
  }, []);

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const base = listRememberedSessions();
        if (base.length === 0) {
          if (!aborted) { setRecent([]); setLoading(false); }
          return;
        }
        const enriched = await Promise.all(
          base.map(async (s) => {
            try {
              const res = await fetch(`/api/sessions/${s.id}/results`);
              if (!res.ok) throw new Error("no results");
              const data = await res.json();
              const top = Array.isArray(data.results) && data.results[0] ? data.results[0] : null;
              return {
                ...s,
                needed: data.needed,
                winners: data.winnerIds || [],
                topName: top?.name || null,
                topYes: top?.yes ?? null,
              };
            } catch {
              return { ...s, error: true };
            }
          })
        );
        if (!aborted) {
          enriched.sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));
          setRecent(enriched);
          setLoading(false);
        }
      } catch {
        if (!aborted) { setRecent([]); setLoading(false); }
      }
    })();
    return () => { aborted = true; };
  }, []);

  return (
    <div className="wrap">
      <Header />

      <section className="summary" style={{ maxWidth: 720, margin: "24px auto" }}>
        <h2 style={{ marginTop: 0 }}>Elige restaurante sin discusiones</h2>
        <p className="muted" style={{ marginTop: 8 }}>
          Crea una sesión, comparte el enlace y votad hasta encontrar el match perfecto.
        </p>

        <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
          <button className="btn btn--primary" onClick={() => navigate("/create")}>
            Crear sesión
          </button>
          <button className="btn btn--ghost" onClick={() => {
            const url = prompt("Pega el enlace de invitación (o id de sesión):");
            if (!url) return;
            const m = String(url).match(/\/s\/([^/?#\s]+)/);
            const id = m ? m[1] : String(url).trim();
            if (id) navigate(`/s/${id}`);
          }}>
            Unirme con enlace
          </button>
        </div>
      </section>

      <section className="summary" style={{ maxWidth: 960, margin: "24px auto" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <h3 style={{ margin: 0 }}>Tus sesiones recientes</h3>
          {!loading && recent.length > 0 && (
            <span className="small muted">{recent.length} guardada{recent.length === 1 ? "" : "s"}</span>
          )}
        </div>

        {loading ? (
          <div className="muted" style={{ marginTop: 12 }}>Cargando…</div>
        ) : recent.length === 0 ? (
          <div className="muted" style={{ marginTop: 12 }}>
            Aún no tienes sesiones guardadas. Crea una y aparecerá aquí.
          </div>
        ) : (
          <ul className="list" style={{ marginTop: 12 }}>
            {recent.map((s) => (
              <li key={s.id} className="list__item" style={{ alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="name" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.id}
                  </div>
                  <div className="small muted" style={{ marginTop: 4 }}>
                    {s.error
                      ? "No disponible ahora mismo"
                      : s.winners && s.winners.length > 0
                        ? `Con ganador${s.winners.length > 1 ? "es" : ""} · umbral ${s.needed}`
                        : s.topName
                          ? `Top: ${s.topName}${typeof s.topYes === "number" ? ` (${s.topYes} ✅)` : ""}`
                          : "Sin datos todavía"}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn btn--ghost"
                    onClick={() => navigate(`/s/${s.id}`)}
                    title="Abrir sesión"
                  >
                    Ver
                  </button>
                  <button
                    className="btn btn--ghost"
                    onClick={() => {
                      if (!confirm("¿Quitar esta sesión de tu lista?")) return;
                      forgetSession(s.id, { removeParticipant: false });
                      // refrescar vista
                      const next = recent.filter(x => x.id !== s.id);
                      setRecent(next);
                    }}
                    title="Olvidar"
                  >
                    Quitar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
