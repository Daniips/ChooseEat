import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Summary from "./Summary";
import { api } from "../lib/api";
import { useTranslation } from "react-i18next";
import Loader from "../components/Loader";

export default function Results() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const shareMenuRef = useRef(null);
  const resultsUrl = typeof window !== "undefined" ? window.location.href : "";

  function isMobileDevice() {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent || "";
    const mobileUa = /Mobi|Android|iPhone|iPad|iPod|Windows Phone/i;
    const hasTouch = navigator.maxTouchPoints && navigator.maxTouchPoints > 1;
    return mobileUa.test(ua) || !!hasTouch;
  }

  function getWinners(results = []) {
    if (!results.length) return [];
    const hasScore = results.some((r) => typeof r.score === "number");
    if (hasScore) {
      const max = Math.max(
        ...results.map((r) =>
          typeof r.score === "number" ? r.score : -Infinity
        )
      );
      return results.filter((r) => r.score === max).map((r) => r.name);
    }
    const hasYes = results.some((r) => typeof r.yes === "number");
    if (hasYes) {
      const max = Math.max(
        ...results.map((r) => (typeof r.yes === "number" ? r.yes : -Infinity))
      );
      return results.filter((r) => r.yes === max).map((r) => r.name);
    }
    return [results[0].name];
  }

  function formatWinnersList(names = []) {
    if (!names.length) return "";
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} y ${names[1]}`;
    return names
      .slice(0, 3)
      .join(", ")
      .replace(/, ([^,]*)$/, " y $1");
  }

  const winners = getWinners(data?.results || []);

  let winnerLine;
  if (winners.length === 0) {
    winnerLine = t("share_winner_none", { defaultValue: "No hay ganador." });
  } else if (winners.length === 1) {
    winnerLine = t("share_winner_one", {
      winner: winners[0],
      defaultValue: `El ganador es ${winners[0]}.`,
    });
  } else if (winners.length === 2) {
    winnerLine = t("share_winner_two", {
      winner1: winners[0],
      winner2: winners[1],
      defaultValue: `Empate: ${winners[0]} y ${winners[1]}.`,
    });
  } else {
    const listed = formatWinnersList(winners);
    const remaining = winners.length - 3;
    if (remaining > 0) {
      winnerLine = t("share_winner_many_more", {
        winners: listed,
        count: remaining,
        defaultValue: `Empate entre ${listed} y ${remaining} más.`,
      });
    } else {
      winnerLine = t("share_winner_many", {
        winners: listed,
        defaultValue: `Empate entre ${listed}.`,
      });
    }
  }

  function buildSharePayload() {
    const title = t("final_results", { defaultValue: "Resultados finales" });
    const intro = t("share_vote_finished", {
      defaultValue: "La votación en ChooseEat ha acabado.",
    });
    const view = t("view_results", { defaultValue: "Ver resultados" });

    const textParts = [intro, "", winnerLine, "", `${view}:`]; // no URL here
    return {
      title,
      text: textParts.join("\n"),
      url: resultsUrl,
    };
  }

  function buildSocialUrls() {
    const payload = buildSharePayload();
    const fullText = `${payload.text}\n\n${payload.url}`;
    const encodedFull = encodeURIComponent(fullText);
    return {
      whatsapp: `https://api.whatsapp.com/send?text=${encodedFull}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(
        payload.url
      )}&text=${encodeURIComponent(payload.text)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        payload.text + " " + payload.url
      )}`,
      email: `mailto:?subject=${encodeURIComponent(
        payload.title || ""
      )}&body=${encodeURIComponent(payload.text + "\n\n" + payload.url)}`,
    };
  }

  async function copyLink() {
    try {
      if (navigator.clipboard && resultsUrl) {
        await navigator.clipboard.writeText(resultsUrl);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 1800);
      }
    } catch (e) {
      console.error("Copy link failed", e);
    }
  }

  async function shareLink() {
    const payload = buildSharePayload();
    if (navigator.share) {
      try {
        await navigator.share({
          title: payload.title,
          text: payload.text,
          url: payload.url,
        });
        return;
      } catch (err) {
        console.warn("navigator.share failed, falling back:", err);
      }
    }
    try {
      const full = `${payload.title}\n\n${payload.text}\n\n${payload.url}`;
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(full);
        setCopiedSummary(true);
        setTimeout(() => setCopiedSummary(false), 1800);
        return;
      }
    } catch (err) {
      console.warn("clipboard write failed:", err);
    }
    try {
      const subject = encodeURIComponent(payload.title || "");
      const body = encodeURIComponent(`${payload.text}\n\n${payload.url}`);
      const mailto = `mailto:?subject=${subject}&body=${body}`;
      window.open(mailto, "_blank");
    } catch (err) {
      console.warn("mailto fallback failed:", err);
    }
  }

  function exportResultsCSV() {
    if (!data?.results) return;
    const rows = [
      ["rank", "name", "yes", "no"].join(","),
      ...data.results.map((r, i) => {
        const safeName = `"${(r.name || "").replace(/"/g, '""')}"`;
        const yes = r.yes ?? "";
        const no = r.no ?? "";
        return [i + 1, safeName, yes, no].join(",");
      }),
    ];
    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `results-${id || "session"}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    if (!shareMenuOpen) return;
    function onDocClick(e) {
      if (!shareMenuRef.current) return;
      if (!shareMenuRef.current.contains(e.target)) setShareMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [shareMenuOpen]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api(`/api/sessions/${id}/results`);
        if (!mounted) return;
        setData(res);
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [id]);

  if (loading) {
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
        <div
          className="summary"
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
            padding: "60px 20px",
            minHeight: 0,
          }}
        >
          <Loader size={80} />
          <p className="small" style={{ margin: 0, color: "var(--muted)", fontWeight: 500 }}>
            {t("loading")}
          </p>
        </div>
        <Footer />
      </div>
    );
  }
  if (!data)
    return (
      <div>
        <Header />
        <main>{t("no_results")}</main>
        <Footer />
      </div>
    );

  return (
    <div
      className="wrap"
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        overflow: "visible",
      }}
    >
      <Header />
      <main
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          paddingTop: "8px",
          paddingBottom: "8px",
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>
            {data.sessionName 
              ? `${data.sessionName}: ${t("final_results")}`
              : t("final_results")
            }
          </h1>
          <div className="muted small" style={{ marginTop: 6 }}>
            {t("final_results_hint")}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            marginTop: 10,
            marginBottom: 12,
          }}
        >
          <button
            type="button"
            className="btn btn--ghost share-copy-link share-btn-fixed"
            onClick={copyLink}
            style={{ padding: "8px 12px", borderRadius: 8 }}
          >
            {copiedLink
              ? t("copied") || "Copiado"
              : t("copy_link") || "Copiar enlace"}
          </button>

          <div style={{ position: "relative" }}>
            <button
              type="button"
              className="btn btn--ghost share-btn-fixed"
              onClick={async () => {
                if (isMobileDevice() && navigator.share) {
                  await shareLink();
                } else {
                  setShareMenuOpen((s) => !s);
                }
              }}
              style={{
                background: "var(--accent)",
                color: "#fff",
                border: "none",
                padding: "8px 12px",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              {t("share") || "Compartir"}
            </button>

            {shareMenuOpen && (
              <div
                ref={shareMenuRef}
                className="share-menu"
                role="menu"
                aria-label={t("share_menu") || "Share menu"}
              >
                {(() => {
                  const urls = buildSocialUrls();
                  return (
                    <>
                      <a className="share-item" href={urls.whatsapp} target="_blank" rel="noreferrer">
                        WhatsApp
                      </a>
                      <a className="share-item" href={urls.twitter} target="_blank" rel="noreferrer">
                        Twitter
                      </a>
                      <a className="share-item" href={urls.telegram} target="_blank" rel="noreferrer">
                        Telegram
                      </a>
                      <a className="share-item" href={urls.email} target="_blank" rel="noreferrer">
                        Email
                      </a>
                      <button
                        type="button"
                        className="share-item share-item--copy"
                        onClick={async () => {
                          try {
                            const payload = buildSharePayload();
                            const full = `${payload.title}\n\n${payload.text}\n\n${payload.url}`;
                            if (navigator.clipboard) {
                              await navigator.clipboard.writeText(full);
                              setCopiedSummary(true);
                              setTimeout(() => setCopiedSummary(false), 1800);
                            }
                          } catch (err) {
                            console.warn(err);
                          } finally {
                            setShareMenuOpen(false);
                          }
                        }}
                      >
                        {copiedSummary ? (t("copied") || "Copiado") : (t("copy_summary") || "Copiar resumen")}
                      </button>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          <button
            type="button"
            className="btn btn--ghost share-btn-fixed"
            onClick={exportResultsCSV}
            style={{ padding: "8px 12px", borderRadius: 8 }}
          >
            {t("export") || "Exportar"}
          </button>
        </div>

        <div
          className="summary-scroll"
          style={{ flex: 1, overflow: "auto", minHeight: 0 }}
        >
          <Summary
            liked={data.liked || []}
            scores={data.results || []}
            winnerIds={data.winnerIds || []}
            needed={data.needed}
            participantsTotal={Math.max(
              data.votersTarget ?? 0,
              data.totalParticipants ?? 1
            )}
            participants={data.participants || {}}
            sessionName={data.sessionName || null}
            onRestart={() => navigate(`/s/${id}`)}
            showRestart={false}
            showIdentities={true}
            showPending={false}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
