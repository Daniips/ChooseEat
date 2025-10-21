import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../context/SessionContext";
import Toast from "../components/Toast";
import { CUISINES } from "../data/cuisines";
import Header from "../components/Header";
import { setParticipant } from "../lib/participant";

export default function Lobby() {
  const navigate = useNavigate();
  const { hydrateFromJoin } = useSession();

  const allCuisines = useMemo(() => CUISINES.map(c => c.label), []);

  const [tab, setTab] = useState("filtros");

  const [hostName, setHostName] = useState("");
  const [radiusKm, setRadiusKm] = useState(2);
  const [selectedCuisines, setSelectedCuisines] = useState([...allCuisines]);
  const [price, setPrice] = useState([]);
  const [openNow, setOpenNow] = useState(false);
  const [minRating, setMinRating] = useState(0);

  const [people, setPeople] = useState(2);
  const [requiredYes, setRequiredYes] = useState(2);

  const [previewCount, setPreviewCount] = useState(null);
  const [toastOpen, setToastOpen] = useState(false);

  const cuisinesValid = selectedCuisines.length > 0;
  const thresholdValid =
    people >= 2 && (people === 2 ? true : requiredYes >= 2 && requiredYes <= people);

  useEffect(() => {
    if (people <= 2) setRequiredYes(2);
    else if (requiredYes > people) setRequiredYes(people);
  }, [people, requiredYes]);

  function toggleCuisine(c) {
    setSelectedCuisines(cs => cs.includes(c) ? cs.filter(x => x !== c) : [...cs, c]);
  }
  function togglePrice(n) {
    setPrice(ps => ps.includes(n) ? ps.filter(x => x !== n) : [...ps, n]);
  }

  async function preview() {
    if (!cuisinesValid) return;
    const params = new URLSearchParams();
    params.set("radiusKm", String(radiusKm));
    if (selectedCuisines.length) params.set("cuisines", selectedCuisines.join(","));
    if (price.length) params.set("price", price.join(","));
    if (openNow) params.set("openNow", "true");
    if (minRating) params.set("minRating", String(minRating));

    const res = await fetch(`/api/restaurants?${params.toString()}`);
    const data = await res.json();
    setPreviewCount(data.count ?? (Array.isArray(data.items) ? data.items.length : 0));
    setToastOpen(true);
  }

  async function applyAndStart(e) {
    e.preventDefault();
    if (!cuisinesValid || !thresholdValid) return;

    const area = { radiusKm };
    const filters = { cuisines: selectedCuisines, price, openNow, minRating };
    const finalRequired =
      people <= 2 ? 2 : Math.max(2, Math.min(people, Number(requiredYes) || 2));
    const threshold = { type: "absolute", value: finalRequired, participants: Number(people) };

    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ area, filters, threshold })
    });
    if (!res.ok) {
      alert("No se pudo crear la sesión");
      return;
    }
    const created = await res.json();

    const joinRes = await fetch(`/api/sessions/${created.sessionId}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: hostName || "Host" })
    });
    if (!joinRes.ok) {
      alert("No se pudo unir el host a la sesión");
      return;
    }
    const joined = await joinRes.json();

    setParticipant(created.sessionId, joined.participant, created.invitePath);
    hydrateFromJoin(joined);
    navigate("/vote");
  }

  const TabButton = ({ id, children }) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`tab ${tab === id ? "tab--active" : ""}`}
      aria-pressed={tab === id}
    >
      {children}
    </button>
  );

  return (
    <div className="wrap">
      <Header />

      <div
        className="summary"
        style={{
          maxWidth: 900,
          margin: "24px auto",
          padding: 0,
          overflow: "hidden"
        }}
      >
       
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: 16,
            position: "relative",
            borderBottom: "1px solid var(--line)"
          }}
        >
          <button
              type="button"
              className="btn btn--ghost"
              onClick={() => navigate("/")}
              title="Volver a inicio"
          >
            ← Inicio
          </button>
          <h2 style={{ margin: 0, fontSize: 24, position: "absolute",   left: "50%", transform: "translateX(-50%)"}}>Crear sesión</h2>

          <div style={{ marginLeft: "auto" }} className="small muted">
            {previewCount === null
              ? "Pulsa Previsualizar para estimar resultados"
              : `${previewCount} sitio${previewCount === 1 ? "" : "s"} con estos filtros`}
          </div>
        </div>

        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
          <label htmlFor="host-name" style={{ display: "grid", gap: 6 }}>
            <div className="small">Tu nombre (host)</div>
            <input
              id="host-name"
              className="input"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              placeholder="Introduce tu nombre"
              required
              style={{ maxWidth: 320 }}
            />
          </label>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 120,
            padding: 16,
            position: "relative",
            width: "100%",
          }}
        >
          <TabButton id="zona">Zona</TabButton>
          <TabButton id="filtros">Filtros</TabButton>
          <TabButton id="decisores">Decisores</TabButton>
        </div>

        <div
          style={{
            padding: 16,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16
          }}
        >
          {tab === "zona" && (
            <section style={{ gridColumn: "1 / -1" }}>
              <h3 style={{ margin: "0 0 8px" }}>Zona</h3>
              <label htmlFor="zone-radius" style={{ display: "grid", gap: 6 }}>
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
            </section>
          )}

          {tab === "filtros" && (
            <>
              <section style={{ gridColumn: "1 / -1" }}>
                <div
                  className="row"
                  style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}
                >
                  <h3 style={{ margin: 0 }}>Cocinas</h3>
                  <div className="small">
                    <button
                      type="button"
                      onClick={() => setSelectedCuisines([...allCuisines])}
                      className="link"
                      style={{ padding: 0 }}
                    >
                      Seleccionar todo
                    </button>
                    <span> · </span>
                    <button
                      type="button"
                      onClick={() => setSelectedCuisines([])}
                      className="link"
                      style={{ padding: 0 }}
                    >
                      Limpiar
                    </button>
                  </div>
                </div>

                <div
                  className="chips"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
                    gap: 8
                  }}
                >
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
                  <div className="form-error" role="alert" aria-live="assertive" style={{ marginTop: 8 }}>
                    Debes seleccionar al menos 1 cocina.
                  </div>
                )}
              </section>

              <section>
                <div className="small" style={{ margin: "0 0 6px" }}>Precio</div>
                <div className="chips" style={{ gap: 8 }}>
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
              </section>

              <section>
                <label htmlFor="open-now" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    id="open-now"
                    type="checkbox"
                    checked={openNow}
                    onChange={(e) => setOpenNow(e.target.checked)}
                  />
                  <span>Abierto ahora</span>
                </label>

                <label htmlFor="min-rating" style={{ display: "grid", gap: 6, marginTop: 12 }}>
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
              </section>
            </>
          )}

          {tab === "decisores" && (
            <section style={{ gridColumn: "1 / -1" }}>
              <h3 style={{ margin: "0 0 8px" }}>Decisores</h3>

              <div style={{ display: "grid", gap: 12 }}>
                <label htmlFor="people" style={{ display: "grid", gap: 6 }}>
                  <div className="small">Número de personas que votan</div>
                  <input
                    id="people"
                    type="number"
                    min={2}
                    max={50}
                    step={1}
                    value={people}
                    onChange={(e) =>
                      setPeople(Math.max(2, Math.min(50, Number(e.target.value) || 2)))
                    }
                    className="input"
                    style={{ width: 160 }}
                  />
                </label>

                {people > 2 ? (
                  <label htmlFor="required-yes" style={{ display: "grid", gap: 6 }}>
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
                    <div className="small muted">
                      Consejo: mayoría simple suele funcionar bien (p. ej. {Math.ceil(people / 2)} de {people}).
                    </div>
                  </label>
                ) : (
                  <div className="small" aria-live="polite">
                    Con 2 personas, el umbral se fija en 2 (ambos deben decir SÍ).
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            alignItems: "center",
            padding: 12,
            borderTop: "1px solid var(--line)",
            background: "var(--surface)"
          }}
        >
          <button
            type="button"
            className="btn btn--ghost"
            onClick={preview}
            disabled={!cuisinesValid}
            title={!cuisinesValid ? "Selecciona al menos 1 cocina" : undefined}
          >
            Previsualizar
          </button>
          <button
            type="submit"
            className="btn btn--primary"
            onClick={applyAndStart}
            disabled={!cuisinesValid || (previewCount !== null ? (previewCount === 0 || !thresholdValid) : true)}
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

      <style>{`
        .tab {
          border: 0;
          background: transparent;
          padding: 8px 12px;
          border-radius: 999px;
          cursor: pointer;
        }
        .tab--active {
          background: var(--accent-ghost, rgba(255,122,0,.12));
          color: var(--accent);
        }
        .link { background: transparent; border: 0; color: var(--accent); cursor: pointer; }
        .muted { color: var(--muted); }
      `}</style>
    </div>
  );
}
