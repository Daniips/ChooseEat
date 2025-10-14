import React, { useMemo, useState } from "react";
import { RESTAURANTS } from "./data/restaurants";
import { useArrows } from "./hooks/useArrows";
import Header from "./components/Header";
import Card from "./components/Card";
import Summary from "./components/Summary";
import "./index.css";


export default function App() {
const [index, setIndex] = useState(0);
const [yesIds, setYesIds] = useState([]);
const [, setNoIds] = useState([]);
const [keySwipe, setKeySwipe] = useState(null);


const current = RESTAURANTS[index] || null;
const finished = !current;


function vote(choice) {
if (!current) return;
if (choice === "yes") setYesIds((s) => [...s, current.id]);
else setNoIds((s) => [...s, current.id]);
setIndex((i) => i + 1);
}


useArrows({ left: () => setKeySwipe('left'), right: () => setKeySwipe('right') }, [index]);


const liked = useMemo(() => RESTAURANTS.filter(x => yesIds.includes(x.id)), [yesIds]);


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
                <button className="fab fab--no" onClick={() => setKeySwipe('left')} aria-label="No">×</button>
                <button className="fab fab--yes" onClick={() => setKeySwipe('right')} aria-label="Sí">✓</button>
            </div>
        </div>
    ) : (
        <Summary liked={liked} onRestart={() => { setIndex(0); setYesIds([]); setNoIds([]); }} />
    )}
</div>
);
}