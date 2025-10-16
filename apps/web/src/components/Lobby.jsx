import React, { useMemo, useState, useEffect } from "react";
import { useSession } from "../context/SessionContext";
import Toast from "./Toast";
import { CUISINES } from "../data/cuisines";

export default function Lobby() {
    const { session, setArea, setFilters, setThreshold, startVoting } = useSession();
    const allCuisines = useMemo(() => CUISINES.map(c => c.label), []);

    const [radiusKm, setRadiusKm] = useState(session.area.radiusKm);
    const [selectedCuisines, setSelectedCuisines] = useState(() =>
        session.filters.cuisines?.length ? session.filters.cuisines : allCuisines
    );
    const [price, setPrice] = useState(session.filters.price || []);
    const [openNow, setOpenNow] = useState(!!session.filters.openNow);
    const [minRating, setMinRating] = useState(session.filters.minRating || 0);

    const [people, setPeople] = useState(session.threshold?.participants || 2);
    const [requiredYes, setRequiredYes] = useState(
        typeof session.threshold?.value === "number" ? session.threshold.value : 2
    );

    const [previewCount, setPreviewCount] = useState(null);
    const [toastOpen, setToastOpen] = useState(false);

    const cuisinesValid = selectedCuisines.length > 0;

    useEffect(() => {
        if (people <= 2) {
            setRequiredYes(2);
        } else if (requiredYes > people) {
            setRequiredYes(people);
        }
    }, [people]); // eslint-disable-line react-hooks/exhaustive-deps

    function toggleCuisine(c) {
        setSelectedCuisines(cs => cs.includes(c) ? cs.filter(x => x !== c) : [...cs, c]);
    }

    function togglePrice(n) {
        setPrice(ps => ps.includes(n) ? ps.filter(x => x !== n) : [...ps, n]);
    }

    // NUEVO: previsualiza contra el backend
    async function previewFromApi() {
        if (!cuisinesValid) {
            setPreviewCount(0);
            setToastOpen(true);
            return;
        }

        const qs = new URLSearchParams();
        qs.set("radiusKm", String(radiusKm));
        if (selectedCuisines.length > 0) qs.set("cuisines", selectedCuisines.join(","));
        if (price.length > 0) qs.set("price", price.join(","));
        if (openNow) qs.set("openNow", "true");
        if (minRating) qs.set("minRating", String(minRating));

        try {
            const res = await fetch(`/api/restaurants?${qs.toString()}`);
            if (!res.ok) throw new Error("Bad response");
            const data = await res.json();
            setPreviewCount(data.count);
        } catch (e) {
            console.error(e);
            setPreviewCount(0);
        } finally {
            setToastOpen(true);
        }
    }

    const thresholdValid = people >= 2 && (people === 2 ? true : (requiredYes >= 2 && requiredYes <= people));

  
    async function applyAndStart() {
        if (!cuisinesValid) return;

        const area = { radiusKm };
        const filters = { cuisines: selectedCuisines, price, openNow, minRating };
        const threshold = {
            type: "absolute",
            value: people <= 2 ? 2 : Math.max(2, Math.min(people, Number(requiredYes) || 2)),
            participants: Number(people)
        };

        try {
            const res = await fetch("/api/sessions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ area, filters, threshold })
            });
            if (!res.ok) {
                console.error("Error creando sesión");
                return;
            }
            const data = await res.json();
            // data: { sessionId, invitePath, count, session, restaurants }

            // Guarda en tu contexto lo que ya guardabas
            setArea(area);
            setFilters(filters);
            setThreshold(threshold);

            startVoting(data.sessionId, data.restaurants);
        } catch (e) {
            console.error(e);
        }
    }

    return (
        <form
            className="summary"
            style={{ maxWidth: 720, margin: "24px auto" }}
            onSubmit={(e) => {
                e.preventDefault();
                applyAndStart();
            }}
        >
            <h2>Crear sesión</h2>

            <div className="next" role="status" aria-live="polite">
                {previewCount === null
                    ? "Pulsa Previsualizar para ver cuántos sitios hay con estos filtros."
                    : `${previewCount} sitio${previewCount === 1 ? "" : "s"} con estos filtros.`}
                {previewCount !== null && previewCount > 0 && previewCount < 5 && (
                    <span style={{ marginLeft: 6 }}>Poca oferta: amplía el radio o relaja filtros.</span>
                )}
            </div>

            <div style={{ display: "grid", gap: 16 }}>
                <section>
                    <h3 style={{ margin: "0 0 8px" }}>Zona</h3>
                    <div style={{ display: "grid", gap: 10 }}>
                        {/*selector de mapa */}
                        <label htmlFor="zone-radius">
                            <div className="small">Radio: {radiusKm.toFixed(1)} km</div>
                            <input
                                id="zone-radius"
                                type="range"
                                min={0.5}
                                max={5}
                                step={0.1}
                                value={radiusKm}
                                onChange={(e) => setRadiusKm(Number(e.target.value))}
                                className="range"
                            />
                        </label>
                    </div>
                </section>

                <section>
                    <h3 style={{ margin: "0 0 8px" }}>Filtros</h3>

                    <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <div className="small">Cocinas</div>
                        <div className="small">
                            <button
                                type="button"
                                onClick={() => setSelectedCuisines([...allCuisines])}
                                style={{ background: "transparent", border: 0, color: "var(--accent)", cursor: "pointer", padding: 0 }}
                            >
                                Seleccionar todo
                            </button>
                            <span> · </span>
                            <button
                                type="button"
                                onClick={() => setSelectedCuisines([])}
                                style={{ background: "transparent", border: 0, color: "var(--accent)", cursor: "pointer", padding: 0 }}
                            >
                                Limpiar
                            </button>
                        </div>
                    </div>

                    <div className="chips">
                        {allCuisines.map(c => {
                            const active = selectedCuisines.includes(c);
                            return (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => toggleCuisine(c)}
                                    className={`chip${active ? " chip--active" : ""}`}
                                    aria-pressed={active}
                                >
                                    {c}
                                </button>
                            );
                        })}
                    </div>

                    {!cuisinesValid && (
                        <div className="form-error" role="alert" aria-live="assertive" style={{ marginTop: 6 }}>
                            Debes seleccionar al menos 1 cocina.
                        </div>
                    )}

                    <div className="small" style={{ margin: "12px 0 6px" }}>Precio</div>
                    <div className="chips">
                        {[1, 2, 3, 4].map(n => {
                            const active = price.includes(n);
                            return (
                                <button
                                    key={n}
                                    type="button"
                                    onClick={() => togglePrice(n)}
                                    className={`chip${active ? " chip--active" : ""}`}
                                    aria-pressed={active}
                                >
                                    {"$".repeat(n)}
                                </button>
                            );
                        })}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                        <label htmlFor="open-now" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <input
                                id="open-now"
                                type="checkbox"
                                checked={openNow}
                                onChange={(e) => setOpenNow(e.target.checked)}
                            />
                            <span>Abierto ahora</span>
                        </label>

                        <label htmlFor="min-rating">
                            <div className="small">Rating mínimo: {minRating.toFixed(1)}</div>
                            <input
                                id="min-rating"
                                type="range"
                                min={0}
                                max={5}
                                step={0.1}
                                value={minRating}
                                onChange={(e) => setMinRating(Number(e.target.value))}
                                className="range"
                            />
                        </label>
                    </div>
                </section>

                <section>
                    <h3 style={{ margin: "0 0 8px" }}>Decisores</h3>
                    <div style={{ display: "grid", gap: 12 }}>
                        <label htmlFor="people">
                            <div className="small">Número de personas que votan</div>
                            <input
                                id="people"
                                type="number"
                                min={2}
                                max={50}
                                step={1}
                                value={people}
                                onChange={(e) => setPeople(Math.max(2, Math.min(50, Number(e.target.value) || 2)))}
                                className="input"
                                style={{ width: 160 }}
                            />
                        </label>

                        {people > 2 && (
                            <label htmlFor="required-yes">
                                <div className="small">Se necesita el SÍ de:</div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <input
                                        id="required-yes"
                                        type="number"
                                        min={2}
                                        max={people}
                                        step={1}
                                        value={requiredYes}
                                        onChange={(e) => {
                                            const v = Number(e.target.value) || 2;
                                            setRequiredYes(Math.max(2, Math.min(people, v)));
                                        }}
                                        className="input"
                                        style={{ width: 120 }}
                                    />
                                    <span className="small">de {people} persona{people === 1 ? "" : "s"}</span>
                                </div>
                                <div className="small" style={{ marginTop: 6 }}>
                                    Consejo: mayoría simple suele funcionar bien (p. ej. {Math.ceil(people / 2)} de {people}).
                                </div>
                            </label>
                        )}

                        {people === 2 && (
                            <div className="small" aria-live="polite">
                                Con 2 personas, el umbral se fija en 2 (ambos deben decir SÍ).
                            </div>
                        )}
                    </div>
                </section>

                <div className="summary__actions" style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                    <button
                        type="button"
                        className="btn btn--ghost"
                        onClick={previewFromApi}
                        disabled={!cuisinesValid}
                        title={!cuisinesValid ? "Selecciona al menos 1 cocina" : undefined}
                    >
                        Previsualizar
                    </button>
                    <button
                        type="submit"
                        className="btn btn--primary"
                        disabled={
                            !cuisinesValid ||
                            (previewCount !== null
                                ? (previewCount === 0 || !thresholdValid)
                                : true)
                        }
                        title={
                            !cuisinesValid
                                ? "Selecciona al menos 1 cocina"
                                : (previewCount === 0
                                    ? "No hay resultados con estos filtros"
                                    : (!thresholdValid ? "Ajusta el umbral" : undefined))
                        }
                    >
                        Empezar a votar
                    </button>
                </div>
            </div>

            <Toast
                open={toastOpen}
                onClose={() => setToastOpen(false)}
                variant={previewCount === 0 ? "warn" : "ok"}
            >
                {previewCount === 0
                    ? "No hay resultados con estos filtros."
                    : `${previewCount} sitio${previewCount === 1 ? "" : "s"} disponibles con estos filtros.`}
            </Toast>
        </form>
    );
}
