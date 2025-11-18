import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SessionProvider } from "./context/SessionContext";
import Landing from "./views/Landing";
import Lobby from "./views/Lobby";
import Vote from "./views/Vote";
import JoinSession from "./views/JoinSession";
import Privacy from "./views/Privacy";
import Terms from "./views/Terms";
import Cookies from "./views/Cookies";
import Legal from "./views/Legal";
import NotFound from "./views/NotFound";    
import "./index.css";

export default function App() {
    return (
        <SessionProvider>
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/create" element={<Lobby />} />
                <Route path="/vote/:sessionId" element={<Vote />} />
                <Route path="/s/:id" element={<JoinSession />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/cookies" element={<Cookies />} />
                <Route path="/legal" element={<Legal />} />
                <Route path="*" element={<NotFound />} />
            </Routes>
        </SessionProvider>   
    );
}
