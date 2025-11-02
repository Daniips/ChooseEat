// apps/web/src/pages/Summary.jsx
import React from "react";
import Button from "../components/Button";
import { useTranslation } from "react-i18next";

export default function Summary({
  liked = [],
  scores = [],
  winnerIds = [],
  needed,
  participantsTotal,
  onRestart,
}) {
  const { t } = useTranslation();
  const hasScores = Array.isArray(scores) && scores.length > 0;
  const winners = new Set(winnerIds || []);

  if (!hasScores) {
    return (
      <div className="summary">
        <h2>{t("finished")}</h2>

        {liked.length ? (
          <>
            <p className="muted">{t("liked")}</p>
            <ul className="list">
              {liked.map((x) => (
                <li key={x.id} className="list__item">
                  <img src={x.img} alt="" />
                  <div>
                    <div className="name">{x.name}</div>
                    <div className="small">
                      {Array.isArray(x.cuisine)
                        ? x.cuisine.map((c) => t(c.toLowerCase())).join(" · ")
                        : null}
                      {x.price ? ` · ${"$".repeat(x.price)}` : ""}
                      {typeof x.rating === "number" ? ` · ⭐ ${x.rating.toFixed(1)}` : ""}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="muted">{t("no_liked")}</p>
        )}

        <div className="summary__actions">
          <Button variant="ghost" onClick={onRestart}>{t("restart")}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="summary">
      <h2>{t("finished")}</h2>

      <p className="muted" style={{ marginTop: -4 }}>
        {winnerIds?.length
          ? t("threshold_reached", { needed, count: winnerIds.length })
          : t("threshold_not_reached", { needed })}
      </p>

      <div className="legend small muted">
        <span className="legend__item"><i className="swatch swatch--yes" /> {t("yes")}</span>
        <span className="legend__item"><i className="swatch swatch--no" /> {t("no")}</span>
        <span className="legend__item"><i className="swatch swatch--pending" /> {t("pending")}</span>
      </div>

      <ul className="results">
        {scores.map((r) => {
          const yes = r.yes ?? 0;
          const no  = r.no  ?? 0;

          const voters = (typeof participantsTotal === "number" && participantsTotal > 0)
            ? participantsTotal
            : 1;

          const pending = Math.max(0, voters - (yes + no));

          const yesPct     = (100 * yes) / voters;
          const noPct      = (100 * no) / voters;
          const pendingPct = Math.max(0, 100 - yesPct - noPct);

          const isWinner = winners.has(r.id);

          return (
            <li key={r.id} className={`res-row${isWinner ? " res-row--winner" : ""}`}>
              <img className="res-img" src={r.img} alt="" />
              <div className="res-main">
                <div className="res-title">
                  <span className="name">{r.name}</span>
                  {isWinner && (
                    <span className="badge" title={t("winner")} aria-label={t("winner")}>🏆</span>
                  )}
                </div>

                <div className="small res-meta">
                  {Array.isArray(r.cuisine)
                    ? r.cuisine.map((c) => t(c.toLowerCase())).join(" · ")
                    : null}
                  {r.price ? ` · ${"$".repeat(r.price)}` : ""}
                  {typeof r.rating === "number" ? ` · ⭐ ${r.rating.toFixed(1)}` : ""}
                </div>


                <div className="meter meter--stack" role="img" aria-label={t("vote_count")}>
                  {yesPct > 0 && (
                    <div className="meter__seg meter__yes" style={{ flexBasis: `${yesPct}%` }} />
                  )}
                  {noPct > 0 && (
                    <div className="meter__seg meter__no" style={{ flexBasis: `${noPct}%` }} />
                  )}
                  {pendingPct > 0 && (
                    <div className="meter__seg meter__pending" style={{ flexBasis: `${pendingPct}%` }} />
                  )}
                </div>

                <div className="small res-counts">
                  <span>{t("yes")}: {yes}</span>
                  <span> · {t("no")}: {no}</span>
                  <span> · {t("pending")}: {pending}</span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="summary__actions">
        <Button variant="ghost" onClick={onRestart}>{t("restart")}</Button>
      </div>
    </div>
  );
}
