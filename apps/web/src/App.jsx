import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SessionProvider } from "./context/SessionContext";
import Landing from "./views/Landing";
import Lobby from "./views/Lobby";
import Vote from "./views/Vote";
import JoinSession from "./views/JoinSession";
import "./index.css";

export default function App() {
    return (
        <SessionProvider>
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/create" element={<Lobby />} />
                <Route path="/vote" element={<Vote />} />
                <Route path="/s/:id" element={<JoinSession />} />
            </Routes>
        </SessionProvider>   
    );
}
