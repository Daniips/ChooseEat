import React, { useEffect } from "react";

export default function Toast({ open, onClose, variant = "ok", duration = 2500, children }) {
    useEffect(() => {
        if (!open) return;
        const t = setTimeout(() => onClose?.(), duration);
        return () => clearTimeout(t);
    }, [open, duration, onClose]);

    if (!open) return null;

    const icon = variant === "warn" ? "!" : "✓";

    return (
        <div className={`toast toast--${variant}`} role="status" aria-live="polite">
            <span className="toast__icon" aria-hidden="true">{icon}</span>
            <span className="toast__msg">{children}</span>
            <button className="toast__close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
    );
}
