// src/context/SessionContext.jsx
import React, { createContext, useContext, useMemo, useState } from "react";
import { setParticipant } from "../lib/participant";

const SessionContext = createContext(null);

const INITIAL_SESSION = {
  id: null,
  name: null,
  status: "lobby",               
  area: { type: "host", center: null, radiusKm: 1.5, label: "" },
  filters: { price: [1,2,3,4], cuisines: [], openNow: false, minRating: 0 },
  threshold: { type: "absolute", value: 2, participants: 2 },
  invitePath: null,
  restaurants: [],                 
  winner: null
};

export function SessionProvider({ children }) {
  const [session, setSession] = useState(INITIAL_SESSION);
  const setArea = (patch)     => setSession(s => ({ ...s, area: { ...s.area, ...patch }}));
  const setFilters = (patch)  => setSession(s => ({ ...s, filters: { ...s.filters, ...patch }}));
  const setThreshold = (patch)=> setSession(s => ({ ...s, threshold: { ...s.threshold, ...patch }}));
  const setWinner = (winner) => setSession(s => ({ ...s, winner }));

  function bootSession(payload) {
    const { id, invitePath, area, filters, threshold, restaurants, name } = payload;
    setSession(s => ({
      ...s,
      id,
      name: name ?? s.name,
      status: "voting",
      invitePath: invitePath ?? s.invitePath,
      area: area ?? s.area,
      filters: filters ?? s.filters,
      threshold: threshold ?? s.threshold,
      restaurants: Array.isArray(restaurants) ? restaurants : [],
      winner: null
    }));
  }

  function hydrateFromJoin(payload) {
    if (!payload || !payload.session) {
      console.error("hydrateFromJoin: payload/session ausente o inválido:", payload);
      return false;
    }

    const { session: s, restaurants, invitePath, participant, winner, expiresAt } = payload;

    let safeRestaurants = [];
    if (Array.isArray(restaurants)) {
      const seen = new Set();
      for (const r of restaurants) {
        if (r && typeof r.id === "string" && !seen.has(r.id)) {
          seen.add(r.id);
          safeRestaurants.push(r);
        }
      }
    }

    setSession(prev => ({
      ...prev,
      id: s?.id ?? prev.id,
      name: s?.name ?? prev.name,
      status: s?.status || "voting",
      area: s?.area ?? prev.area,
      filters: s?.filters ?? prev.filters,
      threshold: s?.threshold ?? prev.threshold,
      invitePath: typeof invitePath === "string" ? invitePath : prev.invitePath,
      restaurants: safeRestaurants,
      winner: winner ?? null
    }));

    let stored = true;
    try {
      if (participant && s?.id) {
        setParticipant(s.id, participant, invitePath, { expiresAt });
      } else {
        localStorage.setItem("ce_participant", JSON.stringify(participant || null));
        localStorage.setItem("ce_sessionId", s.id);
      }
    } catch (e) {
      stored = false;
      console.error("hydrateFromJoin: no se pudo persistir en localStorage:", e);
    }
    return stored;
  }

  const value = useMemo(() => ({
    session,
    setArea, setFilters, setThreshold,
    bootSession,
    hydrateFromJoin,
    setWinner
  }), [session]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
