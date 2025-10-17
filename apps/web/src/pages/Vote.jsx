import React, { useEffect, useMemo, useState, useRef } from "react";
import Header from "../components/Header";
import Card from "../components/Card";
import Summary from "../components/Summary";
import InviteBar from "../components/InviteBar";
import { useArrows } from "../hooks/useArrows";
import { useSession } from "../context/SessionContext";
import { io } from "socket.io-client";

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

  const list = useMemo(
    () => (Array.isArray(session?.restaurants) ? session.restaurants : []),
    [session?.restaurants]
  );
  const current = list[index] || null;
  const finished = !!winner || !current;

  
  useEffect(() => {
    (async () => {
      try {
        const saved = JSON.parse(localStorage.getItem("ce_participant") || "null");
        if (saved?.id) return; // ya está dentro
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

  
  useEffect(() => {
    if (!session?.id) return;

    const url = (import.meta.env.VITE_API_URL || window.location.origin).replace(/\/$/, "");
    const socket = io(url, { transports: ["websocket"], autoConnect: true });
    socketRef.current = socket;

    
    const onParticipants = ({ participants }) => {
      setParticipants(participants || []);
    };
    const onVote = () => {
      
    };
    const onMatched = ({ winner }) => {
      if (winner) setWinner(winner);
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

  useEffect(() => {
  if (!session?.id) return;
  if (!winner && current) return;

  (async () => {
    try {
      const res = await fetch(`/api/sessions/${session.id}/results`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch {
      // nada
    }
  })();
}, [session?.id, winner, current]);


  useArrows({ left: () => setKeySwipe("left"), right: () => setKeySwipe("right") }, [index]);

  const liked = useMemo(() => list.filter((x) => yesIds.includes(x.id)), [yesIds, list]);
  const inviteUrl = `${window.location.origin}${session.invitePath || `/s/${session.id}`}`;

  // Enviar voto al backend y avanzar (optimista)
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
        const data = await res.json();
        if (data.matched && data.winner) {
          setWinner(data.winner);
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

      {!finished ? (
        <div className="stage">
          <Card
            key={current.id}
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
          liked={winner ? [winner] : liked}
          scores={results?.results}
          winnerId={results?.winner?.id}
          onRestart={() => {
            setIndex(0);
            setYesIds([]);
            setNoIds([]);
            setWinner(null);
          }}
        />
      )}
    </div>
  );
}
