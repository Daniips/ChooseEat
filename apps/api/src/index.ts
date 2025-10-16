import Fastify from "fastify";
import cors from "@fastify/cors";

import { InMemoryRestaurantProvider } from "./providers/InMemoryRestaurantProvider";
import { MOCK_RESTAURANTS } from "./data/restaurants";
import { Area, Filters } from "./types";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

// En el futuro GooglePlacesProvider.
const provider = new InMemoryRestaurantProvider(MOCK_RESTAURANTS);

app.get("/health", async () => ({ ok: true }));


app.get("/api/restaurants", async (req) => {
    const q = req.query as any;

    const radiusKm = Number(q.radiusKm ?? 2);
    const cuisines = q.cuisines
        ? String(q.cuisines).split(",").map(s => s.trim()).filter(Boolean)
        : [];
    const price = q.price
        ? String(q.price).split(",").map(n => Number(n))
        : undefined;
    const openNow = String(q.openNow) === "true";
    const minRating = q.minRating ? Number(q.minRating) : undefined;

    const filters: Filters = { cuisines, price, openNow, minRating };

    const { items } = await provider.search({ radiusKm, filters });
    return { count: items.length, items };
});

// Sesiones en memoria (temporal)
const sessions = new Map<string, any>();


app.post("/api/sessions", async (req, reply) => {
    const body = (req.body as any) ?? {};
    const area: Area = body.area;
    const filters: Filters = body.filters;
    const threshold = body.threshold; // { type: 'absolute', value, participants }

    if (!area?.radiusKm || !Array.isArray(filters?.cuisines) || filters.cuisines.length === 0) {
        return reply.code(400).send({ error: "Parámetros inválidos" });
    }

    const { items } = await provider.search({ radiusKm: area.radiusKm, filters });

    const sessionId = "s_" + Math.random().toString(36).slice(2, 10);
    const session = {
        id: sessionId,
        area,
        filters,
        threshold,
        status: "open",
        restaurants: items,
        createdAt: new Date().toISOString()
    };
    sessions.set(sessionId, session);

    return reply.send({
        sessionId,
        invitePath: `/s/${sessionId}`,
        count: items.length,
        session: {
            id: session.id,
            area: session.area,
            filters: session.filters,
            threshold: session.threshold,
            status: session.status
        },
        restaurants: items
    });
});

app.get("/api/sessions/:id", async (req, reply) => {
    const { id } = (req.params as any);
    const s = sessions.get(id);
    if (!s) return reply.code(404).send({ error: "Session not found" });
    return reply.send(s);
});

const port = Number(process.env.PORT || 4000);
app.listen({ port, host: "0.0.0.0" }).then(() => {
    app.log.info(`API on http://localhost:${port}`);
});
