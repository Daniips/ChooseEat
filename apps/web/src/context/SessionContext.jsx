import React, { createContext, useContext, useMemo, useState } from "react";

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
    const [session, setSession] = useState({
        id: null,                       
        sessionId: null,                
        status: "lobby",                
        area: {
            radiusKm: 1.5
        },
        filters: {
            price: [],                  
            cuisines: [],
            openNow: false,
            minRating: 0
        },

        threshold: {
            type: "absolute",
            value: 2,
            participants: 2
        },

        restaurants: [],                
        winner: null                   
    });

    function setArea(patch) {
        setSession(s => ({ ...s, area: { ...s.area, ...patch } }));
    }

    function setFilters(patch) {
        setSession(s => ({ ...s, filters: { ...s.filters, ...patch } }));
    }

    function setThreshold(patch) {
        setSession(s => ({ ...s, threshold: { ...s.threshold, ...patch } }));
    }

    /**
     * startVoting
     * Se llama tras POST /api/sessions
     * @param {string} sessionId 
     * @param {Array} restaurants
     */
    function startVoting(sessionId, restaurants) {
        setSession(s => ({
            ...s,
            status: "voting",
            sessionId: sessionId ?? s.sessionId,
            id: sessionId ?? s.id, // opcional: mantener s.id sincronizado
            restaurants: Array.isArray(restaurants) ? restaurants : []
        }));
    }

    // (Opcional) Reiniciar a lobby
    function resetToLobby() {
        setSession(s => ({
            ...s,
            status: "lobby",
            sessionId: null,
            id: null,
            restaurants: [],
            winner: null
        }));
    }

    const value = useMemo(() => ({
        session,
        setArea,
        setFilters,
        setThreshold,
        startVoting,
        resetToLobby
    }), [session]);

    return (
        <SessionContext.Provider value={value}>
            {children}
        </SessionContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSession() {
    const ctx = useContext(SessionContext);
    if (!ctx) throw new Error("useSession must be used within SessionProvider");
    return ctx;
}
