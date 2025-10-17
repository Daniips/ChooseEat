// src/context/SessionContext.jsx
import React, { createContext, useContext, useMemo, useState } from "react";

const SessionContext = createContext(null);

const INITIAL_SESSION = {
  id: null,
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
    const { id, invitePath, area, filters, threshold, restaurants } = payload;
    setSession(s => ({
      ...s,
      id,
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
    const { session: s, restaurants, invitePath, participant, winner } = payload;
    setSession(prev => ({
      ...prev,
      id: s.id,
      status: s?.status || "voting",
      area: s.area,
      filters: s.filters,
      threshold: s.threshold,
      invitePath,
      restaurants: Array.isArray(restaurants) ? restaurants : [],
      winner: winner ?? null
    }));
    try {
      localStorage.setItem("ce_participant", JSON.stringify(participant));
      localStorage.setItem("ce_sessionId", s.id);
    } catch {
        //nada
    }
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
