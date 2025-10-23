import React from "react";
import Button from "./Button";

export default function Summary({
  liked = [],
  scores = [],
  winnerIds = [],
  needed,
  onRestart,
}) {
  const hasScores = Array.isArray(scores) && scores.length > 0;
  const winners = new Set(winnerIds || []);

  if (!hasScores) {
    return (
      <div className="summary">
        <h2>¡Has terminado!</h2>

        {liked.length ? (
          <>
            <p className="muted">Te han gustado:</p>
            <ul className="list">
              {liked.map((x) => (
                <li key={x.id} className="list__item">
                  <img src={x.img} alt="" />
                  <div>
                    <div className="name">{x.name}</div>
                    <div className="small">
                      {Array.isArray(x.cuisine) ? x.cuisine.join(" · ") : null}
                      {x.price ? ` · ${"$".repeat(x.price)}` : null}
                      {typeof x.rating === "number"
                        ? ` · ⭐ ${x.rating.toFixed(1)}`
                        : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="muted">No has dado "sí" a ninguno esta vez.</p>
        )}

        <div className="summary__actions">
          <Button variant="ghost" onClick={onRestart}>
            Reiniciar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="summary">
      <h2>¡Has terminado!</h2>

      <p className="muted" style={{ marginTop: -4 }}>
        {winnerIds?.length
          ? `✅ Se alcanzó el umbral (≥ ${needed}) en ${winnerIds.length} lugar${
              winnerIds.length === 1 ? "" : "es"
            }.`
          : `Aún no se alcanzó el umbral (≥ ${needed}).`}
      </p>

      <ul className="results">
        {scores.map((r) => {
          const total = Math.max(
            1,
            (r.yes || 0) + (r.no || 0) + (r.pending || 0)
          );
          const yesPct = (100 * (r.yes || 0)) / total;
          const noPct = (100 * (r.no || 0)) / total;
          const pendingPct = 100 - yesPct - noPct;
          const goalPct = Math.min(
            100,
            Math.max(0, (100 * (needed || 0)) / total)
          );
          const isWinner = winners.has(r.id);

          return (
            <li
              key={r.id}
              className={`res-row${isWinner ? " res-row--winner" : ""}`}
            >
              <img className="res-img" src={r.img} alt="" />
              <div className="res-main">
                <div className="res-title">
                  <span className="name">{r.name}</span>
                  {isWinner && (
                    <span className="badge" title="Ganador" aria-label="Ganador">
                      🏆
                    </span>
                  )}
                </div>

                <div className="small res-meta">
                  {Array.isArray(r.cuisine) ? r.cuisine.join(" · ") : null}
                  {r.price ? ` · ${"$".repeat(r.price)}` : ""}
                  {typeof r.rating === "number"
                    ? ` · ⭐ ${r.rating.toFixed(1)}`
                    : ""}
                </div>

                <div className="bar" aria-label="Recuento de votos">
                  <div className="bar__seg bar--yes" style={{ width: `${yesPct}%` }} />
                  <div className="bar__seg bar--no" style={{ width: `${noPct}%` }} />
                  <div
                    className="bar__seg bar--pending"
                    style={{ width: `${pendingPct}%` }}
                  />
                  {typeof needed === "number" && total > 0 && (
                    <div
                      className="bar__goal"
                      style={{ left: `${goalPct}%` }}
                      title={`Umbral: ${needed}`}
                    />
                  )}
                </div>

                <div className="small res-counts">
                  <span>Sí: {r.yes}</span>
                  <span>· No: {r.no}</span>
                  <span>· Pendiente: {r.pending}</span>
                  {typeof needed === "number" ? (
                    <span>· Umbral: {needed}</span>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="summary__actions">
        <Button variant="ghost" onClick={onRestart}>
          Reiniciar
        </Button>
      </div>
    </div>
  );
}
