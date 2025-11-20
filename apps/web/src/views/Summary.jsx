// apps/web/src/views/Summary.jsx
import React from "react";
import Button from "../components/Button";
import { useTranslation } from "react-i18next";

function getPhotoUrl(restaurant) {
  const url = restaurant.photos?.[0] || restaurant.img;
  if (!url) return "";
  if (url.includes("places.googleapis.com")) {
    return `http://localhost:4000/api/photos/proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

function getGoogleMapsUrl(restaurant) {
  if (restaurant.id && restaurant.source === 'google') {
    return `https://www.google.com/maps/place/?q=place_id:${restaurant.id}`;
  }
  if (restaurant.location?.lat && restaurant.location?.lng) {
    return `https://www.google.com/maps/search/?api=1&query=${restaurant.location.lat},${restaurant.location.lng}`;
  }
  if (restaurant.name) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name)}`;
  }
  return "";
}

export default function Summary({
  liked = [],
  scores = [],
  winnerIds = [],
  needed,
  participantsTotal,
  participants = {},
  onRestart,
}) {
  const { t } = useTranslation();
  const hasScores = Array.isArray(scores) && scores.length > 0;
  const winners = new Set(winnerIds || []);

  function getNames(ids) {
    return Array.from(ids)
      .map(id => participants[id]?.name)
      .filter(Boolean)
      .join(', ');
  }

  if (!hasScores) {
    return (
      <div className="summary" style={{ 
        flex: 1,
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden',
        boxSizing: 'border-box',
        minHeight: 0
      }}>
        <h2>{t("finished")}</h2>

        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {liked.length ? (
          <>
            <p className="muted">{t("liked")}</p>
            <ul className="list">
              {liked.map((x) => {
                const photoUrl = getPhotoUrl(x);
                const mapsUrl = getGoogleMapsUrl(x);
                
                return (
                  <li key={x.id} className="list__item">
                    {photoUrl && <img src={photoUrl} alt="" />}
                    <div className="list__item-content">
                      <div className="res-title">
                        <span className="name res-title__name">{x.name}</span>
                        {mapsUrl && (
                          <div className="res-title__right">
                            <Button
                              variant="ghost"
                              size="mini"
                              onClick={() => window.open(mapsUrl, "_blank", "noopener")}
                              aria-label={t("view_on_maps")}
                              title={t("view_on_maps")}
                            >
                              {t("view_on_maps")}
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="small">
                        {Array.isArray(x.cuisines) && x.cuisines.length > 0
                          ? x.cuisines.map((c) => t(`cuisines.${c}`, c)).join(" · ")
                          : Array.isArray(x.cuisine)
                          ? x.cuisine.map((c) => t(c.toLowerCase())).join(" · ")
                          : null}
                        {x.price ? ` · ${"$".repeat(x.price)}` : ""}
                        {typeof x.rating === "number" ? ` · ⭐ ${x.rating.toFixed(1)}` : ""}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="muted">{t("no_liked")}</p>
        )}
        </div>

        <div className="summary__actions" style={{ flexShrink: 0, marginTop: 16 }}>
          <Button variant="ghost" onClick={onRestart}>{t("restart")}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="summary" style={{ 
      flex: 1,
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden',
      boxSizing: 'border-box',
      minHeight: 0
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>{t("finished")}</h2>
        <Button variant="ghost" onClick={onRestart}>{t("restart")}</Button>
      </div>

      <p className="muted" style={{ marginTop: -4 }}>
        {winnerIds?.length
          ? t("threshold_reached", { needed, count: winnerIds.length })
          : t("threshold_not_reached", { needed })}
      </p>

      <div className="legend small muted" style={{ flexShrink: 0, marginBottom: 12 }}>
        <span className="legend__item"><i className="swatch swatch--yes" /> {t("yes")}</span>
        <span className="legend__item"><i className="swatch swatch--no" /> {t("no")}</span>
        <span className="legend__item"><i className="swatch swatch--pending" /> {t("pending")}</span>
      </div>

      <ul className="results" style={{ flex: 1, overflow: 'auto', minHeight: 0, margin: 0 }}>
        {scores.map((r) => {
          const yes = r.yes ?? 0;
          const no  = r.no  ?? 0;
          const yesIds = r.yesIds || [];
          const noIds = r.noIds || []; 
          const voters = (typeof participantsTotal === "number" && participantsTotal > 0)
            ? participantsTotal
            : 1;
          
          const pending = Math.max(0, voters - (yes + no));

          const yesPct     = (100 * yes) / voters;
          const noPct      = (100 * no) / voters;
          const pendingPct = Math.max(0, 100 - yesPct - noPct);

          const isWinner = winners.has(r.id);
          const photoUrl = getPhotoUrl(r);
          const mapsUrl = getGoogleMapsUrl(r);
          return (
            <li key={r.id} className={`res-row${isWinner ? " res-row--winner" : ""}`}>
              {photoUrl && <img className="res-img" src={photoUrl} alt="" />}
              <div className="res-main">
                <div className="res-title">
                  <span className="name res-title__name">{r.name}</span>
                  <div className="res-title__right">
                    {isWinner && (
                      <span className="badge" title={t("winner")} aria-label={t("winner")}>
                        🏆
                      </span>
                    )}
                    {mapsUrl && (
                      <Button
                        variant="ghost"
                        size="mini"
                        onClick={() => window.open(mapsUrl, "_blank", "noopener")}
                        aria-label={t("view_on_maps")}
                        title={t("view_on_maps")}
                      >
                        {t("view_on_maps")}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="small res-meta">
                  {Array.isArray(r.cuisines) && r.cuisines.length > 0
                    ? r.cuisines.map((c) => t(`cuisines.${c}`, c)).join(" · ")
                    : Array.isArray(r.cuisine)
                    ? r.cuisine.map((c) => t(c.toLowerCase())).join(" · ")
                    : null}
                  {r.price ? ` · ${"$".repeat(r.price)}` : ""}
                  {typeof r.rating === "number" ? ` · ⭐ ${r.rating.toFixed(1)}` : ""}
                </div>


                <div
                  className="meter meter--stack"
                  role="img"
                  aria-label={t("vote_count")}
                  style={{ position: "relative" }}
                  tabIndex={0}
                >
                  {yesPct > 0 && (
                    <div
                      className="meter__seg meter__yes"
                      style={{ flexBasis: `${yesPct}%`, cursor: "pointer" }}
                      title={getNames(yesIds) ? `${t("yes")}: ${getNames(yesIds)}` : ""}
                      onMouseEnter={e => {
                        const tooltip = document.createElement('div');
                        tooltip.className = 'vote-tooltip';
                        tooltip.innerText = getNames(yesIds) ? `${t("yes")}: ${getNames(yesIds)}` : t("no_votes");
                        Object.assign(tooltip.style, {
                          position: 'absolute',
                          top: '-32px',
                          left: '0',
                          background: 'var(--ctrl-bg)',
                          color: 'var(--fg)',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          boxShadow: '0 2px 8px rgba(0,0,0,.15)',
                          zIndex: 10,
                          pointerEvents: 'none'
                        });
                        e.currentTarget.parentNode.appendChild(tooltip);
                        e.currentTarget._tooltip = tooltip;
                      }}
                      onMouseLeave={e => {
                        if (e.currentTarget._tooltip) {
                          e.currentTarget._tooltip.remove();
                          e.currentTarget._tooltip = null;
                        }
                      }}
                    />
                  )}
                  {noPct > 0 && (
                    <div
                      className="meter__seg meter__no"
                      style={{ flexBasis: `${noPct}%`, cursor: "pointer" }}
                      title={getNames(noIds) ? `${t("no")}: ${getNames(noIds)}` : ""}
                      onMouseEnter={e => {
                        const tooltip = document.createElement('div');
                        tooltip.className = 'vote-tooltip';
                        tooltip.innerText = getNames(noIds) ? `${t("no")}: ${getNames(noIds)}` : t("no_votes");
                        Object.assign(tooltip.style, {
                          position: 'absolute',
                          top: '-32px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          background: 'var(--ctrl-bg)',
                          color: 'var(--fg)',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          boxShadow: '0 2px 8px rgba(0,0,0,.15)',
                          zIndex: 10,
                          pointerEvents: 'none'
                        });
                        e.currentTarget.parentNode.appendChild(tooltip);
                        e.currentTarget._tooltip = tooltip;
                      }}
                      onMouseLeave={e => {
                        if (e.currentTarget._tooltip) {
                          e.currentTarget._tooltip.remove();
                          e.currentTarget._tooltip = null;
                        }
                      }}
                    />
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
    </div>
  );
}