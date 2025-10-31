// apps/web/src/pages/Vote.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import Header from "../components/Header";
import Card from "../components/Card";
import Summary from "./Summary";
import InviteBar from "../components/InviteBar";
import { useArrows } from "../hooks/useArrows";
import { useSession } from "../context/SessionContext";
import { io } from "socket.io-client";
import MatchOverlay from "../components/MatchOverlay";
import { getParticipantId, getParticipant, setParticipant, migrateFromLegacy } from "../lib/participant";
import { api } from "../lib/api";
import { useTranslation } from "react-i18next";
import Toast from "../components/Toast";
import { errorToMessage } from "../lib/errorToMessage";
import { DEFAULT_ERROR_KEYS } from "../lib/errorKeys";

const AUTOJOIN_ERROR_KEYS = {
  ...DEFAULT_ERROR_KEYS,
  // Overrides específicos de auto-join (si aplican)
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
  const { session, setWinner } = useSession();

  const [index, setIndex] = useState(0);
  const [yesIds, setYesIds] = useState([]);
  const [, setNoIds] = useState([]);
  const [keySwipe, setKeySwipe] = useState(null);

  const winner = session.winner;
  const socketRef = useRef(null);
  const [participants, setParticipants] = useState([]);
  const [results, setResults] = useState(null);

  const [forceFinished, setForceFinished] = useState(false);

  const [toast, setToast] = useState({ open: false, variant: "warn", msg: "", duration: 5000 });
  const showToast = (variant, msg, duration = 5000) =>
    setToast({ open: true, variant, msg, duration });

  const list = useMemo(
    () => (Array.isArray(session?.restaurants) ? session.restaurants : []),
    [session?.restaurants]
  );

  const current = list[index] || null;
  const total = list.length;
  const currentNumber = Math.min(index + (current ? 1 : 0), total);
  const pct = total ? Math.min(100, Math.round((index / total) * 100)) : 0;
  const finishedByDeck = !current;
  const finished = finishedByDeck || forceFinished;

  const [showOverlay, setShowOverlay] = useState(false);
  const overlayTimerRef = useRef(null);
  const triggerMatchFlash = () => {
    setShowOverlay(true);
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    overlayTimerRef.current = setTimeout(() => setShowOverlay(false), 1600);
  };
  useEffect(() => {
    return () => {
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    };
  }, []);

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

  useEffect(() => {
    (async () => {
      if (!session?.id) return;
      try {
        const s = await api(`/api/sessions/${session.id}`);
        const me = getParticipant(session.id);
        const iAmDone = me?.id && s.participants?.[me.id]?.done;
        if (s.status === "finished" || iAmDone) {
          setForceFinished(true);
        }
      } catch (e) {
        console.error("Fetch session status failed:", e);
        showToast("warn", errorToMessage(e, t, STATUS_ERROR_KEYS));
      }
    })();
  }, [session?.id, t]);

  useEffect(() => {
    if (!session?.id) return;

    const url = (import.meta.env.VITE_API_URL || window.location.origin).replace(/\/$/, "");
    const socket = io(url, { transports: ["websocket"], autoConnect: true });
    socketRef.current = socket;

    const onParticipants = ({ participants }) => setParticipants(participants || []);
    const onVote = () => {};
    const onMatched = (evt) => {
      if (evt?.winner) setWinner(evt.winner);
    };
    const onFinished = () => setForceFinished(true);

    socket.emit("session:join", { sessionId: session.id });
    socket.on("session:participants", onParticipants);
    socket.on("participant:joined", onParticipants);
    socket.on("session:vote", onVote);
    socket.on("session:matched", onMatched);
    socket.on("session:finished", onFinished);

    return () => {
      socket.off("session:participants", onParticipants);
      socket.off("participant:joined", onParticipants);
      socket.off("session:vote", onVote);
      socket.off("session:matched", onMatched);
      socket.off("session:finished", onFinished);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [session?.id, setWinner]);

  useEffect(() => {
    if (!finishedByDeck || !session?.id) return;

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
  }, [finishedByDeck, session?.id, t]);

  useEffect(() => {
    if (!session?.id) return;
    if (!finished && !winner) return;

    let aborted = false;
    (async () => {
      try {
        const data = await api(`/api/sessions/${session.id}/results`);
        if (!aborted) setResults(data);
      } catch (e) {
        console.error("Load results failed:", e);
        if (!aborted) showToast("warn", errorToMessage(e, t, LOAD_RESULTS_ERROR_KEYS));
      }
    })();

    return () => { aborted = true; };
  }, [session?.id, finished, winner, t]);

  useArrows({ left: () => setKeySwipe("left"), right: () => setKeySwipe("right") }, [index]);

  const liked = useMemo(() => list.filter((x) => yesIds.includes(x.id)), [yesIds, list]);
  const inviteUrl = `${window.location.origin}${session.invitePath || `/s/${session.id}`}`;

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

      if (choice === "yes" && (data?.matched === true || data?.wasAlreadyMatched === true)) {
        triggerMatchFlash();
      }
      if (data?.winner) setWinner(data.winner);
    } catch (e) {
      console.error("Vote failed:", e);
      // Revertir estado si falla
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
        <div className="vote-progress__meta">{currentNumber}/{total || 0}</div>
      </div>

      <MatchOverlay visible={showOverlay} onDone={() => setShowOverlay(false)} />

      {!finished ? (
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
        <Summary
          liked={liked}
          scores={results?.results}
          winnerIds={results?.winnerIds}
          needed={results?.needed}
          onRestart={() => {
            setIndex(0);
            setYesIds([]);
            setNoIds([]);
            setWinner(null);
            setResults(null);
            setForceFinished(false);
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
