// apps/web/src/components/Summary.jsx
import React from "react";
import Button from "./Button";

export default function Summary({
  liked = [],
  onRestart,
  scores = [],            
  winnerId = null
}) {
  const hasScores = Array.isArray(scores) && scores.length > 0;

  const winnerRow = hasScores && winnerId
    ? scores.find(r => r.restaurantId === winnerId)
    : null;

  const otherRows = hasScores
    ? scores.filter(r => r.restaurantId !== winnerId)
    : [];

  return (
    <div className="summary">
      <h2>{hasScores ? "Resultados de la sesión" : "¡Has terminado!"}</h2>

      {hasScores ? (
        <>
          {winnerRow && (
            <>
              <p className="muted" style={{ marginTop: 0 }}>Ganador</p>
              <ul className="list" style={{ marginTop: 8 }}>
                <li className="list__item" key={winnerRow.restaurantId}>
                  {winnerRow.img && (
                    <img src={winnerRow.img} alt={`Foto de ${winnerRow.name}`} />
                  )}
                  <div style={{ flex: 1 }}>
                    <div className="name">
                      {winnerRow.name} <span aria-hidden="true">🏆</span>
                    </div>
                    <div className="small">
                      Sí: {winnerRow.yes} · No: {winnerRow.no} · Total: {winnerRow.total}
                    </div>
                  </div>
                </li>
              </ul>
            </>
          )}

          <p className="muted" style={{ marginTop: 16 }}>Resto de candidatos</p>
          <ul className="list">
            {otherRows.map(row => (
              <li key={row.restaurantId} className="list__item">
                {row.img && (
                  <img src={row.img} alt={`Foto de ${row.name}`} />
                )}
                <div style={{ flex: 1 }}>
                  <div className="name">{row.name}</div>
                  <div className="small">
                    Sí: {row.yes} · No: {row.no} · Total: {row.total}
                  </div>
                </div>
              </li>
            ))}
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
                    {x.img && <img src={x.img} alt={`Foto de ${x.name}`} />}
                    <div>
                      <div className="name">{x.name}</div>
                      <div className="small">
                        {x.cuisine?.join(" · ") || "—"} · {"$".repeat(x.price || 0)} · ⭐ {x.rating?.toFixed?.(1) ?? "—"}
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

      <div className="summary__actions" style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <Button variant="ghost" onClick={onRestart}>Reiniciar</Button>
      </div>
    </div>
  );
}
