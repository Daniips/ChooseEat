import React, { useMemo, useState } from "react";
import { RESTAURANTS } from "./data/restaurants";
import { useArrows } from "./hooks/useArrows";
import Header from "./components/Header";
import Card from "./components/Card";
import Summary from "./components/Summary";
import "./index.css";
import { SessionProvider, useSession } from "./context/SessionContext";
import Lobby from "./components/Lobby";



export default function App() {

    return (
        <SessionProvider>
            <AppInner />
        </SessionProvider>
    );

    function AppInner() {
        const { session } = useSession();

        const [index, setIndex] = useState(0);
        const [yesIds, setYesIds] = useState([]);
        const [, setNoIds] = useState([]);
        const [keySwipe, setKeySwipe] = useState(null);

        const list = useMemo(() => {
            if (session?.candidates?.length) {
                const byId = new Map(RESTAURANTS.map(r => [r.id, r]));
                return session.candidates.map(id => byId.get(id)).filter(Boolean);
            }
            return RESTAURANTS;
        }, [session?.candidates]);

        const current = list[index] || null;
        const finished = !current;

        function vote(choice) {
            if (!current) return;
            if (choice === "yes") setYesIds(s => [...s, current.id]);
            else setNoIds(s => [...s, current.id]);
            setIndex(i => i + 1);
        }

        useArrows({ left: () => setKeySwipe("left"), right: () => setKeySwipe("right") }, [index]);

        const liked = useMemo(() => list.filter(x => yesIds.includes(x.id)), [yesIds, list]);

        if (session.status === "lobby") {
            return (
                <div className="wrap">
                    <Header />
                    <Lobby />
                </div>
            );
        }

        return (
            <div className="wrap">
                <Header />
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
                            <button type="button" className="btn-circle btn-circle--no" onClick={() => setKeySwipe("left")} aria-label="No">×</button>
                            <button type="button" className="btn-circle btn-circle--yes" onClick={() => setKeySwipe("right")} aria-label="Sí">✓</button>
                        </div>
                    </div>
                ) : (
                    <Summary
                        liked={liked}
                        onRestart={() => {
                            setIndex(0);
                            setYesIds([]);
                            setNoIds([]);
                        }}
                    />
                )}
            </div>
        );
    }
}