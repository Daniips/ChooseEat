// apps/web/src/pages/Vote.jsx
import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Card from "../components/Card";
import Summary from "./Summary";
import InviteBar from "../components/InviteBar";
import { useArrows } from "../hooks/useArrows";
import { useSession } from "../context/SessionContext";
import { io } from "socket.io-client";
import MatchOverlay from "../components/MatchOverlay";
import {
  getParticipantId,
  getParticipant,
  setParticipant,
  migrateFromLegacy,
} from "../lib/participant";
import { api } from "../lib/api";
import { useTranslation } from "react-i18next";
import Toast from "../components/Toast";
import { errorToMessage } from "../lib/errorToMessage";
import { DEFAULT_ERROR_KEYS } from "../lib/errorKeys";

const AUTOJOIN_ERROR_KEYS = {
  ...DEFAULT_ERROR_KEYS,
  notFound: "errors.session_not_found",
  conflict: "errors.already_joined",
};

const STATUS_ERROR_KEYS = {
  ...DEFAULT_ERROR_KEYS,
  notFound: "errors.session_not_found",
};

const MARK_DONE_ERROR_KEYS = {
  ...DEFAULT_ERROR_KEYS,
  notFound: "errors.session_not_found",
};

const LOAD_RESULTS_ERROR_KEYS = {
  ...DEFAULT_ERROR_KEYS,
  notFound: "errors.session_not_found",
};

const VOTE_ERROR_KEYS = {
  ...DEFAULT_ERROR_KEYS,
  notFound: "errors.session_not_found",
  conflict: "errors.conflict_action",
};

