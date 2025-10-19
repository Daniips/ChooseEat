import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import { useSession } from "../context/SessionContext";
import { api } from "../lib/api";
import { getParticipantId, setParticipant, migrateFromLegacy } from "../lib/participant";


export default function JoinSession() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { hydrateFromJoin } = useSession();
    const [name, setName] = useState("");
    const [error, setError] = useState("");

    async function handleJoin(e) {
        e.preventDefault();
        setError("");

        if (!id) {
            setError("Enlace inválido (no hay id de sesión).");
            return;
        }

        try {
            migrateFromLegacy(id);

            const existingId = getParticipantId(id);
            const body = existingId
            ? { participantId: existingId, name }
            : { name };

            const data = await api(`/api/sessions/${id}/join`, {
            method: "POST",
            body: JSON.stringify(body)
            });

            setParticipant(id, data.participant);

            hydrateFromJoin(data);
            navigate("/vote");
        } catch (err) {
            console.error("join error:", err);
            setError("No se pudo unir a la sesión. " + (err?.message || ""));
        }
    }


    return (
        <div className="wrap">
            <Header />
            <form className="summary" style={{ maxWidth: 520, margin: "24px auto" }} onSubmit={handleJoin}>
                <h2>Unirse a sesión</h2>

                <label htmlFor="name">
                    <div className="small">Tu nombre</div>
                    <input
                        id="name"
                        className="input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ej. Dani"
                        required
                    />
                </label>

                {error && (
                    <div className="form-error" role="alert" style={{ marginTop: 8 }}>
                        {error}
                    </div>
                )}

                <div className="summary__actions" style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
                    <button type="submit" className="btn btn--primary">Unirme</button>
                </div>
            </form>
        </div>
    );
}
