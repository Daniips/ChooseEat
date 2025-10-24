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

  const finishedByDeck = !current;
  const finished = finishedByDeck || forceFinished;

  useEffect(() => {
    (async () => {
      try {
        if (!session?.id) return;

        migrateFromLegacy(session.id);

        const existingId = getParticipantId(session.id);
        if (existingId) {
          return;
        }
        const res = await fetch(`/api/sessions/${session.id}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Host" }),
        });

        if (res.ok) {
          const data = await res.json();
          setParticipant(session.id, data.participant);
        }
      } catch {
        // noop
      }
    })();
  }, [session?.id]);


  useEffect(() => {
    (async () => {
      if (!session?.id) return;
      try {
        const res = await fetch(`/api/sessions/${session.id}`);
        if (!res.ok) return;
        const s = await res.json();
        const me = getParticipant(session.id);
        const iAmDone = me?.id && s.participants?.[me.id]?.done;
        if (s.status === "finished" || iAmDone) {
          setForceFinished(true);
        }
      } catch {
        // noop
      }
    })();
  }, [session?.id]);

  useEffect(() => {
    if (!session?.id) return;

    const url = (import.meta.env.VITE_API_URL || window.location.origin).replace(/\/$/, "");
    const socket = io(url, { transports: ["websocket"], autoConnect: true });
    socketRef.current = socket;

    const onParticipants = ({ participants }) => setParticipants(participants || []);
    const onVote = () => { /* contador en vivo? */ };
    const onMatched = (evt) => {
      if (evt?.winner) {
        setWinner(evt.winner);
      }
    };

    const onFinished = () => {
      setForceFinished(true);
    };

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
          await fetch(`/api/sessions/${session.id}/done`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ participantId: me.id })
          });
        }
      } catch {
        // noop
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
        const res = await fetch(`/api/sessions/${session.id}/results`);
        if (!res.ok) return;
        const data = await res.json();
        if (!aborted) setResults(data);
      } catch {
        //noop
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
      const me = getParticipant(session.id); // <— helper
      if (!me?.id) return;

      const res = await fetch(`/api/sessions/${session.id}/votes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: me.id,
          restaurantId: current.id,
          choice
        })
      });

      if (res.ok) {
        const data = await res.json(); 
        if (
          choice === "yes" &&
          (data.matched === true || data.wasAlreadyMatched === true)
        ) {
          triggerMatchFlash();
        }

        if (data.winner) setWinner(data.winner);
      }
    } catch { /* noop */ }
  }

  return (
    <div className="wrap">
      <Header />
      <InviteBar inviteUrl={inviteUrl} connectedCount={participants.length} />

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
          }}
        />
      )}
    </div>
  );
}
