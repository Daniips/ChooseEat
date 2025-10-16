import React, { createContext, useContext, useMemo, useState } from "react";

const SessionContext = createContext(null);

// OJO: constante interna, sin exportarla
const INITIAL_SESSION = {
    id: "s_local",
    status: "lobby", // 'lobby' | 'voting' | 'matched' | 'finished'
    area: {
        type: "host",
        center: null,
        radiusKm: 1.5,
        label: ""
    },
    filters: {
        price: [1, 2, 3, 4],
        cuisines: [],
        openNow: false,
        minRating: 0
    },
    deckSeed: "seed_demo",
    candidates: [],
    threshold: { type: "absolute", value: 2, participants: 2 },
    invitePath: null,
    winner: null
};

export function SessionProvider({ children }) {
    const [session, setSession] = useState(INITIAL_SESSION);

    const setArea = (patch) =>
        setSession((s) => ({ ...s, area: { ...s.area, ...patch } }));

    const setFilters = (patch) =>
        setSession((s) => ({ ...s, filters: { ...s.filters, ...patch } }));

    const setThreshold = (patch) =>
        setSession((s) => ({ ...s, threshold: { ...s.threshold, ...patch } }));

    function startVoting(sessionId, restaurants, invitePath) {
        setSession((s) => ({
            ...s,
            id: sessionId ?? s.id,
            status: "voting",
            invitePath: invitePath ?? s.invitePath,
            restaurants: Array.isArray(restaurants) ? restaurants : s.restaurants
        }));
    }

    function hydrateFromJoin(payload) {
        const { session: s, restaurants, invitePath, participant } = payload;

        setSession((prev) => ({
            ...prev,
            id: s.id,
            status: "voting",
            area: s.area,
            filters: s.filters,
            threshold: s.threshold,
            invitePath,
            restaurants: Array.isArray(restaurants) ? restaurants : [],
            candidates: Array.isArray(restaurants) ? restaurants.map((r) => r.id) : [],
            winner: null
        }));

        try {
            localStorage.setItem("ce_participant", JSON.stringify(participant));
            localStorage.setItem("ce_sessionId", s.id);
        } catch {
            //nada
        }
    }


    const value = useMemo(
        () => ({
            session,
            setArea,
            setFilters,
            setThreshold,
            startVoting,
            hydrateFromJoin
        }),
        [session]
    );

    return (
        <SessionContext.Provider value={value}>
            {children}
        </SessionContext.Provider>
    );
}

export function useSession() {
    const ctx = useContext(SessionContext);
    if (!ctx) throw new Error("useSession must be used within SessionProvider");
    return ctx;
}
