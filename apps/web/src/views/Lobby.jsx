// src/views/Lobby.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useSession } from "../context/SessionContext";
import Toast from "../components/Toast";
import { CUISINES, DIETARY_FILTERS } from "../data/cuisines";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { setParticipant, rememberSession } from "../lib/participant";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import { errorToMessage } from "../lib/errorToMessage";
import { DEFAULT_ERROR_KEYS } from "../lib/errorKeys";
import MapPicker from "../components/MapPicker";
import Loader from "../components/Loader";

const KEYWORD_TO_CUISINE = {
  sushi: "japanese",
  ramen: "japanese",
  tempura: "japanese",
  yakitori: "japanese",
  udon: "japanese",
  sashimi: "japanese",
  teriyaki: "japanese",

  pizza: "italian",
  pasta: "italian",
  risotto: "italian",
  lasagna: "italian",
  lasaña: "italian",
  carbonara: "italian",
  ravioli: "italian",
  gnocchi: "italian",

  burger: "american",
  hamburger: "american",
  hamburguer: "american",
  "hot dog": "american",
  hotdog: "american",
  bbq: "american",
  barbacoa: "american",

  "dim sum": "chinese",
  wonton: "chinese",
  "chow mein": "chinese",

  curry: "indian",
  naan: "indian",
  tandoori: "indian",
  biryani: "indian",

  tacos: "mexican",
  taco: "mexican",
  burrito: "mexican",
  quesadilla: "mexican",
  nachos: "mexican",
  enchilada: "mexican",
  guacamole: "mexican",

  "pad thai": "thai",
  "tom yum": "thai",

  kimchi: "korean",
  bibimbap: "korean",
  bulgogi: "korean",

  paella: "spanish",
  tapas: "spanish",
  tortilla: "spanish",
  jamon: "spanish",
  jamón: "spanish",
};

const PREVIEW_ERROR_KEYS = {
  ...DEFAULT_ERROR_KEYS,
  notFound: "errors.preview_failed",
  generic: "errors.preview_failed",
};

const CREATE_ERROR_KEYS = {
  ...DEFAULT_ERROR_KEYS,
  notFound: "errors.cannot_create_session",
  badRequest: "errors.form_invalid",
  conflict: "errors.conflict_action",
  generic: "errors.cannot_create_session",
};

