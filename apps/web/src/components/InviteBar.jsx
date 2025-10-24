import React, { useState } from "react";
import { useTranslation } from "react-i18next";

export default function InviteBar({ inviteUrl }) {
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
        if (navigator.share) {
            try {
                await navigator.share({
                    title: t("share_title"),
                    text: t("share_text"),
                    url: inviteUrl
                });
            } catch {
                // noop
            }
        } else {
            await copyLink();
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
