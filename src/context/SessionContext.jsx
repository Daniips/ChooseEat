import React, { createContext, useContext, useMemo, useState } from "react";
import { RESTAURANTS } from "../data/restaurants";

function haversineKm(a, b) {
    const R = 6371;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const s1 = Math.sin(dLat / 2) ** 2;
    const s2 = Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * (Math.sin(dLng / 2) ** 2);
    return 2 * R * Math.asin(Math.sqrt(s1 + s2));
}

function djb2(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h) + str.charCodeAt(i);
    return h >>> 0;
}

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
    const [session, setSession] = useState({
        id: "s_demo",
        status: "lobby", // 'lobby' | 'voting' | 'matched' | 'finished'
        area: {
            type: "host",
            center: { lat: 40.4168, lng: -3.7038 }, // Madrid centro
            radiusKm: 1.5,
            label: "Centro"
        },
        filters: {
            price: [1, 2, 3, 4],
            cuisines: [],
            openNow: false,
            minRating: 0
        },
        deckSeed: "seed_demo",
        candidates: [],
        threshold: { type: "absolute", value: 2 },
        winner: null
    });

    // Setters sencillos
    const setArea = (patch) => setSession(s => ({ ...s, area: { ...s.area, ...patch } }));
    const setFilters = (patch) => setSession(s => ({ ...s, filters: { ...s.filters, ...patch } }));
    const setThreshold = (patch) => setSession(s => ({ ...s, threshold: { ...s.threshold, ...patch } }));


    function buildDeck(all, s) {
        const inRadius = all.filter(p => (typeof p.distanceKm === "number")
            ? p.distanceKm <= s.area.radiusKm
            : true 
        );

 
        const byFilters = inRadius.filter(p => {
            const okPrice = s.filters.price.length ? s.filters.price.includes(p.price) : true;
            const okCuisine = s.filters.cuisines.length
                ? p.cuisine.some(c => s.filters.cuisines.includes(c))
                : true;
            const okOpen = s.filters.openNow ? p.openNow : true;
            const okRating = p.rating >= (s.filters.minRating || 0);
            return okPrice && okCuisine && okOpen && okRating;
        });

        const ranked = byFilters
            .map(p => ({ id: p.id, rank: djb2(`${s.id}:${s.deckSeed}:${p.id}`) }))
            .sort((a, b) => a.rank - b.rank)
            .map(x => x.id);


        return ranked.slice(0, 30);
    }

    function startVoting() {
        setSession(s => {
            const candidates = buildDeck(RESTAURANTS, s);
            return { ...s, candidates, status: "voting" };
        });
    }

    const value = useMemo(() => ({
        session,
        setArea,
        setFilters,
        setThreshold,
        startVoting
    }), [session]);

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