export default function Lobby() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hydrateFromJoin } = useSession();
  const allCuisinesKeys = useMemo(() => CUISINES.map((c) => c.key), []);

  const [step, setStep] = useState(0);

  const [hostName, setHostName] = useState("");
  const [sessionName, setSessionName] = useState("");
  const sessionNameInputRef = useRef(null);
  const hostNameInputRef = useRef(null);
  

  const [center, setCenter] = useState({ lat: 41.3879, lng: 2.16992 });
  const [radiusKm, setRadiusKm] = useState(2);

  const [selectedCuisines, setSelectedCuisines] = useState([]);
  const [customCuisine, setCustomCuisine] = useState("");
  const [customCuisines, setCustomCuisines] = useState([]);
  const [suggestions, setSuggestions] = useState([]);

  const [customFilter, setCustomFilter] = useState("");
  const [customFilters, setCustomFilters] = useState([]);
  const [selectedDietaryFilters, setSelectedDietaryFilters] = useState([]);

  const [customInputFocused, setCustomInputFocused] = useState(false);
  const [lastSuggestion, setLastSuggestion] = useState(null);

  const [price, setPrice] = useState([]);
  const [openNow, setOpenNow] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [people, setPeople] = useState(2);
  const [requiredYes, setRequiredYes] = useState(2);
  const [previewCount, setPreviewCount] = useState(null);

  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingStart, setLoadingStart] = useState(false);

  const inputAnchorRef = useRef(null);
  const dropdownRef = useRef(null);

  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });


  const [toast, setToast] = useState({
    open: false,
    variant: "warn",
    msg: "",
    duration: 5000,
    action: null,
  });
  const showToast = (variant, msg, duration = 5000, action = null) =>
    setToast({ open: true, variant, msg, duration, action });

  const steps = [
    { id: 0, title: t("ur_name"), icon: "user" },
    { id: 1, title: t("zone"), icon: "map-pin" },
    { id: 2, title: t("cuisine"), icon: "utensils" },
    { id: 3, title: t("filters"), icon: "sliders" },
    { id: 4, title: t("voters"), icon: "users" },
    { id: 5, title: t("preview"), icon: "eye" },
  ];

  const thresholdValid =
    people >= 2 &&
    (people === 2 ? true : requiredYes >= 2 && requiredYes <= people);
  const [showHint, setShowHint] = useState(false);

  const cuisinesValid = useMemo(
    () => selectedCuisines.length > 0 || customCuisines.length > 0,
    [selectedCuisines, customCuisines]
  );

  useEffect(() => {
    if (people <= 2) setRequiredYes(2);
    else if (requiredYes > people) setRequiredYes(people);
  }, [people, requiredYes]);

  useEffect(() => {
    if (!suggestions.length) return;
    const update = () => {
      const el = inputAnchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setDropdownPos({
        top: Math.round(r.bottom + 4),
        left: Math.round(r.left),
        width: Math.round(r.width),
      });
    };
    update();
    const onScroll = () => update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [suggestions]);

  useEffect(() => {
    if (!suggestions.length) return;
    const onDocClick = (e) => {
      const inAnchor = inputAnchorRef.current?.contains(e.target);
      const inDrop = dropdownRef.current?.contains(e.target);
      if (!inAnchor && !inDrop) setSuggestions([]);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [suggestions]);

  function toggleCuisine(key) {
    setSelectedCuisines((cs) => {
      const next = cs.includes(key)
        ? cs.filter((x) => x !== key)
        : [...cs, key];
      return next;
    });
  }

  function handleCustomInputChange(e) {
    const value = e.target.value;

    if (value.length > 40) return;
    const sanitized = value.replace(/[^a-záéíóúñ\s]/gi, "");

    setCustomCuisine(sanitized);
    setLastSuggestion(null);

    if (sanitized.trim().length >= 2) {
      const matches = CUISINES.filter(
        (c) =>
          t(c.key).toLowerCase().includes(sanitized.toLowerCase()) &&
          !selectedCuisines.includes(c.key) &&
          !customCuisines.includes(sanitized.trim().toLowerCase())
      ).slice(0, 5);
      setSuggestions(matches);
    } else {
      setSuggestions([]);
    }
  }

  function addCustomCuisine(term = customCuisine) {
    const cleaned = term.trim().toLowerCase();

    if (customCuisines.length >= 3) {
      showToast(
        "warn",
        t("custom_cuisine_max_limit"),
        3000
      );
      return;
    }

    if (cleaned.length < 2) {
      showToast(
        "warn",
        t("custom_cuisine_too_short"),
        3000
      );
      return;
    }

    if (customCuisines.includes(cleaned)) {
      showToast(
        "warn",
        t("custom_cuisine_duplicate"),
        3000
      );
      return;
    }

    const existingCuisine = CUISINES.find(
      (c) => t(c.key).toLowerCase() === cleaned
    );

    if (existingCuisine && !selectedCuisines.includes(existingCuisine.key)) {
      setSelectedCuisines((cs) => [...cs, existingCuisine.key]);
      showToast(
        "ok",
        t("cuisine_added_from_catalog"),
        2000
      );
      setCustomCuisine("");
      setSuggestions([]);
      setLastSuggestion(null);
      return;
    }

    const mappedCuisine = KEYWORD_TO_CUISINE[cleaned];

    if (
      mappedCuisine &&
      !selectedCuisines.includes(mappedCuisine) &&
      lastSuggestion !== cleaned
    ) {
      const cuisineName = t(mappedCuisine);
      showToast(
        "info",
        t("cuisine_suggestion_short", { cuisine: cuisineName }),
        5000,
        {
          label: t("add_as_custom"),
          onClick: () => {
            setCustomCuisines((prev) => [...prev, cleaned]);
            setCustomCuisine("");
            setSuggestions([]);
            setLastSuggestion(null);
          },
        }
      );
      setLastSuggestion(cleaned);
      return;
    }

    setCustomCuisines((prev) => [...prev, cleaned]);
    showToast(
      "ok",
      t("custom_cuisine_added"),
      2000
    );
    setCustomCuisine("");
    setSuggestions([]);
    setLastSuggestion(null);
  }

  function removeCustomCuisine(term) {
    setCustomCuisines((prev) => prev.filter((t) => t !== term));
  }

  function selectSuggestion(cuisine) {
    if (!selectedCuisines.includes(cuisine.key)) {
      setSelectedCuisines((cs) => [...cs, cuisine.key]);
    }
    setCustomCuisine("");
    setSuggestions([]);
  }

  function handleCustomKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();

      if (suggestions.length > 0) {
        selectSuggestion(suggestions[0]);
      } else if (customCuisine.trim()) {
        addCustomCuisine();
      }
    }
    if (e.key === "Escape") {
      setSuggestions([]);
    }
  }

  function togglePrice(n) {
    setPrice((ps) => {
      const next = ps.includes(n) ? ps.filter((x) => x !== n) : [...ps, n];
      return next;
    });
  }

  function canGoNext() {
    if (step === 0) return hostName.trim().length > 0 && sessionName.trim().length > 0;
    if (step === 1) return true;
    if (step === 2) return cuisinesValid;
    if (step === 3) return true;
    if (step === 4) return thresholdValid && people <= 20;
    if (step === 5) return previewCount !== null && previewCount > 0;
    return false;
  }

  function canGoToStep(targetStep) {
    if (targetStep < 0 || targetStep >= steps.length) return false;
    if (targetStep < step) return true;
    if (targetStep === step + 1) return canGoNext();
    return false;
  }

  function showMissingNameToast() {
    const missingSession = !sessionName.trim();
    const missingHost = !hostName.trim();

    if (missingSession) {
      showToast("warn", t("session_name_required"), 3000);
    } else if (missingHost) {
      showToast("warn", t("enter_name_required"), 3000);
    }
  }

  function handleStepClick(targetStep) {
    if (!canGoToStep(targetStep)) {
      if (targetStep > step + 1) {
        showToast("warn", t("complete_current_step_first"), 3000);
      } else if (targetStep === step + 1 && !canGoNext()) {
        if (step === 0) {
          showMissingNameToast();
        } else if (step === 2) {
          showToast("warn", t("select_one_cuisine"), 3000);
        } else if (step === 4) {
          showToast("warn", t("invalid_threshold"), 3000);
        }
      }
      return;
    }

    if (targetStep === step + 1 && step === 4) {
      preview();
    }
    setStep(targetStep);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      if (step === 0) {
        e.preventDefault();
        
        if (document.activeElement === sessionNameInputRef.current) {
          hostNameInputRef.current?.focus();
          return;
        }
        
        if (document.activeElement === hostNameInputRef.current && canGoNext()) {
          handleNext();
          return;
        }
        showMissingNameToast();
        return;
      }
      e.preventDefault();
      if (step < 5) {
        if (canGoNext()) {
          handleNext();
        } else {
          if (step === 2) {
            showToast("warn", t("select_one_cuisine"), 3000);
          } else if (step === 4) {
            showToast("warn", t("invalid_threshold"), 3000);
          }
        }
      } else if (step === 5 && previewCount && previewCount > 0) {
        const form = document.querySelector(".lobby-wizard");
        if (form) form.requestSubmit();
      }
    }
  }

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    step,
    hostName,
    sessionName,
    customCuisines,
    customFilters,
    cuisinesValid,
    selectedCuisines,
    selectedDietaryFilters,
    people,
    requiredYes,
    previewCount,
  ]);

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
    setLoadingPreview(true);
    const params = new URLSearchParams();
    params.set("radiusKm", String(radiusKm));
    params.set("center", `${center.lat},${center.lng}`);

    if (selectedCuisines.length)
      params.set("cuisines", selectedCuisines.join(","));
    if (customCuisines.length)
      params.set("customCuisines", customCuisines.join(","));
    if (selectedDietaryFilters.length)
      params.set("dietaryFilters", selectedDietaryFilters.join(","));
    if (customFilters.length)
      params.set("customFilters", customFilters.join(","));
    if (price.length) params.set("price", price.join(","));
    if (openNow) params.set("openNow", "true");
    if (minRating) params.set("minRating", String(minRating));

    try {
      const data = await api(`/api/restaurants?${params.toString()}`);
      const count =
        data?.count ?? (Array.isArray(data.items) ? data.items.length : 0);
      setPreviewCount(count);
      if (count === 0) {
        showToast("warn", t("no_results"), 3000);
      }
    } catch (e) {
      console.error("Preview filters failed:", e);
      setPreviewCount(null);
      showToast("warn", errorToMessage(e, t, PREVIEW_ERROR_KEYS));
    } finally {
      setLoadingPreview(false);
    }
  }

  async function applyAndStart(e) {
    e.preventDefault();
    setLoadingStart(true);
    
    if (!sessionName.trim()) {
      showToast("warn", t("session_name_required"));
      setStep(0);
      setLoadingStart(false);
      return;
    }
    
    if (!cuisinesValid || !thresholdValid || !previewCount) {
      setLoadingStart(false);
      return;
    } 

    const area = { radiusKm };
    const filters = {
      cuisines: selectedCuisines,
      customCuisines: customCuisines.length > 0 ? customCuisines : undefined,
      dietaryFilters: selectedDietaryFilters.length > 0 ? selectedDietaryFilters : undefined,
      customFilters: customFilters.length > 0 ? customFilters : undefined,
      price,
      openNow,
      minRating,
    };
    const finalRequired =
      people <= 2 ? 2 : Math.max(2, Math.min(people, Number(requiredYes) || 2));
    const threshold = {
      type: "absolute",
      value: finalRequired,
      participants: Number(people),
    };

    try {
      const created = await api("/api/sessions", {
        method: "POST",
        body: JSON.stringify({ area, filters, threshold, center, name: sessionName }),
        timeoutMs: 15000,
      });

      const joined = await api(`/api/sessions/${created.sessionId}/join`, {
        method: "POST",
        body: JSON.stringify({ name: hostName || "Host" }),
        timeoutMs: 10000,
      });

      setParticipant(created.sessionId, joined.participant, created.invitePath);
      hydrateFromJoin(joined);

      const nameToRemember = sessionName.trim();
      rememberSession(created.sessionId, created.invitePath, nameToRemember);

      navigate(`/vote/${created.sessionId}`);
    } catch (e) {
      console.error("Create/join session failed:", e);
      showToast("warn", errorToMessage(e, t, CREATE_ERROR_KEYS));
    } finally {
      setLoadingStart(false);
    }
  }

    /* 
      Icons from Lucide (ISC + MIT License)
      Copyright © Lucide Contributors.
      Portions copyright © 2013–2023 Cole Bemis (Feather Icons).
      Source: https://lucide.dev
    */
  const StepIcon = ({ icon, active, completed }) => {
    const icons = {
      user: (
        <svg
          className="step-icon__svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          width="16"
          height="16"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
      "map-pin": (
        <svg
          className="step-icon__svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          width="16"
          height="16"
        >
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      ),
      utensils: (
        <svg
          className="step-icon__svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          width="16"
          height="16"
        >
          <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
          <path d="M7 2v20" />
          <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
        </svg>
      ),
      sliders: (
        <svg
          className="step-icon__svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          width="16"
          height="16"
        >
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
      users: (
        <svg
          className="step-icon__svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          width="16"
          height="16"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      eye: (
        <svg
          className="step-icon__svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          width="16"
          height="16"
        >
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ),
    };

    const iconSvg = icons[icon];
    return (
      <div
        className={`step-icon ${active ? "step-icon--active" : ""} ${
          completed ? "step-icon--completed" : ""
        }`}
        aria-hidden="true"
      >
        <div className="step-icon__halo" />
        <div className="step-icon__bg" />
        <div className="step-icon__fg">
          {completed ? (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden="true"
            >
              <path
                d="M20 6L9 17l-5-5"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            iconSvg
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className="wrap"
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Header />
      <section className="lobby__panel">
        <form
          className="lobby-wizard"
          style={{
            flex: 1,
            maxWidth: "min(900px, 100%)",
            width: "100%",
            margin: "0 auto",
            padding: "0 clamp(16px, 3vw, 24px)",
            overflow: "auto",
            minHeight: 0,
          }}
          onSubmit={applyAndStart}
        >
          <div
            className="lobby__header"
            style={{
              textAlign: "center",
              marginBottom: 20,
              position: "relative",
            }}
          >
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => navigate("/")}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                padding: "12px 12px",
              }}
            >
              ← {t("home_button")}
            </button>
            <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>
              {t("create_session")} 
            </h2>
            <div className="tiny muted">
              {steps[step].title} - {t("step")} {step + 1} {t("of")} {steps.length}
            </div>
          </div>

          <div className="progress-bar" style={{ marginBottom: 20 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 8,
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "16px",
                  left: 0,
                  right: 0,
                  height: 3,
                  zIndex: 0,
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: "#e8e8e8",
                    borderRadius: 2,
                  }}
                />

                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    height: 3,
                    background: "var(--accent)",
                    width: `calc((100% / ${steps.length}) * (${step} + 0.5))`,
                    transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    borderRadius: 2,
                  }}
                />
              </div>

              {steps.map((s, idx) => {
                const isActive = idx === step;
                const isCompleted = idx < step;
                const isClickable = canGoToStep(idx);
                const isNextStep = idx === step + 1;

                return (
                  <div
                    key={s.id}
                    onClick={() => isClickable && handleStepClick(idx)}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 6,
                      position: "relative",
                      zIndex: 1,
                      cursor: isClickable
                        ? "pointer"
                        : isNextStep
                        ? "not-allowed"
                        : "default",
                      opacity: 1,
                      transition: "opacity 0.3s ease",
                    }}
                    title={
                      isClickable
                        ? undefined
                        : isNextStep
                        ? t("complete_current_step_first")
                        : undefined
                    }
                  >
                    <StepIcon
                      icon={s.icon}
                      active={isActive}
                      completed={isCompleted}
                    />
                    <div
                      className="tiny"
                      style={{
                        fontWeight: isActive ? 600 : 400,
                        color: isActive ? "var(--accent)" : "var(--text-muted)",
                        textAlign: "center",
                        fontSize: 11,
                        lineHeight: 1.2,
                        maxWidth: 80,
                        transition: "all 0.3s ease",
                      }}
                    >
                      {s.title}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            className="step-content"
            style={{ minHeight: 320, marginBottom: 20 }}
          >
            {loadingStart ? (
              <div style={{ 
                minHeight: 320, 
                display: "flex", 
                flexDirection: "column", 
                alignItems: "center", 
                justifyContent: "center",
                gap: 20,
                padding: "60px 20px"
              }}>
                <Loader size={80} />
                <p className="small" style={{ margin: 0, color: "var(--muted)", fontWeight: 500 }}>
                  {t("starting_session")}
                </p>
              </div>
            ) : step === 0 && (
              <div
                className="step-panel"
                style={{ textAlign: "center", padding: "30px 0" }}
              >
                <div
                  style={{
                    maxWidth: 360,
                    margin: "0 auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                    textAlign: "left",
                  }}
                >
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>
                      {t("session_name")}
                    </span>
                    <input
                      ref={sessionNameInputRef}
                      className="input"
                      value={sessionName}
                      onChange={e => setSessionName(e.target.value)}
                      placeholder={t("session_name_placeholder")}
                      required
                      autoFocus
                      style={{
                        width: "100%",
                        fontSize: 16,
                        padding: 12,
                      }}
                    />
                  </label>

                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>
                      {t("ur_name")}
                    </span>
                    <input
                      ref={hostNameInputRef}
                      id="host-name"
                      className="input"
                      value={hostName}
                      onChange={(e) => setHostName(e.target.value)}
                      placeholder={t("enter_name")}
                      required
                      style={{
                        width: "100%",
                        fontSize: 16,
                        padding: 12,
                      }}
                    />
                    <p className="tiny muted" style={{ margin: 0 }}>
                      {t("host_name_hint")}
                    </p>
                  </label>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="step-panel">
                <p className="tiny muted" style={{ marginBottom: 10 }}>
                  {t("select_location_radius")}
                </p>

                <MapPicker
                  center={center}
                  onCenterChange={setCenter}
                  radiusKm={radiusKm}
                />

                <label
                  htmlFor="zone-radius"
                  style={{ display: "grid", gap: 4, marginBottom: 12 }}
                >
                  <div className="small">
                    {t("radius")}: <strong>{radiusKm.toFixed(1)} km</strong>
                  </div>
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
                <div
                  className="row"
                  style={{
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <div className="tiny">
                    <button
                      type="button"
                      onClick={() => setSelectedCuisines([...allCuisinesKeys])}
                      className="link"
                    >
                      {t("select_all")}
                    </button>
                    <span> · </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCuisines([]);
                        setCustomCuisines([]);
                        setCustomCuisine("");
                        setSuggestions([]);
                      }}
                      className="link"
                    >
                      {t("clean")}
                    </button>
                  </div>
                </div>
                <p className="tiny muted" style={{ marginBottom: 12 }}>
                  {t("select_cuisine_types")}
                </p>

                <div
                  className="chips"
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(180px, 1fr))",
                    gap: 10,
                    alignItems: "stretch",
                  }}
                >
                  {CUISINES.map((c) => {
                    const active = selectedCuisines.includes(c.key);
                    return (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => toggleCuisine(c.key)}
                        className={`chip${active ? " chip--active" : ""}`}
                        aria-pressed={active}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          fontSize: 13,
                          padding: "8px 10px",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span
                          aria-hidden
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            border: `2px solid var(--accent)`,
                            background: active
                              ? "var(--accent)"
                              : "transparent",
                            transition: "all .2s ease",
                          }}
                        />
                        {t(c.key)}
                      </button>
                    );
                  })}
                </div>

                <div style={{ marginTop: 16, position: "relative" }}>
                  <div
                    className="small"
                    style={{ marginBottom: 8, fontWeight: 600 }}
                  >
                    {t("custom_cuisines_section") ||
                      "O añade tipos personalizados"}{" "}
                    ({customCuisines.length}/3)
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      ref={inputAnchorRef}
                      style={{
                        position: "relative",
                        flex: "0 1 auto",
                        minWidth: 240,
                        maxWidth: 320,
                      }}
                    >
                      <input
                        type="text"
                        className="input"
                        value={customCuisine}
                        onChange={handleCustomInputChange}
                        onKeyDown={handleCustomKeyDown}
                        onFocus={() => setCustomInputFocused(true)}
                        onBlur={() => setCustomInputFocused(false)}
                        placeholder={
                          t("custom_cuisine_placeholder")
                        }
                        disabled={customCuisines.length >= 3}
                        style={{
                          fontSize: 13,
                          padding: "8px 10px",
                          opacity: customCuisines.length >= 3 ? 0.5 : 1,
                        }}
                        maxLength={40}
                      />
                      {suggestions.length > 0 &&
                        inputAnchorRef.current &&
                        createPortal(
                          <div
                            ref={dropdownRef}
                            className="autocomplete-dropdown"
                            style={{
                              position: "fixed",
                              top: dropdownPos.top,
                              left: dropdownPos.left,
                              width: dropdownPos.width,
                              background: "var(--card)",
                              border: "1px solid var(--border)",
                              borderRadius: 8,
                              boxShadow: "0 8px 20px rgba(0,0,0,0.18)",
                              zIndex: 9999,
                              maxHeight: 280,
                              overflowY: "auto",
                            }}
                          >
                            {suggestions.map((c) => (
                              <button
                                key={c.key}
                                type="button"
                                onClick={() => selectSuggestion(c)}
                                className="autocomplete-item"
                                style={{
                                  width: "100%",
                                  textAlign: "left",
                                  padding: "8px 10px",
                                  background: "transparent",
                                  border: "none",
                                  cursor: "pointer",
                                  color: "var(--text)",
                                  fontSize: 13,
                                  transition: "background 0.2s ease",
                                }}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.background =
                                    "var(--cardSoft)")
                                }
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.background =
                                    "transparent")
                                }
                              >
                                {t(c.key)}
                              </button>
                            ))}
                          </div>,
                          document.body
                        )}
                    </div>

                    {customCuisines.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 6,
                          flex: 1,
                          alignItems: "center",
                        }}
                      >
                        {customCuisines.map((term) => (
                          <div
                            key={term}
                            className="chip chip--custom"
                            style={{
                              fontSize: 12,
                              padding: "6px 10px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              background: "var(--accent)",
                              color: "white",
                              borderRadius: "999px",
                              boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                            }}
                          >
                            <span>{term}</span>
                            <button
                              type="button"
                              onClick={() => removeCustomCuisine(term)}
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "white",
                                cursor: "pointer",
                                padding: 0,
                                fontSize: 16,
                                lineHeight: 1,
                                opacity: 0.9,
                              }}
                              aria-label={t("remove")}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {customCuisines.length === 0 && customInputFocused && (
                    <div className="tiny muted" style={{ marginTop: 6, fontSize: 11 }}>
                      {t("custom_cuisine_hint")}
                    </div>
                  )}
                </div>
                {!cuisinesValid && customCuisines.length === 0 && (
                  <div
                    className="form-error"
                    role="alert"
                    style={{ marginTop: 12 }}
                  >
                    {t("select_one_cuisine")}
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="step-panel">
                <p className="tiny muted" style={{ marginBottom: 16 }}>
                  {t("optional_filters_refine")}
                </p>

                <div style={{ display: "grid", gap: 16 }}>
                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      flexWrap: "wrap",
                      alignItems: "flex-start",
                    }}
                  >
                    <section style={{ flex: "1 1 auto", minWidth: 200 }}>
                      <div
                        className="small"
                        style={{ marginBottom: 8, fontWeight: 600 }}
                      >
                        {t("price")}
                      </div>
                      <div
                        className="chips"
                        style={{ gap: 6, display: "flex", flexWrap: "wrap" }}
                      >
                        {[1, 2, 3, 4].map((n) => {
                          const active = price.includes(n);
                          return (
                            <button
                              key={n}
                              type="button"
                              onClick={() => togglePrice(n)}
                              className={`chip${active ? " chip--active" : ""}`}
                              aria-pressed={active}
                              style={{ fontSize: 13, padding: "6px 14px" }}
                            >
                              {"$".repeat(n)}
                            </button>
                          );
                        })}
                      </div>
                    </section>

                    <section style={{ flex: "0 0 auto" }}>
                      <div
                        className="small"
                        style={{ marginBottom: 8, fontWeight: 600 }}
                      >
                        {t("open_now")}
                      </div>
                      <label
                        htmlFor="open-now"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          cursor: "pointer",
                          position: "relative",
                        }}
                      >
                        <input
                          id="open-now"
                          type="checkbox"
                          checked={openNow}
                          onChange={(e) => setOpenNow(e.target.checked)}
                          style={{ display: "none" }}
                        />
                        <div
                          style={{
                            width: 48,
                            height: 26,
                            borderRadius: 13,
                            background: openNow ? "var(--accent)" : "#ccc",
                            position: "relative",
                            transition: "background 0.3s ease",
                            boxShadow: "inset 0 1px 3px rgba(0,0,0,0.2)",
                          }}
                        >
                          <div
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: "50%",
                              background: "white",
                              position: "absolute",
                              top: 3,
                              left: openNow ? 25 : 3,
                              transition: "left 0.3s ease",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                            }}
                          />
                        </div>
                      </label>
                    </section>
                  </div>
                  <section>
                    <label
                      htmlFor="min-rating"
                      style={{ display: "grid", gap: 6 }}
                    >
                      <div className="small" style={{ fontWeight: 600 }}>
                        {t("minimum_rating")}:{" "}
                        <strong
                          style={{ fontSize: 15, color: "var(--accent)" }}
                        >
                          {minRating.toFixed(1)}★
                        </strong>
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
                      <div
                        className="tiny muted"
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span>0★</span>
                        <span>5★</span>
                      </div>
                    </label>
                  </section>
                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                    }}
                  >
                    <section style={{ flex: "1 1 300px", minWidth: 240 }}>
                      <div
                        className="small"
                        style={{ marginBottom: 8, fontWeight: 600 }}
                      >
                        {t("dietary_filters")}
                      </div>
                      <div
                        className="chips"
                        style={{ gap: 6, display: "flex", flexWrap: "wrap" }}
                      >
                        {DIETARY_FILTERS.map((f) => {
                          const active = selectedDietaryFilters.includes(f.key);
                          return (
                            <button
                              key={f.key}
                              type="button"
                              onClick={() => {
                                setSelectedDietaryFilters((prev) =>
                                  prev.includes(f.key)
                                    ? prev.filter((x) => x !== f.key)
                                    : [...prev, f.key]
                                );
                              }}
                              className={`chip${active ? " chip--active" : ""}`}
                              aria-pressed={active}
                              style={{ fontSize: 13, padding: "6px 12px" }}
                            >
                              <span
                                aria-hidden
                                style={{
                                  width: 9,
                                  height: 9,
                                  borderRadius: "50%",
                                  border: `2px solid var(--accent)`,
                                  background: active
                                    ? "var(--accent)"
                                    : "transparent",
                                  transition: "all .2s ease",
                                  display: "inline-block",
                                  marginRight: 5,
                                }}
                              />
                              {t(f.key)}
                            </button>
                          );
                        })}
                      </div>
                    </section>
                    <section style={{ flex: "1 1 300px", minWidth: 240 }}>
                      <div
                        className="small"
                        style={{ marginBottom: 6, fontWeight: 600, fontSize: 11 }}
                      >
                        {t("custom_filters_section") ||
                          "Filtros personalizados"}{" "}
                        ({customFilters.length}/3)
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "flex-start",
                          flexWrap: "wrap",
                        }}
                      >
                        <input
                          type="text"
                          className="input"
                          value={customFilter}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val.length <= 40) {
                              setCustomFilter(
                                val.replace(/[^a-záéíóúñ\s]/gi, "")
                              );
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              e.stopPropagation();
                              const cleaned = customFilter.trim().toLowerCase();
                              if (
                                cleaned.length >= 2 &&
                                customFilters.length < 3 &&
                                !customFilters.includes(cleaned)
                              ) {
                                setCustomFilters((prev) => [...prev, cleaned]);
                                setCustomFilter("");
                                showToast(
                                  "ok",
                                  t("custom_filter_added"),
                                  2000
                                );
                              } else if (customFilters.length >= 3) {
                                showToast(
                                  "warn",
                                  t("custom_filter_max_limit"),
                                  3000
                                );
                              } else if (customFilters.includes(cleaned)) {
                                showToast(
                                  "warn",
                                  t("custom_filter_duplicate"),
                                  3000
                                );
                              }
                            }
                          }}
                          placeholder={
                            t("custom_filter_placeholder")
                          }
                          disabled={customFilters.length >= 3}
                          style={{
                            fontSize: 13,
                            padding: "7px 10px",
                            opacity: customFilters.length >= 3 ? 0.5 : 1,
                            flex: "0 1 auto",
                            minWidth: 200,
                            maxWidth: 280,
                          }}
                          maxLength={40}
                        />

                        {customFilters.length > 0 && (
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 6,
                              flex: 1,
                              alignItems: "center",
                            }}
                          >
                            {customFilters.map((term) => (
                              <div
                                key={term}
                                className="chip chip--custom"
                                style={{
                                  fontSize: 12,
                                  padding: "5px 9px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                  background: "var(--accent)",
                                  color: "white",
                                  borderRadius: "999px",
                                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                                }}
                              >
                                <span>{term}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCustomFilters((prev) =>
                                      prev.filter((t) => t !== term)
                                    )
                                  }
                                  style={{
                                    background: "transparent",
                                    border: "none",
                                    color: "white",
                                    cursor: "pointer",
                                    padding: 0,
                                    fontSize: 15,
                                    lineHeight: 1,
                                    opacity: 0.9,
                                  }}
                                  aria-label={t("remove")}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <p
                        className="tiny muted"
                        style={{ marginTop: 8, color: "#f59e0b", fontSize: 11 }}
                      >
                        ⚠️{" "}
                        {t("custom_filters_warning")}
                      </p>
                      {customFilters.length === 0 && (
                        <div className="tiny muted" style={{ marginTop: 5, fontSize: 11 }}>
                          {t("custom_filter_hint")}
                        </div>
                      )}
                    </section>
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="step-panel">
                <p className="tiny muted" style={{ marginBottom: 24 }}>
                  {t("define_voters_threshold")}
                </p>

                <div style={{ display: "grid", gap: 28 }}>
                  <label
                    htmlFor="people"
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <div>
                      <div
                        className="small"
                        style={{ fontWeight: 600, marginBottom: 4 }}
                      >
                        {t("voters_info")}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <input
                          id="people"
                          type="number"
                          min={2}
                          max={20}
                          step={1}
                          value={people}
                          onChange={(e) => setPeople(Number(e.target.value))}
                          className="input"
                          style={{
                            fontSize: 16,
                            padding: "10px 12px",
                            textAlign: "center",
                            maxWidth: 120,
                          }}
                        />
                        {people > 20 && (
                          <div
                            className="form-error"
                            role="alert"
                            style={{
                              fontSize: 13,
                              marginLeft: 4,
                            }}
                          >
                            {t("max_participants_error")}
                          </div>
                        )}
                      </div>
                    </div>
                  </label>

                  {people > 2 && (
                    <label
                      htmlFor="required-yes"
                      style={{ display: "grid", gap: 10 }}
                    >
                      <div className="small" style={{ fontWeight: 600 }}>
                        {t("need_yes_from")}:{" "}
                        <strong
                          style={{ fontSize: 18, color: "var(--accent)" }}
                        >
                          {requiredYes}
                        </strong>{" "}
                        {t("of_n_people", { count: people })}
                      </div>
                      <input
                        id="required-yes"
                        type="range"
                        min={2}
                        max={people}
                        step={1}
                        value={requiredYes}
                        onChange={(e) => setRequiredYes(Number(e.target.value))}
                        className="range"
                      />
                      <div
                        className="tiny muted"
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span>2</span>
                        <span>{people}</span>
                      </div>
                      <div
                        className="tiny"
                        style={{
                          padding: 10,
                          background: "var(--cardSoft)",
                          borderRadius: 6,
                          border: "1px solid var(--border)",
                          marginTop: 6,
                        }}
                      >
                        {t("tip_simple_majority", {
                          majority: Math.ceil(people / 2),
                          total: people,
                        })}
                      </div>
                    </label>
                  )}

                  {people === 2 && (
                    <div
                      className="tiny"
                      style={{
                        padding: 12,
                        background: "var(--cardSoft)",
                        borderRadius: 6,
                        border: "1px solid var(--border)",
                      }}
                    >
                      {t("two_people_threshold")}
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="step-panel" style={{ textAlign: "center", minHeight: 320, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {loadingPreview ? (
                  <div style={{ 
                    padding: "60px 20px", 
                    display: "flex", 
                    flexDirection: "column", 
                    alignItems: "center", 
                    justifyContent: "center",
                    gap: 20,
                    width: "100%"
                  }}>
                    <Loader size={80} />
                    <p className="small" style={{ margin: 0, color: "var(--muted)", fontWeight: 500 }}>
                      {t("searching_restaurants")}
                    </p>
                  </div>
                ) : previewCount === 0 ? (
                  <div style={{ padding: 5 }}>
                    <p style={{ marginBottom: 6, fontSize: 24 }}>
                      {t("no_restaurants_found")}
                    </p>
                    <p className="tiny muted">
                      {t("adjust_filters_or_radius")}
                    </p>
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => setStep(1)}
                      style={{ marginTop: 12, padding: "8px 16px" }}
                    >
                      {t("modify_criteria")}
                    </button>
                  </div>
                ) : (
                  <div style={{ padding: 5 }}>
                    <p style={{ fontSize: 20, marginBottom: 10 }}>
                      <strong>{previewCount}</strong>{" "}
                      {t(
                        previewCount === 1
                          ? "restaurant_one"
                          : "restaurant_other"
                      )}{" "}
                      {t(previewCount === 1 ? "found_one" : "found_other")}
                    </p>
                    <p className="tiny muted" style={{ marginBottom: 16 }}>
                      {t("with_selected_criteria")}
                    </p>

                    <div
                      className="summary-box"
                      style={{
                        background: "var(--cardSoft)",
                        padding: 16,
                        borderRadius: 8,
                        textAlign: "left",
                        marginBottom: 16,
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div
                        className="small"
                        style={{ marginBottom: 10, fontWeight: 600 }}
                      >
                        {t("summary")}:
                      </div>
                      <div className="tiny" style={{ display: "grid", gap: 6 }}>
                        <div>
                          📍 {t("radius_km", { radius: radiusKm.toFixed(1) })}
                        </div>
                        <div>
                          🍽️ {selectedCuisines.length + customCuisines.length}{" "}
                          {t(
                            selectedCuisines.length + customCuisines.length ===
                              1
                              ? "cuisine_type_one"
                              : "cuisine_type_other"
                          )}
                        </div>
                        {selectedDietaryFilters.length > 0 && (
                          <div>
                            🥗{" "}
                            {selectedDietaryFilters.map((k) => t(k)).join(", ")}
                          </div>
                        )}
                        {customFilters.length > 0 && (
                          <div>🔍 {customFilters.join(", ")}</div>
                        )}
                        {minRating > 0 && (
                          <div>
                            ⭐{" "}
                            {t("minimum_stars", {
                              rating: minRating.toFixed(1),
                            })}
                          </div>
                        )}
                        {price.length > 0 && (
                          <div>
                            💰 {t("price_label")}:{" "}
                            {price.map((n) => "$".repeat(n)).join(", ")}
                          </div>
                        )}
                        {openNow && <div>🕐 {t("only_open_now")}</div>}
                        <div>
                          👥{" "}
                          {t("voters_threshold", {
                            voters: people,
                            threshold: people <= 2 ? 2 : requiredYes,
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </form>
      </section>

      <div
        className="step-nav"
        style={{
          display: "flex",
          gap: 10,
          justifyContent: "space-between",
          paddingTop: "10px",
          background: "transparent",
        }}
      >
        <button
          type="button"
          className="btn btn--ghost"
          onClick={handleBack}
          disabled={step === 0}
          style={{
            visibility: step === 0 ? "hidden" : "visible",
            padding: "10px 20px",
            height: "40px",
          }}
        >
          ← {t("back")}
        </button>

        {step < 5 ? (
          <div style={{ position: "relative", display: "inline-block" }}>
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleNext}
              disabled={!canGoNext() || loadingPreview}
              style={{ padding: "10px 20px" }}
              onMouseEnter={() => setShowHint(true)}
              onMouseLeave={() => setShowHint(false)}
            >
              {step === 4 ? `${t("view_preview")} →` : `${t("next")} →`}
            </button>
            {showHint && (
              <span
                style={{
                  position: "absolute",
                  bottom: "100%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  marginBottom: 8,
                  background: "var(--ctrl-bg)",
                  color: "var(--fg)",
                  padding: "6px 12px",
                  borderRadius: 8,
                  fontSize: 12,
                  boxShadow: "0 2px 8px rgba(0,0,0,.15)",
                  whiteSpace: "nowrap",
                  zIndex: 10,
                }}
              >
                {t("press_enter")}
              </span>
            )}
          </div>
        ) : (
          <div style={{ position: "relative", display: "inline-block" }}>
            <button
              type="button"
              className="btn btn--primary"
              disabled={!previewCount || previewCount === 0 || loadingStart}
              onClick={applyAndStart}
              style={{ 
                fontSize: 15, 
                padding: "10px 24px"
              }}
              onMouseEnter={() => setShowHint(true)}
              onMouseLeave={() => setShowHint(false)}
            >
              {t("start_voting")}
            </button>
            {previewCount > 0 && showHint && (
              <span
                style={{
                  position: "absolute",
                  bottom: "100%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  marginBottom: 8,
                  background: "var(--ctrl-bg)",
                  color: "var(--fg)",
                  padding: "6px 12px",
                  borderRadius: 8,
                  fontSize: 12,
                  boxShadow: "0 2px 8px rgba(0,0,0,.15)",
                  whiteSpace: "nowrap",
                  zIndex: 10,
                }}
              >
                {t("press_enter")}
              </span>
            )}
          </div>
        )}
      </div>

      <Footer />

      <Toast
        open={toast.open}
        variant={toast.variant}
        duration={toast.duration}
        action={toast.action}
        onClose={() => setToast((s) => ({ ...s, open: false }))}
      >
        {toast.msg}
      </Toast>
    </div>
  );
}
