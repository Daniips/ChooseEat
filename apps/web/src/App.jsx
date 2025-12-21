import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SessionProvider } from "./context/SessionContext";
import Landing from "./views/Landing";
import RouteLoader from "./components/RouteLoader";
import "./index.css";

const Lobby = lazy(() => import("./views/Lobby"));
const Vote = lazy(() => import("./views/Vote"));
const JoinSession = lazy(() => import("./views/JoinSession"));
const Results = lazy(() => import("./views/Results"));
const Privacy = lazy(() => import("./views/Privacy"));
const Terms = lazy(() => import("./views/Terms"));
const Cookies = lazy(() => import("./views/Cookies"));
const Legal = lazy(() => import("./views/Legal"));
const NotFound = lazy(() => import("./views/NotFound"));

export default function App() {
    return (
        <SessionProvider>
            <Suspense fallback={<RouteLoader />}>
                <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/create" element={<Lobby />} />
                    <Route path="/vote/:sessionId" element={<Vote />} />
                    <Route path="/s/:id" element={<JoinSession />} />
                    <Route path="/s/:id/results" element={<Results />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/cookies" element={<Cookies />} />
                    <Route path="/legal" element={<Legal />} />
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </Suspense>
        </SessionProvider>   
    );
}