export default function Vote() {
  const { t } = useTranslation();
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { session, setWinner, hydrateFromJoin } = useSession();

  const [index, setIndex] = useState(0);
  const [yesIds, setYesIds] = useState([]);
  const [noIds, setNoIds] = useState([]);
  const [keySwipe, setKeySwipe] = useState(null);
  const [progressRestored, setProgressRestored] = useState(false);
  const isRestoring = useRef(false);

  const winner = session.winner;
  const socketRef = useRef(null);
  const [participants, setParticipants] = useState([]);
  const [results, setResults] = useState(null);

  const [forceFinished, setForceFinished] = useState(false);

  const [toast, setToast] = useState({
    open: false,
    variant: "warn",
    msg: "",
    duration: 5000,
  });
  const showToast = (variant, msg, duration = 5000) =>
    setToast({ open: true, variant, msg, duration });

  const list = useMemo(() => {
    const restaurants = Array.isArray(session?.restaurants)
      ? session.restaurants
      : [];
    console.log("🔍 [DECK] session.restaurants:", session?.restaurants);
    console.log("🔍 [DECK] list length:", restaurants.length);
    return restaurants;
  }, [session?.restaurants]);

  const total = list.length;
  const deckReady = total > 0;
  console.log("🔍 [DECK STATE] total:", total, "deckReady:", deckReady);
  const current = deckReady ? list[index] || null : null;
  const currentNumber = deckReady
    ? Math.min(index + (current ? 1 : 0), total)
    : 0;
  const pct = deckReady
    ? Math.min(100, Math.round((index / Math.max(total, 1)) * 100))
    : 0;
  const finishedByDeck = deckReady && !current;
  const finished = finishedByDeck || forceFinished;
  const finishedRef = useRef(false);
  useEffect(() => {
    finishedRef.current = finished;
  }, [finished]);

  console.log(
    "🔍 [STATE] index:",
    index,
    "current:",
    current?.name,
    "finished:",
    finished
  );

  const [showOverlay, setShowOverlay] = useState(false);
  const overlayTimerRef = useRef(null);
  const triggerMatchFlash = () => {
    setShowOverlay(true);
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    overlayTimerRef.current = setTimeout(() => setShowOverlay(false), 1600);
  };


    const reloadResults = useCallback(async () => {
    if (!session?.id) return;

    try {
      console.log("📊 [RESULTS] Loading results...");
      const data = await api(`/api/sessions/${session.id}/results`);
      console.log("✅ [RESULTS] Results loaded:", data);
      setResults(data);
    } catch (e) {
      console.error("❌ [RESULTS] Load results failed:", e);
      showToast("warn", errorToMessage(e, t, LOAD_RESULTS_ERROR_KEYS));
    }
  }, [session?.id, t]);

  
  // 1) Limpieza del temporizador del overlay al desmontar
  useEffect(() => {
    return () => {
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    };
  }, []);

  // 2) Restaura la sesión al entrar/recargar en /vote/:sessionId. Si ya está cargada, no hace nada.
  // Si existe participante local, realiza POST /join para hidratar el contexto (restaurants, status, etc.).
  useEffect(() => {
    const restoreSession = async () => {
      if (!sessionId) {
        console.log("⚠️ [RESTORE] No sessionId in URL");
        navigate("/");
        return;
      }

      if (session?.id === sessionId && session?.restaurants?.length > 0) {
        console.log("✅ [RESTORE] Session already loaded");
        return;
      }

      const participant = getParticipant(sessionId);

      if (!participant?.id) {
        console.log(
          "⚠️ [RESTORE] No participant found for session:",
          sessionId
        );
        return;
      }

      console.log("🔄 [RESTORE] Attempting to restore session:", sessionId);

      try {
        const response = await api(`/api/sessions/${sessionId}/join`, {
          method: "POST",
          body: JSON.stringify({ participantId: participant.id }),
        });

        console.log("✅ [RESTORE] Session restored:", {
          sessionId: response.session?.id,
          restaurants: response.restaurants?.length || 0,
        });

        hydrateFromJoin(response);
      } catch (e) {
        console.error("❌ [RESTORE] Failed to restore session:", e);
        showToast("error", errorToMessage(e, t, AUTOJOIN_ERROR_KEYS));
      }
    };

    restoreSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // 3) Guarda el sessionId actual en sessionStorage para facilitar futuras restauraciones.
  useEffect(() => {
    if (session?.id) {
      console.log("💾 [SESSION] Saving current session ID:", session.id);
      sessionStorage.setItem("currentSessionId", session.id);
    }
  }, [session?.id]);

  // 4) Auto-join del “Host” si en este navegador aún no existe participante para la sesión.
  // También migra claves antiguas de almacenamiento local si fuese necesario.
  useEffect(() => {
    (async () => {
      try {
        if (!session?.id) return;

        migrateFromLegacy(session.id);

        const existingId = getParticipantId(session.id);
        if (existingId) return;

        const data = await api(`/api/sessions/${session.id}/join`, {
          method: "POST",
          body: JSON.stringify({ name: "Host" }),
        });
        if (data?.participant) {
          setParticipant(session.id, data.participant);
        }
      } catch (e) {
        console.error("Auto-join host failed:", e);
        showToast("warn", errorToMessage(e, t, AUTOJOIN_ERROR_KEYS));
      }
    })();
  }, [session?.id, t]);

  // 5) Consulta el estado de la sesión en backend para:
  // - Detectar si la sesión ya terminó globalmente (status === "finished").
  // - Detectar si este participante ya marcó "done" y forzar la vista de resumen.
  // - Restaurar el progreso guardado cuando ya estabas terminado.
  useEffect(() => {
    (async () => {
      if (!session?.id) return;
      try {
        const s = await api(`/api/sessions/${session.id}`);
        const me = getParticipant(session.id);
        const iAmDone = me?.id && s.participants?.[me.id]?.done;

        console.log(
          "🔍 [SESSION STATUS] status:",
          s.status,
          "iAmDone:",
          iAmDone
        );

        if (s.status === "finished") {
          console.log("✅ [SESSION STATUS] Session finished globally");
          setForceFinished(true);
          return;
        }
        if (iAmDone) {
          console.log("✅ [SESSION STATUS] I already finished voting");
          setForceFinished(true);

          const key = `vote-progress-${session.id}`;
          const saved = sessionStorage.getItem(key);
          if (saved) {
            try {
              const {
                index: savedIndex,
                yesIds: savedYes,
                noIds: savedNo,
              } = JSON.parse(saved);
              console.log(
                "✅ [RESTORE FINISHED] Restored finished state - index:",
                savedIndex
              );
              setIndex(savedIndex || total);
              setYesIds(savedYes || []);
              setNoIds(savedNo || []);
            } catch (e) {
              console.error("❌ [RESTORE FINISHED] Failed:", e);
            }
          }
        }
      } catch (e) {
        console.error("Fetch session status failed:", e);
        showToast("warn", errorToMessage(e, t, STATUS_ERROR_KEYS));
      }
    })();
  }, [session?.id, t, total]);

  // 6) Conexión y listeners de Socket.IO para tiempo real:
  // - Participantes conectados
  // - Votos entrantes (si ya terminaste, recarga resultados)
  // - Emparejamientos/ganador
  // - Finalización de sesión y "participant:done" para refrescar el resumen
  useEffect(() => {
    if (!session?.id) return;

    const url = (
      import.meta.env.VITE_API_URL || window.location.origin
    ).replace(/\/$/, "");
    const socket = io(url, { transports: ["websocket"], autoConnect: true });
    socketRef.current = socket;

    const onParticipants = ({ participants }) =>
      setParticipants(participants || []);
    const onVote = () => {
      if (finishedRef.current) {
        console.log("🔄 [SOCKET] Vote received, reloading results...");
        reloadResults();
      }
    };
    const onMatched = (evt) => {
      if (evt?.winner) setWinner(evt.winner);
    };
    const onFinished = () => setForceFinished(true);
    const onParticipantDone = () => {
      console.log("🔄 [SOCKET] Participant done, reloading results...");
      if (finishedRef.current) {
        reloadResults();
      }
    };

    socket.emit("session:join", { sessionId: session.id });
    socket.on("session:participants", onParticipants);
    socket.on("participant:joined", onParticipants);
    socket.on("session:vote", onVote);
    socket.on("session:matched", onMatched);
    socket.on("session:finished", onFinished);
    socket.on("participant:done", onParticipantDone);

    return () => {
      socket.off("session:participants", onParticipants);
      socket.off("participant:joined", onParticipants);
      socket.off("session:vote", onVote);
      socket.off("session:matched", onMatched);
      socket.off("session:finished", onFinished);
      socket.off("participant:done", onParticipantDone);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [session?.id, setWinner, reloadResults]);

  // 7) Cuando terminas tu mazo (finishedByDeck), marca "done" en backend y fuerza estado terminado en cliente.
  useEffect(() => {
    if (!session?.id || !deckReady || !finishedByDeck) return;

    (async () => {
      try {
        const me = getParticipant(session.id);
        if (me?.id) {
          await api(`/api/sessions/${session.id}/done`, {
            method: "POST",
            body: JSON.stringify({ participantId: me.id }),
          });
        }
      } catch (e) {
        console.error("Mark done failed:", e);
        showToast("warn", errorToMessage(e, t, MARK_DONE_ERROR_KEYS));
      }
      setForceFinished(true);
    })();
  }, [session?.id, deckReady, finishedByDeck, t]);

  // 8) Carga/recarga resultados cuando hay ganador o cuando ya terminaste de votar.
  useEffect(() => {
    if (!session?.id) return;
    if (!finished && !winner) return;

    reloadResults();
  }, [session?.id, finished, winner, t, reloadResults]);


  // 9)  Restaura tu progreso desde sessionStorage UNA sola vez por sesión.
  // Usa isRestoring/progressRestored/forceFinished para evitar sobrescrituras y guardados prematuros.
  useEffect(() => {
    if (
      !session?.id ||
      !session?.restaurants?.length ||
      forceFinished ||
      progressRestored
    ) {
      if (progressRestored) {
        console.log("✅ [RESTORE PROGRESS] Already restored");
      } else {
        console.log(
          "⏳ [RESTORE PROGRESS] Skipping restore - waiting for session or already finished"
        );
      }
      return;
    }

    const key = `vote-progress-${session.id}`;
    const saved = sessionStorage.getItem(key);
    console.log("🔄 [RESTORE PROGRESS] sessionStorage key:", key);
    console.log("🔄 [RESTORE PROGRESS] saved data:", saved);

    if (saved) {
      try {
        const {
          index: savedIndex,
          yesIds: savedYes,
          noIds: savedNo,
        } = JSON.parse(saved);
        console.log(
          "✅ [RESTORE PROGRESS] Restored - index:",
          savedIndex,
          "yesIds:",
          savedYes.length,
          "noIds:",
          savedNo.length
        );

        isRestoring.current = true;
        setIndex(savedIndex || 0);
        setYesIds(savedYes || []);
        setNoIds(savedNo || []);
        setProgressRestored(true);

        setTimeout(() => {
          isRestoring.current = false;
          console.log(
            "✅ [RESTORE PROGRESS] Restoration complete, can save now"
          );
        }, 100);
      } catch (e) {
        console.error("❌ [RESTORE PROGRESS] Failed:", e);
        isRestoring.current = false;
      }
    } else {
      console.log("⚠️ [RESTORE PROGRESS] No saved progress found");
      setProgressRestored(true);
    }
  }, [
    session?.id,
    session?.restaurants?.length,
    forceFinished,
    progressRestored,
  ]);

  // 10) Guarda tu progreso en sessionStorage cada vez que cambia.
  // Se salta durante la restauración (isRestoring.current === true).
  useEffect(() => {
    if (!session?.id || isRestoring.current) {
      if (isRestoring.current) {
        console.log("⏸️ [SAVE] Skipping save during restoration");
      }
      return;
    }

    const key = `vote-progress-${session.id}`;
    const data = JSON.stringify({ index, yesIds, noIds });
    console.log("💾 [SAVE] Saving to sessionStorage:", data);
    sessionStorage.setItem(key, data);
  }, [session?.id, index, yesIds, noIds]);

  // 10) Ajusta el índice si el tamaño del mazo cambia para no salirse de rango.
  useEffect(() => {
    if (!deckReady) return;
    setIndex((i) => Math.min(i, total));
  }, [deckReady, total]);

  useArrows(
    { left: () => setKeySwipe("left"), right: () => setKeySwipe("right") },
    [index]
  );

  const liked = useMemo(
    () => list.filter((x) => yesIds.includes(x.id)),
    [yesIds, list]
  );
  const inviteUrl = `${window.location.origin}${
    session.invitePath || `/s/${session.id}`
  }`;

  async function vote(choice) {
    if (!current || !session?.id) return;

    if (choice === "yes") setYesIds((s) => [...s, current.id]);
    else setNoIds((s) => [...s, current.id]);
    setIndex((i) => i + 1);

    try {
      const me = getParticipant(session.id);
      if (!me?.id) return;

      const data = await api(`/api/sessions/${session.id}/votes`, {
        method: "POST",
        body: JSON.stringify({
          participantId: me.id,
          restaurantId: current.id,
          choice,
        }),
      });

      if (
        choice === "yes" &&
        (data?.matched === true || data?.wasAlreadyMatched === true)
      ) {
        triggerMatchFlash();
      }
      if (data?.winner) setWinner(data.winner);
    } catch (e) {
      console.error("Vote failed:", e);
      setIndex((i) => Math.max(0, i - 1));
      if (choice === "yes") {
        setYesIds((s) => s.filter((id) => id !== current.id));
      } else {
        setNoIds((s) => s.filter((id) => id !== current.id));
      }
      showToast("warn", errorToMessage(e, t, VOTE_ERROR_KEYS));
    }
  }

  return (
    <div className="wrap vote-page">
      <Header />

      <InviteBar inviteUrl={inviteUrl} connectedCount={participants.length} />

      <div className="vote-progress">
        <div
          className="vote-progress__track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label={t("progress_label", "Progreso")}
        >
          <div className="vote-progress__bar" style={{ width: `${pct}%` }} />
        </div>
        <div className="vote-progress__meta">
          {currentNumber}/{total || 0}
        </div>
      </div>

      <MatchOverlay
        visible={showOverlay}
        onDone={() => setShowOverlay(false)}
      />

      {!finished ? (
        deckReady ? (
          <div className="stage">
            <Card
              key={current?.id || "end"}
              r={current}
              onNo={() => vote("no")}
              onYes={() => vote("yes")}
              keySwipe={keySwipe}
              onKeyHandled={() => setKeySwipe(null)}
            />
            <div className="actions-bar">
              <button
                type="button"
                className="btn-circle btn-circle--no"
                onClick={() => setKeySwipe("left")}
                aria-label={t("no_label")}
              >
                ×
              </button>
              <button
                type="button"
                className="btn-circle btn-circle--yes"
                onClick={() => setKeySwipe("right")}
                aria-label={t("yes_label")}
              >
                ✓
              </button>
            </div>
          </div>
        ) : (
          <div className="stage">{t("loading")}</div>
        )
      ) : (
        <Summary
          liked={liked}
          scores={results?.results}
          winnerIds={results?.winnerIds}
          needed={results?.needed}
          participantsTotal={Math.max(
            results?.votersTarget ?? 0,
            results?.totalParticipants ?? 1
          )}
          onRestart={() => {
            setIndex(0);
            setYesIds([]);
            setNoIds([]);
            setWinner(null);
            setResults(null);
            setForceFinished(false);
            setProgressRestored(false);
            isRestoring.current = false;
            if (session?.id) {
              sessionStorage.removeItem(`vote-progress-${session.id}`);
              sessionStorage.removeItem("currentSessionId");
            }
          }}
        />
      )}

      <Toast
        open={toast.open}
        variant={toast.variant}
        duration={toast.duration}
        onClose={() => setToast((s) => ({ ...s, open: false }))}
      >
        {toast.msg}
      </Toast>
    </div>
  );
}
