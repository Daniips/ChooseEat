// apps/web/src/pages/Vote.jsx
import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
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
import Hint from "../components/Hint";
import ConnectionStatus from "../components/ConnectionStatus";
import { errorToMessage } from "../lib/errorToMessage";
import { DEFAULT_ERROR_KEYS } from "../lib/errorKeys";
import { NetworkError, TimeoutError } from "../lib/errors";
import {
  addVoteToQueue,
  getQueueSize,
  processQueue,
  removeVoteFromQueue,
} from "../lib/offlineQueue";

const AUTOJOIN_ERROR_KEYS = {
  ...DEFAULT_ERROR_KEYS,
  notFound: "errors.session_not_found",
  conflict: "errors.already_joined",
  sessionFull: "errors.session_full",
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

  const [showVoteHint, setShowVoteHint] = useState(false);
  const [pendingVotesCount, setPendingVotesCount] = useState(0);
  
  const list = useMemo(() => {
    const restaurants = Array.isArray(session?.restaurants)
      ? session.restaurants
      : [];
    return restaurants;
  }, [session?.restaurants]);

  const total = list.length;
  const deckReady = total > 0;
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

  const [showOverlay, setShowOverlay] = useState(false);
  const [matchRestaurant, setMatchRestaurant] = useState(null);
  const pendingFinishRef = useRef(false);

  const triggerMatchFlash = (restaurant) => {
    if (!restaurant) return;
    setMatchRestaurant(restaurant);
    setShowOverlay(true);
  };

  const [showHint, setShowHint] = useState(() => {
    return localStorage.getItem("ce_drag_hint_dismissed") === "1"
      ? false
      : true;
  });

  const dismissHint = useCallback(() => {
    if (!showHint) return;
    setShowHint(false);
    localStorage.setItem("ce_drag_hint_dismissed", "1");
  }, [showHint]);

  const reloadResults = useCallback(async () => {
    if (!session?.id) return;

    try {
      const data = await api(`/api/sessions/${session.id}/results`);
      setResults(data);
    } catch (e) {
      showToast("warn", errorToMessage(e, t, LOAD_RESULTS_ERROR_KEYS));
    }
  }, [session?.id, t]);

  // 1) Restaura la sesión al entrar/recargar en /vote/:sessionId. Si ya está cargada, no hace nada.
  // Si existe participante local, realiza POST /join para hidratar el contexto (restaurants, status, etc.).
  useEffect(() => {
    const restoreSession = async () => {
      if (!sessionId) {
        navigate("/");
        return;
      }

      if (session?.id === sessionId && session?.restaurants?.length > 0) {
        return;
      }

      const participant = getParticipant(sessionId);

      if (!participant?.id) {
        return;
      }

      try {
        const response = await api(`/api/sessions/${sessionId}/join`, {
          method: "POST",
          body: JSON.stringify({ participantId: participant.id }),
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

  // 2) Guarda el sessionId actual en localstorage para facilitar futuras restauraciones.
  useEffect(() => {
    if (session?.id) {
      localStorage.setItem("currentSessionId", session.id);
    }
  }, [session?.id]);

  // 3) Auto-join del “Host” si en este navegador aún no existe participante para la sesión.
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
          setParticipant(session.id, data.participant, null, { expiresAt: data.expiresAt });
        }
      } catch (e) {
        console.error("Auto-join host failed:", e);
        showToast("warn", errorToMessage(e, t, AUTOJOIN_ERROR_KEYS));
      }
    })();
  }, [session?.id, t]);

  // 4) Consulta el estado de la sesión en backend para:
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

        if (s.status === "finished") {
          navigate(`/s/${session.id}/results`, { replace: true });
          return;
        }

        if (iAmDone) {
          setForceFinished(true);

          const key = `vote-progress-${session.id}`;
          const saved = localStorage.getItem(key);
          if (saved) {
            try {
              const {
                index: savedIndex,
                yesIds: savedYes,
                noIds: savedNo,
              } = JSON.parse(saved);
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
  }, [navigate, session.id, t, total]);

  // 5) Conexión y listeners de Socket.IO para tiempo real:
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
        reloadResults();
      }
    };
    const onMatched = (evt) => {
      if (evt?.winner) {
        setWinner(evt.winner);
        triggerMatchFlash(evt.winner);
      } else if (evt?.restaurant) {
        triggerMatchFlash(evt.restaurant);
      }
    };
    const onFinished = () => {
      if (session?.id) navigate(`/s/${session.id}/results`, { replace: true });
    };
    const onParticipantDone = () => {
      if (finishedRef.current) {
        reloadResults();
      }
    };

    // Procesar cola de votos offline cuando el socket se conecta
    const processOfflineQueue = async () => {
      const queueSize = getQueueSize(session.id);
      if (queueSize > 0) {
        try {
          const processed = await processQueue(session.id, api);
          if (processed > 0) {
            setPendingVotesCount(getQueueSize(session.id));
            showToast(
              "ok",
              t("votes_sent", { count: processed }, `Se enviaron ${processed} voto(s)`),
              3000
            );
            // Recargar resultados si ya terminaste
            if (finishedRef.current) {
              reloadResults();
            }
          }
        } catch (e) {
          console.error("Failed to process offline queue:", e);
        }
      }
    };

    const handleSocketConnect = () => {
      // Procesar cola cuando el socket se conecta
      processOfflineQueue();
    };

    socket.emit("session:join", { sessionId: session.id });
    socket.on("session:participants", onParticipants);
    socket.on("participant:joined", onParticipants);
    socket.on("session:vote", onVote);
    socket.on("session:matched", onMatched);
    socket.on("session:finished", onFinished);
    socket.on("participant:done", onParticipantDone);
    socket.on("connect", handleSocketConnect);

    // Procesar inmediatamente si ya está conectado y hay votos pendientes
    if (socket.connected && getQueueSize(session.id) > 0) {
      processOfflineQueue();
    }

    // También escuchar eventos online del navegador
    const handleOnline = () => {
      if (socket.connected) {
        processOfflineQueue();
      }
    };
    window.addEventListener("online", handleOnline);

    return () => {
      socket.off("session:participants", onParticipants);
      socket.off("participant:joined", onParticipants);
      socket.off("session:vote", onVote);
      socket.off("session:matched", onMatched);
      socket.off("session:finished", onFinished);
      socket.off("participant:done", onParticipantDone);
      socket.off("connect", handleSocketConnect);
      window.removeEventListener("online", handleOnline);
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, setWinner, reloadResults]);

  // 5.5) Inicializar contador de votos pendientes cuando cambia la sesión
  useEffect(() => {
    if (!session?.id) return;
    setPendingVotesCount(getQueueSize(session.id));
  }, [session?.id]);

  // 6) Cuando terminas tu mazo (finishedByDeck), marca "done" en backend y fuerza estado terminado en cliente.
  // + Si hay overlay (match), espera a que termine antes de marcar "done".
  useEffect(() => {
    if (!session?.id || !deckReady || !finishedByDeck) return;

    if (pendingFinishRef.current) {
      return;
    }

    if (showOverlay) {
      pendingFinishRef.current = true;
      return;
    }

    (async () => {
      try {
        const me = getParticipant(session.id);
        if (me?.id) {
          await api(`/api/sessions/${session.id}/done`, {
            method: "POST",
            body: JSON.stringify({ participantId: me.id }),
          });
        }
        setForceFinished(true);
      } catch (e) {
        console.error("Mark done failed:", e);
        showToast("warn", errorToMessage(e, t, MARK_DONE_ERROR_KEYS));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, deckReady, finishedByDeck, t]);

  // 7) Cuando el overlay se cierra y había pending finish, dispara la finalización
  useEffect(() => {
    if (!showOverlay && pendingFinishRef.current && finishedByDeck) {
      (async () => {
        try {
          const me = getParticipant(session.id);
          if (me?.id && session?.id) {
            await api(`/api/sessions/${session.id}/done`, {
              method: "POST",
              body: JSON.stringify({ participantId: me.id }),
            });
          }
          setForceFinished(true);
          pendingFinishRef.current = false;
        } catch (e) {
          console.error("Mark done (delayed) failed:", e);
          showToast("warn", errorToMessage(e, t, MARK_DONE_ERROR_KEYS));
          pendingFinishRef.current = false;
        }
      })();
    }
  }, [showOverlay, finishedByDeck, session?.id, t]);

  // 8) Carga/recarga resultados cuando hay ganador o cuando ya terminaste de votar.
  useEffect(() => {
    if (!session?.id) return;
    if (!finished && !winner) return;

    reloadResults();
  }, [session?.id, finished, winner, t, reloadResults]);

  // 9)  Restaura tu progreso desde localStorage UNA sola vez por sesión.
  // Usa isRestoring/progressRestored/forceFinished para evitar sobrescrituras y guardados prematuros.
  useEffect(() => {
    if (
      !session?.id ||
      !session?.restaurants?.length ||
      forceFinished ||
      progressRestored
    ) {
      return;
    }
    const key = `vote-progress-${session.id}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const {
          index: savedIndex,
          yesIds: savedYes,
          noIds: savedNo,
        } = JSON.parse(saved);

        isRestoring.current = true;
        setIndex(savedIndex || 0);
        setYesIds(savedYes || []);
        setNoIds(savedNo || []);
        setProgressRestored(true);

        setTimeout(() => {
          isRestoring.current = false;
        }, 100);
      } catch (e) {
        console.error("❌ [RESTORE PROGRESS] Failed:", e);
        isRestoring.current = false;
      }
    } else {
      setProgressRestored(true);
    }
  }, [
    session?.id,
    session?.restaurants?.length,
    forceFinished,
    progressRestored,
  ]);

  // 10) Guarda tu progreso en localStorage cada vez que cambia.
  // Se salta durante la restauración (isRestoring.current === true).
  useEffect(() => {
    if (!session?.id || isRestoring.current) {
      return;
    }

    const key = `vote-progress-${session.id}`;
    const data = JSON.stringify({ index, yesIds, noIds });
    localStorage.setItem(key, data);
  }, [session?.id, index, yesIds, noIds]);

  // 11) Ajusta el índice si el tamaño del mazo cambia para no salirse de rango.
  useEffect(() => {
    if (!deckReady) return;
    setIndex((i) => Math.min(i, total));
  }, [deckReady, total]);

  useArrows(
    { left: () => setKeySwipe("left"), right: () => setKeySwipe("right") },
    [index]
  );

  useEffect(() => {
    // Mostrar hint cuando la página de votación está lista
    if (deckReady && list.length > 0 && !finished) {
      const timer = setTimeout(() => setShowVoteHint(true), 1500);
      return () => clearTimeout(timer);
    } else {
      setShowVoteHint(false);
    }
  }, [deckReady, list.length, finished]);

  const liked = useMemo(
    () => list.filter((x) => yesIds.includes(x.id)),
    [yesIds, list]
  );
  const inviteUrl = `${window.location.origin}${
    session.invitePath || `/s/${session.id}`
  }`;

  //12) Hace dismiss del hint de voto
  useEffect(() => {
    if (!showHint || finished || !deckReady) return;
    const to = setTimeout(dismissHint, 6000);
    const onKey = (e) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") dismissHint();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(to);
      window.removeEventListener("keydown", onKey);
    };
  }, [showHint, finished, deckReady, dismissHint]);

  async function vote(choice) {
    dismissHint();

    if (!current || !session?.id) return;
    const votedRestaurant = current;
    const isLastCard = index === total - 1;
    if (choice === "yes") setYesIds((s) => [...s, current.id]);
    else setNoIds((s) => [...s, current.id]);

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

      // Si el voto se envió exitosamente, eliminarlo de la cola offline si estaba ahí
      removeVoteFromQueue(session.id, current.id, me.id);
      setPendingVotesCount(getQueueSize(session.id));

      if (
        isLastCard &&
        choice === "yes" &&
        (data?.matched === true || data?.wasAlreadyMatched === true)
      ) {
        pendingFinishRef.current = true;
      }

      setIndex((i) => i + 1);

      if (
        choice === "yes" &&
        (data?.matched === true || data?.wasAlreadyMatched === true)
      ) {
        triggerMatchFlash(votedRestaurant);
      }
      if (data?.winner) setWinner(data.winner);
    } catch (e) {
      console.error("Vote failed:", e);
      
      // Si es un error de red (sin conexión), NO hacer rollback
      // Mantener el voto localmente y avanzar el índice
      // Añadir a la cola offline para reenviarlo cuando se recupere la conexión
      if (e instanceof NetworkError || e instanceof TimeoutError) {
        // Añadir a la cola offline
        const me = getParticipant(session.id);
        if (me?.id) {
          addVoteToQueue(session.id, me.id, current.id, choice);
          setPendingVotesCount(getQueueSize(session.id));
        }
        
        // Avanzar el índice normalmente (el voto ya está en yesIds/noIds)
        setIndex((i) => i + 1);
        // Mostrar mensaje informativo pero no de error
        showToast("info", t("queued_vote", "Sin conexión: tu voto se enviará al reconectar"), 4000);
        return;
      }

      // Si es un error del servidor (4xx, 5xx), hacer rollback porque el voto fue rechazado
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
    <div
      className="wrap vote-page"
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Header />
      <ConnectionStatus socket={socketRef.current} />

      <div
        style={{
          flex: 1,
          overflow: finished ? "hidden" : "auto",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <InviteBar inviteUrl={inviteUrl} connectedCount={participants.length} sessionName={session?.name} />
        {pendingVotesCount > 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "8px 16px",
              fontSize: "13px",
              color: "var(--muted)",
              background: "var(--cardSoft)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            {t("votes_pending", { count: pendingVotesCount }, `${pendingVotesCount} voto(s) pendiente(s)`)}
          </div>
        )}

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

        {!finished && deckReady && showHint && (
          <div
            className="drag-hint"
            role="note"
            onClick={dismissHint}
            style={{
              alignSelf: "center",
              margin: "6px 0 8px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: "var(--muted)",
              fontSize: "12px",
              cursor: "default",
              userSelect: "none",
            }}
          >
            <span
              style={{
                padding: "6px 10px",
                borderRadius: 9999,
                background: "var(--ctrl-bg)",
                border: "1px solid var(--border)",
                lineHeight: 1,
                boxShadow: "0 2px 8px rgba(0,0,0,.15)",
                whiteSpace: "nowrap",
              }}
              title={t("drag_hint")}
            >
              ← {t("no_label", "No")} / → {t("yes_label", "Sí")}
            </span>
            <span style={{ whiteSpace: "nowrap" }}>{t("drag_hint")}</span>
          </div>
        )}

        <MatchOverlay
          visible={showOverlay}
          restaurant={matchRestaurant}
          duration={1200}
          onDone={() => {
            setShowOverlay(false);
            setMatchRestaurant(null);
          }}
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
            participants={results?.participants ?? {}}
            sessionName={session?.name}
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
                localStorage.removeItem(`vote-progress-${session.id}`);
                localStorage.removeItem("currentSessionId");
              }
            }}
          />
        )}
      </div>

      <Footer />

      <Toast
        open={toast.open}
        variant={toast.variant}
        duration={toast.duration}
        onClose={() => setToast((s) => ({ ...s, open: false }))}
      >
        {toast.msg}
      </Toast>

      <Hint 
        open={showVoteHint} 
        onClose={() => setShowVoteHint(false)}
        duration={10000}
        position="top"
        hintId="vote_how_to_vote"
      >
        {t("hints.vote_how_to_vote")}
      </Hint>
    </div>
  );
}
