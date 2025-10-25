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

export default function Vote() {
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
  const [error, setError] = useState("");

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

  const msg = (e, fallback) => (e?.message ? String(e.message) : fallback);

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
        setError(`No se pudo unir el host automáticamente: ${msg(e, "Error de red")}`);
      }
    })();
  }, [session?.id]);

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
        setError(`No se pudo comprobar el estado de la sesión: ${msg(e, "Error de red")}`);
      }
    })();
  }, [session?.id]);

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
        setError(`No se pudo marcar como terminado: ${msg(e, "Error de red")}`);
      }
      setForceFinished(true);
    })();
  }, [finishedByDeck, session?.id]);

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
        if (!aborted) setError(`No se pudieron cargar los resultados: ${msg(e, "Error de red")}`);
      }
    })();

    return () => { aborted = true; };
  }, [session?.id, finished, winner]);

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

      if (
        choice === "yes" &&
        (data?.matched === true || data?.wasAlreadyMatched === true)
      ) {
        triggerMatchFlash();
      }
      if (data?.winner) setWinner(data.winner);
    } catch (e) {
      console.error("Vote failed:", e);
      setError(`No se pudo registrar tu voto: ${msg(e, "Error de red")}`);

      setIndex((i) => Math.max(0, i - 1));
      if (choice === "yes") {
        setYesIds((s) => s.filter((id) => id !== current.id));
      } else {
        setNoIds((s) => s.filter((id) => id !== current.id));
      }
    }
  }

  return (
    <div className="wrap vote-page">
      <Header />

      {error ? (
        <div role="alert" aria-live="assertive" className="toast error" style={{ margin: "8px 0" }}>
          {error}
          <button
            className="btn btn-sm btn--ghost"
            style={{ marginLeft: 8 }}
            onClick={() => setError("")}
          >
            ✕
          </button>
        </div>
      ) : null}

      <InviteBar inviteUrl={inviteUrl} connectedCount={participants.length} />
      
      <div className="vote-progress">
        <div className="vote-progress__track" role="progressbar"
            aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}
            aria-label="Progreso de tu mazo">
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
              aria-label="No"
            >
              ×
            </button>
            <button
              type="button"
              className="btn-circle btn-circle--yes"
              onClick={() => setKeySwipe("right")}
              aria-label="Sí"
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
            setError("");
          }}
        />
      )}
    </div>
  );
}
