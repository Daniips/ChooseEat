import React, { useState } from "react";
import { useTranslation } from "react-i18next";

export default function InviteBar({ inviteUrl, sessionName }) {
    const { t } = useTranslation();
    const [copied, setCopied] = useState(false);

    async function copyLink() {
        try {
            await navigator.clipboard.writeText(inviteUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            window.prompt(t("copy_prompt"), inviteUrl);
        }
    }

    async function shareLink() {
        if (!navigator.share) {
            try { await copyLink(); } catch (e) { console.error("Copy failed:", e); }
            return;
        }
        try {
            const shareText = sessionName 
                ? `${t("share_text")}\n\n${t("session_name_label", "Sesión")}: ${sessionName}`
                : t("share_text");
            await navigator.share({
            title: t("share_title"),
            text: shareText,
            url: inviteUrl,
            });
        } catch (e) {
            if (e?.name !== "AbortError") {
            console.warn("Share failed, falling back to copy:", e);
            try { await copyLink(); } catch (e2) { console.error("Copy failed:", e2); }
            }
        }
    }

    return (
        <div className="invite-wrapper">
            <div className="invite-bar">
                <button className="btn btn-sm btn--ghost" type="button" onClick={copyLink}>
                    {copied ? t("copied") : t("copy_link")}
                </button>
                <button className="btn btn-sm btn--primary" type="button" onClick={shareLink}>
                    {t("share")}
                </button>
            </div>
            <span className="sr-only" aria-live="polite">
                {copied ? t("copied_to_clipboard") : ""}
            </span>
        </div>
    );
}
