import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function MatchOverlay({ 
  visible = false,
   duration = 1200,
   restaurant = null,
    onDone = () => {}
   }) {
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible && restaurant) {
      setMounted(true);
      requestAnimationFrame(() => setShow(true));
      const to = setTimeout(() => {
        setShow(false);
        setTimeout(() => {
          setMounted(false);
          onDone();
        }, 260);
      }, duration);
      return () => clearTimeout(to);
    } else if (!visible) {
      setShow(false);
      const t = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(t);
    }
  }, [visible, restaurant, duration, onDone]);

  if (!mounted || !restaurant) return null;

  const thumb =
    restaurant.photo ||
    restaurant.photoUrl ||
    restaurant.image ||
    (restaurant.photos && restaurant.photos[0]) ||
    restaurant.thumbnail ||
    "";

  return createPortal(
    <div
      className={`match-overlay ${show ? "is-open" : "is-close"}`}
      aria-hidden={show ? "false" : "true"}
      role="status"
      aria-live="polite"
    >
      <div className="match-card" onClick={() => { setShow(false); setTimeout(() => { setMounted(false); onDone(); }, 260); }}>
        <div className="match-thumb" style={{ backgroundImage: thumb ? `url(${thumb})` : undefined }} aria-hidden="true" />
        <div className="match-body">
          <div className="match-tag">MATCH</div>
          <div className="match-name">{restaurant.name || restaurant.title || "¡Emparejado!"}</div>
        </div>
      </div>
    </div>,
    document.body
  );
}