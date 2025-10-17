import React from "react";
import Button from "./Button";

export default function Summary({ liked = [], scores = [], winnerIds = [], needed, onRestart }) {
  const hasScores = Array.isArray(scores) && scores.length > 0;

  return (
    <div className="summary">
      <h2>¡Has terminado!</h2>

      {/* Ganadores (si los hay) */}
      {hasScores && winnerIds?.length > 0 && (
        <>
          <p className="muted">✅ Se alcanzó el umbral (≥ {needed}) en:</p>
          <ul className="list" style={{ marginBottom: 16 }}>
            {scores
              .filter(r => winnerIds.includes(r.id))
              .map(r => (
                <li key={r.id} className="list__item" style={{ borderLeft: "4px solid var(--accent)" }}>
                  <img src={r.img} alt="" />
                  <div>
                    <div className="name">{r.name}</div>
                    <div className="small">
                      {Array.isArray(r.cuisine) ? r.cuisine.join(" · ") : null}
                      {r.price ? ` · ${"$".repeat(r.price)}` : null}
                      {typeof r.rating === "number" ? ` · ⭐ ${r.rating.toFixed(1)}` : null}
                    </div>
                    <div className="small">Sí: {r.yes} · No: {r.no} · Pendiente: {r.pending}</div>
                  </div>
                </li>
              ))}
          </ul>
        </>
      )}

      {/* Ranking completo */}
      {hasScores ? (
        <>
          <p className="muted">Recuento final:</p>
          <ul className="list">
            {scores.map(r => {
              const isWinner = winnerIds.includes(r.id);
              return (
                <li key={r.id} className="list__item" style={{ opacity: 1 }}>
                  <img src={r.img} alt="" />
                  <div>
                    <div className="name">
                      {r.name} {isWinner && <span aria-label="Ganador" title="Ganador">🏆</span>}
                    </div>
                    <div className="small">
                      Sí: {r.yes} · No: {r.no} · Pendiente: {r.pending}
                      {typeof needed === "number" ? ` · Umbral: ${needed}` : ""}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <>
          {liked.length ? (
            <>
              <p className="muted">Te han gustado:</p>
              <ul className="list">
                {liked.map(x => (
                  <li key={x.id} className="list__item">
                    <img src={x.img} alt="" />
                    <div>
                      <div className="name">{x.name}</div>
                      <div className="small">
                        {x.cuisine.join(" · ")} · {"$".repeat(x.price)} · ⭐ {x.rating.toFixed(1)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="muted">No has dado "sí" a ninguno esta vez.</p>
          )}
        </>
      )}

      <div className="summary__actions">
        <Button variant="ghost" onClick={onRestart}>Reiniciar</Button>
      </div>
    </div>
  );
}
