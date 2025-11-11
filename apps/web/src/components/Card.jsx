// apps/web/src/components/Card.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";

const THRESHOLD = 120;
const EXIT_X = 1000;
const TILT_MS = 140;
const LEAVE_MS = 220;
const PRE_TILT_FACTOR = 0.9;

const GENERIC_TYPES = ["restaurant", "food", "point_of_interest", "establishment"];

function formatLabel(key, t) {
  const cuisineKey = `cuisines.${key}`;
  const typeKey = `types.${key}`;
  
  if (t(cuisineKey) !== cuisineKey) return t(cuisineKey);
  if (t(typeKey) !== typeKey) return t(typeKey);
  
  return key.replace(/_/g, " ");
}

export default function Card({ r, onNo, onYes, keySwipe, onKeyHandled }) {
  const { t } = useTranslation();
  const ref = useRef(null);
  const [drag, setDrag] = useState({
    dx: 0,
    dy: 0,
    active: false,
    startX: 0,
    startY: 0,
  });
  const [leaving, setLeaving] = useState(null);
  const [reduced, setReduced] = useState(false);
  const transitionValue = reduced
    ? "none"
    : drag.active
    ? "none"
    : "transform .25s ease, opacity .25s ease";

  const hasVotedRef = useRef(false);

  console.log("🔍 DEBUG Card.jsx:", {
    restaurantId: r?.id,
    hasPhotos: !!r?.photos,
    photosLength: r?.photos?.length,
    firstPhotoURL: r?.photos?.[0],
    imgField: r?.img,
    fullRestaurant: r,
  });

  const photos = useMemo(() => {
    if (!r?.photos || r.photos.length === 0) {
      return [`https://via.placeholder.com/480x360?text=${encodeURIComponent(t("error.image_placeholder"))}`];
    }

    return r.photos.map((url) =>
      url.startsWith("https://places.googleapis.com")
        ? `http://localhost:4000/api/photos/proxy?url=${encodeURIComponent(
            url
          )}`
        : url
    );
  }, [r?.photos, t]);

  const [photoIdx, setPhotoIdx] = useState(0);
  const currentImg = photos[photoIdx];
  const name = r?.name || "";
  const cuisines = r?.cuisine || r?.cuisines || [];
  const price = typeof r?.price === "number" ? r.price : undefined;
  const rating = typeof r?.rating === "number" ? r.rating : undefined;
  const userRatingsTotal =
    typeof r?.userRatingsTotal === "number" ? r.userRatingsTotal : undefined;
  const openNow = r?.openNow === true;
  const distanceKm = typeof r?.distanceKm === "number" ? r.distanceKm : null;
  const businessStatus = r?.businessStatus;
  const types = Array.isArray(r?.types) ? r.types : [];
  const vicinity = r?.vicinity;
  const priceSymbols =
    typeof price === "number" && price > 0
      ? "€".repeat(Math.min(price, 4))
      : "";
  const distanceText = typeof distanceKm === "number" ? `${distanceKm.toFixed(1)} ${t("km")}` : "";
  const ratingText =
    typeof rating === "number"
      ? `⭐ ${rating.toFixed(1)}${userRatingsTotal ? ` (${userRatingsTotal})` : ""}`
      : "";

  const cuisineLabels = (Array.isArray(cuisines) ? cuisines : [])
    .filter((c) => !GENERIC_TYPES.includes(String(c)))
    .map((c) => formatLabel(c, t))
    .slice(0, 3);

  const fallbackTypeLabels = !cuisineLabels.length
    ? types
        .filter((type) => !["point_of_interest", "establishment"].includes(type))
        .filter((type) => !GENERIC_TYPES.includes(String(type)))
        .slice(0, 3)
        .map((type) => formatLabel(type, t))
    : [];

  const statusBadge =
    businessStatus === "CLOSED_PERMANENTLY"
      ? {
          label: t("closed_permanently", "Cerrado permanentemente"),
          className: "pill pill--red",
        }
      : businessStatus === "CLOSED_TEMPORARILY"
      ? {
          label: t("closed_temporarily", "Cerrado temporalmente"),
          className: "pill pill--yellow",
        }
      : openNow
      ? { label: t("open"), className: "pill pill--green" }
      : null;


      console.log('🔍 Restaurant data:', { 
  name: r?.name, 
  price: r?.price, 
  rating: r?.rating,
  userRatingsTotal: r?.userRatingsTotal 
});

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    if (mq.addEventListener) mq.addEventListener("change", update);
    else mq.addListener(update);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", update);
      else mq.removeListener(update);
    };
  }, []);

  useEffect(() => {
    setDrag({ dx: 0, dy: 0, active: false, startX: 0, startY: 0 });
    setLeaving(null);
    hasVotedRef.current = false;
    setPhotoIdx(0);
  }, [r?.id]);

  useEffect(() => {
    if (!keySwipe) return;
    if (leaving) return;

    const dir = keySwipe === "right" ? "right" : "left";

    if (reduced) {
      setLeaving(dir);
      setTimeout(() => {
        if (dir === "right") onYes?.();
        else onNo?.();
        onKeyHandled?.();
      }, 0);
      return;
    }

    setDrag((prev) => ({ ...prev, active: false }));

    requestAnimationFrame(() => {
      setDrag((prev) => ({
        ...prev,
        dx:
          dir === "right"
            ? THRESHOLD * PRE_TILT_FACTOR
            : -THRESHOLD * PRE_TILT_FACTOR,
      }));
    });

    const tiltTimer = setTimeout(() => {
      setLeaving(dir);
      const leaveTimer = setTimeout(() => {
        if (dir === "right") onYes?.();
        else onNo?.();
        onKeyHandled?.();
      }, LEAVE_MS);
      return () => clearTimeout(leaveTimer);
    }, TILT_MS);

    return () => clearTimeout(tiltTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keySwipe]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onPointerStart = (e) => {
      if (e.button === 2) return;
      if (hasVotedRef.current || leaving) return;
      if (e.target.tagName === 'BUTTON') return;
      el.setPointerCapture?.(e.pointerId);
      setDrag({
        dx: 0,
        dy: 0,
        active: true,
        startX: e.clientX,
        startY: e.clientY,
      });
    };

    const onPointerMove = (e) => {
      setDrag((prev) => {
        if (!prev.active) return prev;
        const dx = e.clientX - prev.startX;
        const dy = e.clientY - prev.startY;
        return { ...prev, dx, dy };
      });
    };

    const onPointerEnd = (e) => {
      el.releasePointerCapture?.(e.pointerId);
      setDrag((prev) => {
        if (hasVotedRef.current) return prev;
        if (!prev.active) return prev;
        const { dx } = prev;

        if (dx > THRESHOLD) {
          hasVotedRef.current = true;
          setLeaving("right");
          setTimeout(() => onYes?.(), LEAVE_MS);
          return { ...prev, active: false };
        }
        if (dx < -THRESHOLD) {
          hasVotedRef.current = true;
          setLeaving("left");
          setTimeout(() => onNo?.(), LEAVE_MS);
          return { ...prev, active: false };
        }
        return { dx: 0, dy: 0, active: false, startX: 0, startY: 0 };
      });
    };

    const onPointerCancel = (e) => {
      el.releasePointerCapture?.(e.pointerId);
      setDrag({ dx: 0, dy: 0, active: false, startX: 0, startY: 0 });
    };

    el.addEventListener("pointerdown", onPointerStart);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerEnd);
    window.addEventListener("pointercancel", onPointerCancel);

    return () => {
      el.removeEventListener("pointerdown", onPointerStart);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerCancel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onYes, onNo]);

  const dx = drag.dx || 0;
  const rotate = reduced ? 0 : dx / 15;

  const leavingStyle =
    leaving === "right"
      ? {
          transform: `translate3d(${EXIT_X}px,0,0) rotate(${
            reduced ? 0 : rotate + 10
          }deg)`,
          opacity: 0,
          transition: transitionValue,
        }
      : leaving === "left"
      ? {
          transform: `translate3d(${-EXIT_X}px,0,0) rotate(${
            reduced ? 0 : rotate - 10
          }deg)`,
          opacity: 0,
          transition: transitionValue,
        }
      : null;

  const style = leavingStyle || {
    transform: `translate3d(${dx}px, 0, 0) rotate(${rotate}deg)`,
    transition: transitionValue,
    cursor: drag.active ? "grabbing" : "grab",
    touchAction: "none",
    userSelect: "none",
  };

  const likeOpacity = Math.min(Math.max(dx / THRESHOLD, 0), 1);
  const nopeOpacity = Math.min(Math.max(-dx / THRESHOLD, 0), 1);

  return (
    <>
      <div
        className="edge-halo edge-halo--left"
        style={{ opacity: nopeOpacity }}
      />
      <div
        className="edge-halo edge-halo--right"
        style={{ opacity: likeOpacity }}
      />

      <div className="card" ref={ref} style={style}>
        <img
          src={currentImg}
          alt={name}
          className="card__img"
          loading="lazy"
          onError={(e) => {
            console.error("❌ Error cargando imagen:", e.currentTarget.src);
            e.currentTarget.src =
              `https://via.placeholder.com/480x360?text=${encodeURIComponent(t("error.image_load"))}`;
          }}
        />
        {Array.isArray(photos) && photos.length > 1 && (
          <>
            <button
              type="button"
              aria-label={t("aria.prev_photo")}
              onClick={(e) => {
                e.stopPropagation();
                setPhotoIdx((i) => (i - 1 + photos.length) % photos.length);
              }}
              style={{
                position: "absolute",
                left: 8,
                top: "50%",
                transform: "translateY(-50%)",
                background: "rgba(0,0,0,0.4)",
                color: "#fff",
                border: 0,
                borderRadius: 999,
                width: 32,
                height: 32,
                cursor: "pointer",
                zIndex: 10,
              }}
            >
              ‹
            </button>
            <button
              type="button"
              aria-label={t("aria.next_photo")}
              onClick={(e) => {
                e.stopPropagation();
                setPhotoIdx((i) => (i + 1) % photos.length);
              }}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                background: "rgba(0,0,0,0.4)",
                color: "#fff",
                border: 0,
                borderRadius: 999,
                width: 32,
                height: 32,
                cursor: "pointer",
                zIndex: 10,
              }}
            >
              ›
            </button>
            <div
              style={{
                position: "absolute",
                bottom: 8,
                left: 0,
                right: 0,
                textAlign: "center",
                zIndex: 10,
              }}
            >
              {photos.map((_, i) => (
                <span
                  key={i}
                  style={{
                    display: "inline-block",
                    width: 6,
                    height: 6,
                    borderRadius: 6,
                    margin: "0 3px",
                    background:
                      i === photoIdx ? "#fff" : "rgba(255,255,255,0.5)",
                  }}
                />
              ))}
            </div>
          </>
        )}

        <div className="card__gradient" />

        <div
          className="card__badge card__badge--yes"
          style={{ opacity: likeOpacity }}
        >
          {t("yes_label")}
        </div>
        <div
          className="card__badge card__badge--no"
          style={{ opacity: nopeOpacity }}
        >
          {t("no_label")}
        </div>

        <div className="card__content">
          <div className="row">
            <h3 className="card__title">{name}</h3>
            {statusBadge && (
              <span className={statusBadge.className}>{statusBadge.label}</span>
            )}
          </div>

          {(cuisineLabels.length > 0 || fallbackTypeLabels.length > 0) && (
            <div className="card__cuisines">
              {(cuisineLabels.length ? cuisineLabels : fallbackTypeLabels).join(" · ")}
            </div>
          )}

          {(ratingText || distanceText || priceSymbols) && (
            <div className="card__meta-row">
              {ratingText && <span>{ratingText}</span>}
              {distanceText && <span>{distanceText}</span>}
              {priceSymbols && <span>{priceSymbols}</span>}
            </div>
          )}

          {vicinity && (
            <div className="card__meta card__meta--address" style={{ opacity: 0.9 }}>
              {vicinity}
            </div>
          )}

          <div className="card__hint">{t("drag_hint")}</div>
        </div>
      </div>
    </>
  );
}
