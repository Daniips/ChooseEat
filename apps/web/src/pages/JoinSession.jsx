//apps/web/src/pages/JoinSession.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import { useSession } from "../context/SessionContext";
import { api } from "../lib/api";
import { getParticipantId, setParticipant, migrateFromLegacy } from "../lib/participant";
import { useTranslation } from "react-i18next";

export default function JoinSession() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { hydrateFromJoin } = useSession();

  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [autoJoining, setAutoJoining] = useState(true);

  useEffect(() => {
    (async () => {
      if (!id) {
        setError(t("invalid_link"));
        setAutoJoining(false);
        return;
      }

      try {
        migrateFromLegacy(id);

        const existingId = getParticipantId(id);
        if (existingId) {
          const data = await api(`/api/sessions/${id}/join`, {
            method: "POST",
            body: JSON.stringify({ participantId: existingId })
          });
          setParticipant(id, data.participant, data.invitePath);

          hydrateFromJoin(data);
          navigate("/vote");
          return;
        }
      } catch (err) {
        console.error("auto-join failed:", err);
        setError(t("auto_join_failed"));
      }
      setAutoJoining(false);
    })();
  }, [id, hydrateFromJoin, navigate, t]);

  async function handleJoin(e) {
    e.preventDefault();
    setError("");

    if (!id) {
      setError(t("invalid_link"));
      return;
    }
    try {
      const data = await api(`/api/sessions/${id}/join`, {
        method: "POST",
        body: JSON.stringify({ name })
      });
      setParticipant(id, data.participant, data.invitePath);
      hydrateFromJoin(data);
      navigate("/vote");
    } catch (err) {
      console.error("join error:", err);
      setError(t("join_failed") + (err?.message || ""));
    }
  }

  if (autoJoining) {
    return (
      <div className="wrap">
        <Header />
        <div style={{ maxWidth: 520, margin: "12px auto 0" }}>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => navigate("/")}
            title={t("back_to_home")}
          >
            ← {t("home")}
          </button>
        </div>

        <div className="summary" style={{ maxWidth: 520, margin: "12px auto" }}>
          <h2>{t("resuming")}</h2>
          <p className="muted">{t("checking_previous_session")}</p>
          {error && (
            <div className="form-error" role="alert" style={{ marginTop: 8 }}>
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <Header />

      <div style={{ maxWidth: 520, margin: "12px auto 0" }}>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => navigate("/")}
          title={t("back_to_home")}
        >
          ← {t("home")}
        </button>
      </div>

      <form className="summary" style={{ maxWidth: 520, margin: "12px auto" }} onSubmit={handleJoin}>
        <h2>{t("join_session")}</h2>

        <label htmlFor="name">
          <div className="small">{t("your_name")}</div>
          <input
            id="name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("enter_your_name")}
            required
          />
        </label>

        {error && (
          <div className="form-error" role="alert" style={{ marginTop: 8 }}>
            {error}
          </div>
        )}

        <div className="summary__actions" style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
          <button type="submit" className="btn btn--primary">{t("join")}</button>
        </div>
      </form>
    </div>
  );
}
