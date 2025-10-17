import React, { useEffect, useMemo, useState, useRef } from "react";
import Header from "../components/Header";
import Card from "../components/Card";
import Summary from "../components/Summary";
import InviteBar from "../components/InviteBar";
import { useArrows } from "../hooks/useArrows";
import { useSession } from "../context/SessionContext";
import { io } from "socket.io-client";
import MatchOverlay from "../components/MatchOverlay";

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

  // --- Overlay control independiente de `winner`
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

  // Lista de restaurantes de la sesión
  const list = useMemo(
    () => (Array.isArray(session?.restaurants) ? session.restaurants : []),
    [session?.restaurants]
  );

  const current = list[index] || null;

  // NO saltar a resumen por match: solo cuando se acabe el mazo
  const finishedByDeck = !current;
  const finished = finishedByDeck;

  // Asegurar host como participante
  useEffect(() => {
    (async () => {
      try {
        const saved = JSON.parse(localStorage.getItem("ce_participant") || "null");
        if (saved?.id) return;
        if (!session?.id) return;

        const res = await fetch(`/api/sessions/${session.id}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Host" })
        });
        if (res.ok) {
          const data = await res.json();
          localStorage.setItem("ce_participant", JSON.stringify(data.participant));
          localStorage.setItem("ce_sessionId", data.sessionId);
        }
      } catch {
        // noop
      }
    })();
  }, [session?.id]);

  // Socket: participantes / match en vivo
  useEffect(() => {
    if (!session?.id) return;

    const url = (import.meta.env.VITE_API_URL || window.location.origin).replace(/\/$/, "");
    const socket = io(url, { transports: ["websocket"], autoConnect: true });
    socketRef.current = socket;

    const onParticipants = ({ participants }) => setParticipants(participants || []);
    const onVote = () => {
      // opcional: contadores en vivo
    };
    const onMatched = (evt) => {
      // evt: { sessionId, winner }
      if (evt?.winner) {
        setWinner(evt.winner);      // mantiene coherencia para resultados
        triggerMatchFlash();        // dispara visual
      }
    };

    socket.emit("session:join", { sessionId: session.id });
    socket.on("session:participants", onParticipants);
    socket.on("participant:joined", onParticipants);
    socket.on("session:vote", onVote);
    socket.on("session:matched", onMatched);

    return () => {
      socket.off("session:participants", onParticipants);
      socket.off("participant:joined", onParticipants);
      socket.off("session:vote", onVote);
      socket.off("session:matched", onMatched);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [session?.id, setWinner]);

  // Cargar resultados cuando: se acaba el mazo o hay algún winner
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
        // noop
      }
    })();

    return () => { aborted = true; };
  }, [session?.id, finished, winner]);

  useArrows({ left: () => setKeySwipe("left"), right: () => setKeySwipe("right") }, [index]);

  const liked = useMemo(() => list.filter((x) => yesIds.includes(x.id)), [yesIds, list]);
  const inviteUrl = `${window.location.origin}${session.invitePath || `/s/${session.id}`}`;

  // Enviar voto (optimista) y avanzar
  async function vote(choice) {
    if (!current || !session?.id) return;

    if (choice === "yes") setYesIds((s) => [...s, current.id]);
    else setNoIds((s) => [...s, current.id]);
    setIndex((i) => i + 1);

    try {
      const p = JSON.parse(localStorage.getItem("ce_participant") || "null");
      if (!p?.id) return;

      const res = await fetch(`/api/sessions/${session.id}/votes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: p.id,
          restaurantId: current.id,
          choice
        })
      });

      if (res.ok) {
        const data = await res.json(); // { matched, winner, ... }
        if (data.matched) {
          // overlay SIEMPRE que este voto produjo un match nuevo
          triggerMatchFlash();
          if (data.winner) setWinner(data.winner);
        }
      }
    } catch {
      /* noop */
    }
  }

  return (
    <div className="wrap">
      <Header />
      <InviteBar inviteUrl={inviteUrl} connectedCount={participants.length} />

      {/* Overlay “¡Match!” (solo efecto visual) */}
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
          }}
        />
      )}
    </div>
  );
}
