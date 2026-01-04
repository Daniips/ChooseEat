// apps/web/src/components/Hint.jsx
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const HINT_STORAGE_KEY = "chooseeat_dismissed_hints";

function getDismissedHints() {
  try {
    const stored = localStorage.getItem(HINT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function isHintDismissed(hintId) {
  if (!hintId) return false;
  const dismissed = getDismissedHints();
  return dismissed.includes(hintId);
}

function dismissHint(hintId) {
  if (!hintId) return;
  try {
    const dismissed = getDismissedHints();
    if (!dismissed.includes(hintId)) {
      dismissed.push(hintId);
      localStorage.setItem(HINT_STORAGE_KEY, JSON.stringify(dismissed));
    }
  } catch (e) {
    console.warn("Failed to save dismissed hint:", e);
  }
}

export default function Hint({ 
  open, 
  onClose, 
  children, 
  duration = 8000,
  position = "top",
  hintId = null // ID único para este hint
}) {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (!open || !hintId) {
      setShouldShow(false);
      return;
    }
    // Verificar si el hint ya fue descartado
    if (isHintDismissed(hintId)) {
      setShouldShow(false);
      return;
    }
    setShouldShow(true);
  }, [open, hintId]);

  useEffect(() => {
    if (!shouldShow) return;
    const t = setTimeout(() => {
      if (hintId) {
        dismissHint(hintId);
      }
      setShouldShow(false);
      onClose?.();
    }, duration);
    return () => clearTimeout(t);
  }, [shouldShow, duration, hintId, onClose]);

  function handleClose() {
    if (hintId) {
      dismissHint(hintId);
    }
    setShouldShow(false);
    onClose?.();
  }

  if (!shouldShow) return null;

  const style = {
    position: "fixed",
    left: "50%",
    [position]: "32px",
    transform: "translateX(-50%)",
    zIndex: 9999,
    maxWidth: "min(90vw, 500px)",
  };

  return createPortal(
    <div 
      className="hint" 
      style={style}
      role="status" 
      aria-live="polite"
    >
      <div className="hint__content">
        <span className="hint__icon" aria-hidden="true">💡</span>
        <span className="hint__msg">{children}</span>
        <button 
          className="hint__close" 
          onClick={handleClose} 
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>
    </div>,
    document.body
  );
}

