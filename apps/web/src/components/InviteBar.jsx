import React, { useState } from "react";

export default function InviteBar({ inviteUrl }) {
    const [copied, setCopied] = useState(false);

    async function copyLink() {
        try {
            await navigator.clipboard.writeText(inviteUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // Fallback: selecciona y muestra prompt
            window.prompt("Copia este enlace:", inviteUrl);
        }
    }

    async function shareLink() {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: "Únete a mi sesión de ChooseEat",
                    text: "Vota restaurantes conmigo 👇",
                    url: inviteUrl
                });
            } catch {
                // cancelado o error → sin ruido
            }
        } else {
            // Si no hay Web Share, copiamos y avisamos
            await copyLink();
        }
    }

    return (
        <div className="invite-wrapper">
            <div className="invite-bar">
                <button className="btn btn-sm btn--ghost" type="button" onClick={copyLink}>
                    {copied ? "¡Copiado!" : "Copiar enlace"}
                </button>
                <button className="btn btn-sm btn--primary" type="button" onClick={shareLink}>
                    Compartir
                </button>
            </div>
            <span className="sr-only" aria-live="polite">
                {copied ? "Enlace copiado al portapapeles" : ""}
            </span>
        </div>
    );
}
