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
import MapPicker from "../components/MapPicker";

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

  const [step, setStep] = useState(0);

  const [hostName, setHostName] = useState("");
  const [center, setCenter] = useState({ lat: 41.3879, lng: 2.16992 });
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
  }

  function togglePrice(n) {
    setPrice(ps => {
      const next = ps.includes(n) ? ps.filter(x => x !== n) : [...ps, n];
      return next;
    });
  }

  function canGoNext() {
    if (step === 0) return hostName.trim().length > 0;
    if (step === 1) return true;
    if (step === 2) return cuisinesValid;
    if (step === 3) return true;
    if (step === 4) return thresholdValid;
    if (step === 5) return previewCount !== null && previewCount > 0;
    return false;
  }

  async function handleNext() {
    if (step === 4) {
      await preview();
      setStep(5);
    } else if (step < 5) {
      setStep(step + 1);
    }
  }

  function handleBack() {
    if (step > 0) setStep(step - 1);
  }

  async function preview() {
    const params = new URLSearchParams();
    params.set("radiusKm", String(radiusKm));
    params.set("center", `${center.lat},${center.lng}`);
    if (selectedCuisines.length) params.set("cuisines", selectedCuisines.join(","));
    if (price.length) params.set("price", price.join(","));
    if (openNow) params.set("openNow", "true");
    if (minRating) params.set("minRating", String(minRating));

    try {
      const data = await api(`/api/restaurants?${params.toString()}`);
      const count = data?.count ?? (Array.isArray(data.items) ? data.items.length : 0);
      setPreviewCount(count);
      if (count === 0) {
        showToast("warn", t("no_results"), 3000);
      }
    } catch (e) {
      console.error("Preview filters failed:", e);
      setPreviewCount(null);
      showToast("warn", errorToMessage(e, t, PREVIEW_ERROR_KEYS));
    }
  }

  async function applyAndStart(e) {
    e.preventDefault();
    if (!cuisinesValid || !thresholdValid || !previewCount) return;

    const area = { radiusKm };
    const filters = { cuisines: selectedCuisines, price, openNow, minRating };
    const finalRequired = people <= 2 ? 2 : Math.max(2, Math.min(people, Number(requiredYes) || 2));
    const threshold = { type: "absolute", value: finalRequired, participants: Number(people) };

    try {
      const created = await api("/api/sessions", {
        method: "POST",
        body: JSON.stringify({ area, filters, threshold, center })
      });

      const joined = await api(`/api/sessions/${created.sessionId}/join`, {
        method: "POST",
        body: JSON.stringify({ name: hostName || "Host" })
      });

      setParticipant(created.sessionId, joined.participant, created.invitePath);
      hydrateFromJoin(joined);
      navigate(`/vote/${created.sessionId}`);
    } catch (e) {
      console.error("Create/join session failed:", e);
      showToast("warn", errorToMessage(e, t, CREATE_ERROR_KEYS));
    }
  }

  const steps = [
    { id: 0, title: t('ur_name'), icon: "user" },
    { id: 1, title: t('zone'), icon: "map-pin" },
    { id: 2, title: t('cuisine'), icon: "utensils" },
    { id: 3, title: t('filters'), icon: "sliders" },
    { id: 4, title: t('voters'), icon: "users" },
    { id: 5, title: t('preview'), icon: "eye" }
  ];

  const StepIcon = ({ icon, active, completed }) => {
    const icons = {
      "user": (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
      "map-pin": (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      ),
      "utensils": (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
          <path d="M7 2v20" />
          <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
        </svg>
      ),
      "sliders": (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="4" y1="21" x2="4" y2="14" />
          <line x1="4" y1="10" x2="4" y2="3" />
          <line x1="12" y1="21" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12" y2="3" />
          <line x1="20" y1="21" x2="20" y2="16" />
          <line x1="20" y1="12" x2="20" y2="3" />
          <line x1="1" y1="14" x2="7" y2="14" />
          <line x1="9" y1="8" x2="15" y2="8" />
          <line x1="17" y1="16" x2="23" y2="16" />
        </svg>
      ),
      "users": (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      "eye": (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )
    };

    const iconSvg = icons[icon];
    
    let bgColor, iconColor, shadow;
    if (active) {
      bgColor = "var(--accent)";
      iconColor = "white";
      shadow = "0 2px 8px var(--ring)";
    } else if (completed) {
      bgColor = "var(--accent)";
      iconColor = "white";
      shadow = "0 2px 8px var(--ring)";
    } else {
      bgColor = "#4a4a4a";
      iconColor = "#999";
      shadow = "none";
    }

    return (
      <div
        style={{
          position: "relative",
          width: 32,
          height: 32,
          isolation: "isolate"
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: -6,
            borderRadius: "50%",
            background: "var(--bg, #1a1a1a)",
            zIndex: 1
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: bgColor,
            border: "none",
            boxShadow: shadow,
            transition: "all 0.3s ease",
            zIndex: 2
          }}
        />

        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: iconColor,
            zIndex: 3
          }}
        >
          {iconSvg}
        </div>
      </div>
    );
  };

  return (
    <div className="wrap" style={{ overflow: "visible" }}>
      <Header />

      <form
        className="lobby-wizard"
        style={{ maxWidth: 700, margin: "12px auto", padding: "0 16px" }}
        onSubmit={applyAndStart}
      >
        <div className="lobby__header" style={{ textAlign: "center", marginBottom: 20, position: "relative" }}>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => navigate("/")}
            style={{ position: "absolute", left: 0, top: 0, padding: "6px 12px" }}
          >
            ← {t('home_button')}
          </button>
          <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>{t('create_session')}</h2>
          <div className="tiny muted">
            {t('step')} {step + 1} {t('of')} {steps.length}
          </div>
        </div>

        <div className="progress-bar" style={{ marginBottom: 30 }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 8,
            position: "relative"
          }}>
            <div style={{
              position: "absolute",
              top: "16px",
              left: 0,
              right: 0,
              height: 3,
              zIndex: 0,
              pointerEvents: "none"
            }}>
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background: "#e8e8e8",
                borderRadius: 2
              }} />
              
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                height: 3,
                background: "var(--accent)",
                width: `calc((100% / ${steps.length}) * (${step} + 0.5))`,
                transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                borderRadius: 2
              }} />
            </div>

            {steps.map((s, idx) => {
              const isActive = idx === step;
              const isCompleted = idx < step;

              return (
                <div
                  key={s.id}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    position: "relative",
                    zIndex: 1,
                    opacity: 1,
                    transition: "opacity 0.3s ease"
                  }}
                >
                  <StepIcon icon={s.icon} active={isActive} completed={isCompleted} />
                  <div
                    className="tiny"
                    style={{
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? "var(--accent)" : isCompleted ? "#333" : "#999",
                      textAlign: "center",
                      fontSize: 11,
                      lineHeight: 1.2,
                      maxWidth: 80,
                      transition: "all 0.3s ease"
                    }}
                  >
                    {s.title}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="step-content" style={{ minHeight: 320, marginBottom: 20 }}>
          {step === 0 && (
            <div className="step-panel" style={{ textAlign: "center", padding: "30px 0" }}>
              <h3 style={{ marginBottom: 16, fontSize: 18 }}>{t('ur_name')} (Host)</h3>
              <input
                id="host-name"
                className="input"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder={t('enter_name')}
                required
                autoFocus
                style={{ maxWidth: 320, margin: "0 auto", fontSize: 16, padding: 12 }}
              />
              <p className="tiny muted" style={{ marginTop: 12 }}>
                {t('host_name_hint')}
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="step-panel">
              <h3 style={{ marginBottom: 12, fontSize: 18 }}>{t('zone')}</h3>
              <p className="tiny muted" style={{ marginBottom: 12 }}>
                {t('select_location_radius')}
              </p>
  
              <MapPicker 
                center={center} 
                onCenterChange={setCenter}
                radiusKm={radiusKm}
              />

              <label htmlFor="zone-radius" style={{ display: "grid", gap: 4, marginBottom: 12 }}>
                <div className="small">{t('radius')}: <strong>{radiusKm.toFixed(1)} km</strong></div>
                <input
                  id="zone-radius"
                  type="range"
                  min={0.5}
                  max={5}
                  step={0.1}
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value))}
                  className="range"
                />
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="step-panel">
              <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 18 }}>{t('cuisine')}</h3>
                <div className="tiny">
                  <button type="button" onClick={() => setSelectedCuisines([...allCuisinesKeys])} className="link">
                    {t('select_all')}
                  </button>
                  <span> · </span>
                  <button type="button" onClick={() => setSelectedCuisines([])} className="link">
                    {t('clean')}
                  </button>
                </div>
              </div>
              <p className="tiny muted" style={{ marginBottom: 12 }}>
                {t('select_cuisine_types')}
              </p>
              <div className="chips" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 6 }}>
                {CUISINES.map(c => {
                  const active = selectedCuisines.includes(c.key);
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => toggleCuisine(c.key)}
                      className={`chip${active ? " chip--active" : ""}`}
                      aria-pressed={active}
                      style={{ fontSize: 13, padding: "6px 10px" }}
                    >
                      {t(c.key)}
                    </button>
                  );
                })}
              </div>
              {!cuisinesValid && (
                <div className="form-error" role="alert" style={{ marginTop: 12 }}>
                  {t('select_one_cuisine')}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="step-panel">
              <h3 style={{ marginBottom: 12, fontSize: 18 }}>{t('filters')}</h3>
              <p className="tiny muted" style={{ marginBottom: 16 }}>
                {t('optional_filters_refine')}
              </p>

              <section style={{ marginBottom: 20 }}>
                <div className="small" style={{ marginBottom: 6, fontWeight: 600 }}>{t('price')}</div>
                <div className="chips" style={{ gap: 6 }}>
                  {[1, 2, 3, 4].map(n => {
                    const active = price.includes(n);
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => togglePrice(n)}
                        className={`chip${active ? " chip--active" : ""}`}
                        aria-pressed={active}
                        style={{ fontSize: 14, padding: "6px 12px" }}
                      >
                        {"$".repeat(n)}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section style={{ marginBottom: 20 }}>
                <label htmlFor="open-now" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    id="open-now"
                    type="checkbox"
                    checked={openNow}
                    onChange={(e) => setOpenNow(e.target.checked)}
                  />
                  <span className="small">{t('open_now')}</span>
                </label>
              </section>

              <section>
                <label htmlFor="min-rating" style={{ display: "grid", gap: 4 }}>
                  <div className="small" style={{ fontWeight: 600 }}>
                    {t('minimum_rating')}: <strong>{minRating.toFixed(1)}★</strong>
                  </div>
                  <input
                    id="min-rating"
                    type="range"
                    min={0}
                    max={5}
                    step={0.1}
                    value={minRating}
                    onChange={(e) => setMinRating(Number(e.target.value))}
                    className="range"
                  />
                </label>
              </section>
            </div>
          )}

          {step === 4 && (
            <div className="step-panel" style={{ padding: "15px 0" }}>
              <h3 style={{ marginBottom: 12, fontSize: 18 }}>{t('voters')}</h3>
              <p className="tiny muted" style={{ marginBottom: 16 }}>
                {t('define_voters_threshold')}
              </p>

              <div style={{ display: "grid", gap: 20 }}>
                <label htmlFor="people" style={{ display: "grid", gap: 6 }}>
                  <div className="small" style={{ fontWeight: 600 }}>{t('voters_info')}</div>
                  <input
                    id="people"
                    type="number"
                    min={2}
                    max={50}
                    step={1}
                    value={people}
                    onChange={(e) => setPeople(Math.max(2, Math.min(50, Number(e.target.value) || 2)))}
                    className="input"
                    style={{ maxWidth: 140, fontSize: 16, padding: 10 }}
                  />
                </label>

                {people > 2 ? (
                  <label htmlFor="required-yes" style={{ display: "grid", gap: 6 }}>
                    <div className="small" style={{ fontWeight: 600 }}>{t('need_yes_from')}</div>
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
                        style={{ width: 100, fontSize: 16, padding: 10 }}
                      />
                      <span className="tiny">{t('of_n_people', { count: people })}</span>
                    </div>
                    <div className="tiny muted">
                      💡 {t('tip_simple_majority', { majority: Math.ceil(people / 2), total: people })}
                    </div>
                  </label>
                ) : (
                  <div className="tiny" style={{ padding: 10, background: "var(--cardSoft)", borderRadius: 6, border: "1px solid var(--border)" }}>
                    ℹ️ {t('two_people_threshold')}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="step-panel" style={{ textAlign: "center", padding: "10px 0" }}>
              {previewCount === null ? (
                <div style={{ padding: 10 }}>
                  <div className="spinner" style={{ margin: "0 auto" }}></div>
                  <p className="tiny muted" style={{ marginTop: 12 }}>{t('searching_restaurants')}</p>
                </div>
              ) : previewCount === 0 ? (
                <div style={{ padding: 30 }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>😕</div>
                  <p style={{ marginBottom: 6, fontSize: 15 }}>{t('no_restaurants_found')}</p>
                  <p className="tiny muted">{t('adjust_filters_or_radius')}</p>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => setStep(1)}
                    style={{ marginTop: 12, padding: "8px 16px" }}
                  >
                    {t('modify_criteria')}
                  </button>
                </div>
              ) : (
                <div style={{ padding: 30 }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                  <p style={{ fontSize: 20, marginBottom: 6 }}>
                    <strong>{previewCount}</strong> {t(previewCount === 1 ? 'restaurant_one' : 'restaurant_other')} {t(previewCount === 1 ? 'found_one' : 'found_other')}
                  </p>
                  <p className="tiny muted" style={{ marginBottom: 16 }}>
                    {t('with_selected_criteria')}
                  </p>
                  
                  <div className="summary-box" style={{ 
                    background: "var(--cardSoft)", 
                    padding: 16, 
                    borderRadius: 8, 
                    textAlign: "left", 
                    marginBottom: 16,
                    border: "1px solid var(--border)"
                  }}>
                    <div className="small" style={{ marginBottom: 10, fontWeight: 600 }}>{t('summary')}:</div>
                    <div className="tiny" style={{ display: "grid", gap: 6 }}>
                      <div>📍 {t('radius_km', { radius: radiusKm.toFixed(1) })}</div>
                      <div>🍽️ {selectedCuisines.length} {t(selectedCuisines.length === 1 ? 'cuisine_type_one' : 'cuisine_type_other')}</div>
                      {minRating > 0 && <div>⭐ {t('minimum_stars', { rating: minRating.toFixed(1) })}</div>}
                      {price.length > 0 && <div>💰 {t('price_label')}: {price.map(n => "$".repeat(n)).join(", ")}</div>}
                      {openNow && <div>🕐 {t('only_open_now')}</div>}
                      <div>👥 {t('voters_threshold', { voters: people, threshold: people <= 2 ? 2 : requiredYes })}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="step-nav" style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={handleBack}
            disabled={step === 0}
            style={{ visibility: step === 0 ? "hidden" : "visible", padding: "10px 20px" }}
          >
            ← {t('back')}
          </button>
          
          {step < 5 ? (
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleNext}
              disabled={!canGoNext()}
              style={{ padding: "10px 20px" }}
            >
              {step === 4 ? `${t('view_preview')} →` : `${t('next')} →`}
            </button>
          ) : (
            <button
              type="submit"
              className="btn btn--primary"
              disabled={!previewCount || previewCount === 0}
              style={{ fontSize: 15, padding: "10px 24px" }}
            >
              🚀 {t('start_voting')}
            </button>
          )}
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