// src/views/Lobby.jsx
import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../context/SessionContext";
import Toast from "../components/Toast";
import { CUISINES } from "../data/cuisines";
import Header from "../components/Header";
import { setParticipant } from "../lib/participant";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import { errorToMessage } from "../lib/errorToMessage";
import { DEFAULT_ERROR_KEYS } from "../lib/errorKeys";

const PREVIEW_ERROR_KEYS = {
  ...DEFAULT_ERROR_KEYS,
  notFound: "errors.preview_failed",
  generic:  "errors.preview_failed",
};

const CREATE_ERROR_KEYS = {
  ...DEFAULT_ERROR_KEYS,
  notFound:  "errors.cannot_create_session",
  badRequest:"errors.form_invalid",
  conflict:  "errors.conflict_action",
  generic:   "errors.cannot_create_session",
};

export default function Lobby() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hydrateFromJoin } = useSession();
  const allCuisinesKeys = useMemo(() => CUISINES.map(c => c.key), []);
  const [tab, setTab] = useState("filtros");

  const [hostName, setHostName] = useState("");
  const [radiusKm, setRadiusKm] = useState(2);
  const [selectedCuisines, setSelectedCuisines] = useState([...allCuisinesKeys]);
  const [price, setPrice] = useState([]);
  const [openNow, setOpenNow] = useState(false);
  const [minRating, setMinRating] = useState(0);

  const [people, setPeople] = useState(2);
  const [requiredYes, setRequiredYes] = useState(2);

  const [previewCount, setPreviewCount] = useState(null);
  const [toast, setToast] = useState({ open: false, variant: "warn", msg: "", duration: 5000 });
  const showToast = (variant, msg, duration = 5000) =>
    setToast({ open: true, variant, msg, duration });

  const cuisinesValid = selectedCuisines.length > 0;
  const thresholdValid = people >= 2 && (people === 2 ? true : (requiredYes >= 2 && requiredYes <= people));

  useEffect(() => {
    if (people <= 2) setRequiredYes(2);
    else if (requiredYes > people) setRequiredYes(people);
  }, [people, requiredYes]);

  function toggleCuisine(key) {
    setSelectedCuisines(cs => {
      const next = cs.includes(key) ? cs.filter(x => x !== key) : [...cs, key];
      return next;
    });
    setPreviewCount(null);
  }
  function togglePrice(n) {
    setPrice(ps => {
      const next = ps.includes(n) ? ps.filter(x => x !== n) : [...ps, n];
      return next;
    });
    setPreviewCount(null);
  }
    

  async function preview() {
    if (!cuisinesValid) return;

    const params = new URLSearchParams();
    params.set("radiusKm", String(radiusKm));
    if (selectedCuisines.length) params.set("cuisines", selectedCuisines.join(","));
    if (price.length) params.set("price", price.join(","));
    if (openNow) params.set("openNow", "true");
    if (minRating) params.set("minRating", String(minRating));

    try {
      const data = await api(`/api/restaurants?${params.toString()}`);
      const count = data?.count ?? (Array.isArray(data.items) ? data.items.length : 0);
      setPreviewCount(count);
      showToast("ok", t("results_count", { count: count }), 2200);
    } catch (e) {
      console.error("Preview filters failed:", e);
      setPreviewCount(null);
      showToast("warn", errorToMessage(e, t, PREVIEW_ERROR_KEYS));
    }
  }

  async function applyAndStart(e) {
    e.preventDefault();
    if (!cuisinesValid || !thresholdValid) return;

    const area = { radiusKm };
    const filters = { cuisines: selectedCuisines, price, openNow, minRating };
    const finalRequired = people <= 2 ? 2 : Math.max(2, Math.min(people, Number(requiredYes) || 2));
    const threshold = { type: "absolute", value: finalRequired, participants: Number(people) };

    try {
      const created = await api("/api/sessions", {
        method: "POST",
        body: JSON.stringify({ area, filters, threshold })
      });

      const joined = await api(`/api/sessions/${created.sessionId}/join`, {
        method: "POST",
        body: JSON.stringify({ name: hostName || "Host" })
      });

      setParticipant(created.sessionId, joined.participant, created.invitePath);
      hydrateFromJoin(joined);
      navigate("/vote");
    } catch (e) {
      console.error("Create/join session failed:", e);
      showToast("warn", errorToMessage(e, t, CREATE_ERROR_KEYS));
    }
  }

  const summaries = {
    zona: `${t('radius')}: ${radiusKm.toFixed(1)} km`,
    filtros: `${selectedCuisines.length} ${t('cuisine').toLowerCase()}${selectedCuisines.length === 1 ? "" : "s"}`
      + (minRating ? ` · ≥ ${minRating.toFixed(1)}★` : "")
      + (price.length ? ` · ${price.map(n => "$".repeat(n)).join(" ")}` : "")
      + (openNow ? ` · ${t('open_now').toLowerCase()}` : ""),
    decisores: `${people} ${t('voters').toLowerCase()} · ${t('threshold')} ${people <= 2 ? 2 : requiredYes}`
  };

  const tabs = [
    { id: "zona", label: t('zone'), icon: "📍" },
    { id: "filtros", label: t('filters'), icon: "🎛️" },
    { id: "decisores", label: t('voters'), icon: "👥" }
  ];
  const activeIndex = Math.max(0, tabs.findIndex(tk => tk.id === tab));

  return (
    <div className="wrap">
      <Header />

      <form
        className="summary"
        style={{ maxWidth: 900, margin: "24px auto", padding: 0, overflow: "hidden" }}
        onSubmit={applyAndStart}
      >
        <div className="lobby__topbar">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => navigate("/")}
            title={t('go_home')}
          >
            ← {t('home_button')}
          </button>
          <h2 className="lobby__title">{t('create_session')}</h2>
          <div className="lobby__hint small muted">
            {previewCount === null
              ? t('press_prev')
              : `${previewCount} sitio${previewCount === 1 ? "" : "s"} con estos filtros`}
          </div>
        </div>
        <div className="lobby__host">
          <label htmlFor="host-name" style={{ display: "grid", gap: 6 }}>
            <div className="small">{t('ur_name')} (host)</div>
            <input
              id="host-name"
              className="input"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              placeholder={t('enter_name')}
              required
              style={{ maxWidth: 320 }}
            />
          </label>
        </div>

        <div className="seg" role="tablist" aria-label={t('create_session')}>
          <div className="seg__bg" style={{ "--i": activeIndex }} />
          {tabs.map((tdef) => (
            <button
              key={tdef.id}
              type="button"
              role="tab"
              aria-selected={tab === tdef.id}
              className={`seg__btn ${tab === tdef.id ? "is-active" : ""}`}
              onClick={() => setTab(tdef.id)}
            >
              <span className="seg__icon" aria-hidden>{tdef.icon}</span>
              <span className="seg__label">{tdef.label}</span>
              <span className="seg__summary small muted">{summaries[tdef.id]}</span>
            </button>
          ))}
        </div>

        <div className="lobby__panels">
          {tab === "zona" && (
            <section className="panel">
              <h3>{t('zone')}</h3>
              <label htmlFor="zone-radius" style={{ display: "grid", gap: 6 }}>
                <div className="small">{t('radius')}: {radiusKm.toFixed(1)} km</div>
                <input
                  id="zone-radius"
                  type="range"
                  min={0.5}
                  max={5}
                  step={0.1}
                  value={radiusKm}
                  onChange={(e) => { setRadiusKm(Number(e.target.value)); setPreviewCount(null); }}
                  className="range"
                />
              </label>
            </section>
          )}

          {tab === "filtros" && (
            <section className="panel">
              <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <h3 style={{ margin: 0 }}>{t('cuisine')}</h3>
                <div className="small">
                  <button type="button" onClick={() => setSelectedCuisines([...allCuisinesKeys])} className="link" style={{ padding: 0 }}>
                    {t('select_all')}
                  </button>
                  <span> · </span>
                  <button type="button" onClick={() => setSelectedCuisines([])} className="link" style={{ padding: 0 }}>
                    {t('clean')}
                  </button>
                </div>
              </div>

              <div className="chips" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8 }}>
                {CUISINES.map(c => {
                  const active = selectedCuisines.includes(c.key);
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => toggleCuisine(c.key)}
                      className={`chip${active ? " chip--active" : ""}`}
                      aria-pressed={active}
                    >
                      {t(c.key)}
                    </button>
                  );
                })}
              </div>

              {!cuisinesValid && (
                <div className="form-error" role="alert" aria-live="assertive" style={{ marginTop: 8 }}>
                  {t('select_one_cuisine')}
                </div>
              )}

              <div className="filters__row">
                <section>
                  <div className="small" style={{ margin: "0 0 6px" }}>{t('price')}</div>
                  <div className="chips" style={{ gap: 8 }}>
                    {[1, 2, 3, 4].map(n => {
                      const active = price.includes(n);
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => togglePrice(n)}
                          className={`chip${active ? " chip--active" : ""}`}
                          aria-pressed={active}
                        >
                          {"$".repeat(n)}
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section>
                  <label htmlFor="open-now" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      id="open-now"
                      type="checkbox"
                      checked={openNow}
                      onChange={(e) => { setOpenNow(e.target.checked); setPreviewCount(null); }}
                    />
                    <span>{t('open_now')}</span>
                  </label>

                  <label htmlFor="min-rating" style={{ display: "grid", gap: 6, marginTop: 12 }}>
                    <div className="small">{t('minimum_rating')}: {minRating.toFixed(1)}</div>
                    <input
                      id="min-rating"
                      type="range"
                      min={0}
                      max={5}
                      step={0.1}
                      value={minRating}
                      onChange={(e) => { setMinRating(Number(e.target.value)); setPreviewCount(null); }}
                      className="range"
                    />
                  </label>
                </section>
              </div>
            </section>
          )}

          {tab === "decisores" && (
            <section className="panel">
              <h3>{t('voters')}</h3>
              <div style={{ display: "grid", gap: 12 }}>
                <label htmlFor="people" style={{ display: "grid", gap: 6 }}>
                  <div className="small">{t('voters_info')}</div>
                  <input
                    id="people"
                    type="number"
                    min={2}
                    max={50}
                    step={1}
                    value={people}
                    onChange={(e) => setPeople(Math.max(2, Math.min(50, Number(e.target.value) || 2)))}
                    className="input"
                    style={{ width: 160 }}
                  />
                </label>

                {people > 2 ? (
                  <label htmlFor="required-yes" style={{ display: "grid", gap: 6 }}>
                    <div className="small">{t('need_yes_from')}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        id="required-yes"
                        type="number"
                        min={2}
                        max={people}
                        step={1}
                        value={requiredYes}
                        onChange={(e) => {
                          const v = Number(e.target.value) || 2;
                          setRequiredYes(Math.max(2, Math.min(people, v)));
                        }}
                        className="input"
                        style={{ width: 120 }}
                      />
                      <span className="small">{t('of_n_people', { count: people })}</span>
                    </div>
                    <div className="small muted">
                      {t('tip_simple_majority', { majority: Math.ceil(people / 2), total: people })}
                    </div>
                  </label>
                ) : (
                  <div className="small" aria-live="polite">
                    {t('two_people_threshold')}
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        <div className="lobby__cta">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={preview}
            disabled={!cuisinesValid}
            title={!cuisinesValid ? "Selecciona al menos 1 cocina" : undefined}
          >
            {t('preview')}
          </button>
          <button
            type="submit"
            className="btn btn--primary"
            disabled={!cuisinesValid || (previewCount !== null ? (previewCount === 0 || !thresholdValid) : true)}
            title={
              !cuisinesValid
                ? t('select_one_cuisine')
                : (previewCount === 0
                    ? t('no_results')
                    : (!thresholdValid ? t('adjust_threshold') : undefined))
            }
          >
            {t('start_voting')}
          </button>
        </div>
      </form>
      <Toast
        open={toast.open}
        variant={toast.variant}
        duration={toast.duration}
        onClose={() => setToast((s) => ({ ...s, open: false }))}
      >
        {toast.msg}
      </Toast>
    </div>
  );
}
