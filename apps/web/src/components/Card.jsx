// apps/web/src/components/Card.jsx
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next"; 

const THRESHOLD = 120;           
const EXIT_X = 1000;
const TILT_MS = 140;
const LEAVE_MS = 220;
const PRE_TILT_FACTOR = 0.9;


export default function Card({ r, onNo, onYes, keySwipe, onKeyHandled }) {
    const { t } = useTranslation();
    const ref = useRef(null);
    const [drag, setDrag] = useState({
        dx: 0,
        dy: 0,
        active: false,
        startX: 0,
        startY: 0
    });
    const [leaving, setLeaving] = useState(null);    
    const [reduced, setReduced] = useState(false);
    const transitionValue = reduced
        ? "none"
        : (drag.active ? "none" : "transform .25s ease, opacity .25s ease");
    
    const hasVotedRef = useRef(false); 

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
    }, [r?.id]);

    useEffect(() => {
        if (!keySwipe) return;
        if (leaving) return;        

        const dir = keySwipe === "right" ? "right" : "left";

        if (reduced) {
            setLeaving(dir);
            setTimeout(() => {
                if (dir === "right") onYes?.(); else onNo?.();
                onKeyHandled?.();
            }, 0);
            return;
        }

        setDrag(prev => ({ ...prev, active: false }));

        requestAnimationFrame(() => {
            setDrag(prev => ({
                ...prev,
                dx: dir === "right" ? THRESHOLD * PRE_TILT_FACTOR : -THRESHOLD * PRE_TILT_FACTOR
            }));
        });

        const tiltTimer = setTimeout(() => {
            setLeaving(dir);
            const leaveTimer = setTimeout(() => {
                if (dir === "right") onYes?.(); else onNo?.();
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
            el.setPointerCapture?.(e.pointerId);
            setDrag({ dx: 0, dy: 0, active: true, startX: e.clientX, startY: e.clientY });
        };

        const onPointerMove = (e) => {
            setDrag(prev => {
                if (!prev.active) return prev;
                const dx = e.clientX - prev.startX;
                const dy = e.clientY - prev.startY;
                return { ...prev, dx, dy };
            });
        };

        const onPointerEnd = (e) => {
            el.releasePointerCapture?.(e.pointerId);
            setDrag(prev => {
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
            ? { transform: `translate3d(${EXIT_X}px,0,0) rotate(${reduced ? 0 : rotate + 10}deg)`, opacity: 0, transition: transitionValue }
            : leaving === "left"
            ? { transform: `translate3d(${-EXIT_X}px,0,0) rotate(${reduced ? 0 : rotate - 10}deg)`, opacity: 0, transition: transitionValue }
            : null;

    const style = leavingStyle || {
        transform: `translate3d(${dx}px, 0, 0) rotate(${rotate}deg)`,
        transition: transitionValue,
        cursor: drag.active ? "grabbing" : "grab",
        touchAction: "none",
        userSelect: "none"
    };

    const likeOpacity = Math.min(Math.max(dx / THRESHOLD, 0), 1);
    const nopeOpacity = Math.min(Math.max(-dx / THRESHOLD, 0), 1);

    return (
        <>
 
            <div className="edge-halo edge-halo--left" style={{ opacity: nopeOpacity }} />
            <div className="edge-halo edge-halo--right" style={{ opacity: likeOpacity }} />

            <div className="card" ref={ref} style={style}>
                <img src={r.img} alt={r.name} className="card__img" />
                <div className="card__gradient" />

                <div className="card__badge card__badge--yes" style={{ opacity: likeOpacity }}>{t("yes_label")}</div>
                <div className="card__badge card__badge--no" style={{ opacity: nopeOpacity }}>{t("no_label")}</div>

                <div className="card__content">
                    <div className="row">
                        <h3 className="card__title">{r.name}</h3>
                        {r.openNow && <span className="pill pill--green">{t("open")}</span>}
                    </div>
                    <div className="card__sub">
                        {r.cuisine
                            .map((c) => t(`${c.toLowerCase()}`))
                            .join(" · ")
                        }
                    </div>
                    <div className="card__meta">
                        {"$".repeat(r.price)} · {r.distanceKm.toFixed(1)} km · ⭐ {r.rating.toFixed(1)}
                    </div>
                    <div className="card__hint">{t("drag_hint")}</div>
                </div>
            </div>
        </>
    );
}
