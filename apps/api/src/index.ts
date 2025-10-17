import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyIO from "fastify-socket.io";

import { InMemoryRestaurantProvider } from "./providers/InMemoryRestaurantProvider";
import { MOCK_RESTAURANTS } from "./data/restaurants";
import { Area, Filters, Restaurant } from "./types";

import type { Server as IOServer, Socket } from "socket.io";

declare module "fastify" {
    interface FastifyInstance {
        io: IOServer;
    }
}

type Choice = "yes" | "no";

type Participant = {
    id: string;
    name: string;
    joinedAt: string;
};

type VoteBuckets = {
    yes: Set<string>;
    no: Set<string>;
};

type SessionStatus = "open" | "voting" | "matched" | "finished";

type Session = {
    id: string;
    area: Area;
    filters: Filters;
    threshold: { type: "absolute"; value: number; participants: number };
    status: SessionStatus;
    restaurants: Restaurant[];
    createdAt: string;
    participants: Record<string, Participant>;
    votes: Record<string, VoteBuckets>;
    winner?: Restaurant;
};

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

await app.register(fastifyIO, {
    cors: { origin: true }
});

const provider = new InMemoryRestaurantProvider(MOCK_RESTAURANTS);

app.get("/health", async () => ({ ok: true }));

app.get("/api/restaurants", async (req) => {
    const q = req.query as any;

    const radiusKm = Number(q.radiusKm ?? 2);
    const cuisines = q.cuisines
        ? String(q.cuisines).split(",").map((s) => s.trim()).filter(Boolean)
        : [];
    const price = q.price
        ? String(q.price).split(",").map((n) => Number(n))
        : undefined;
    const openNow = String(q.openNow) === "true";
    const minRating = q.minRating ? Number(q.minRating) : undefined;

    const filters: Filters = { cuisines, price, openNow, minRating };
    const { items } = await provider.search({ radiusKm, filters });
    return { count: items.length, items };
});

const sessions = new Map<string, Session>();

app.post("/api/sessions", async (req, reply) => {
    const body = (req.body as any) ?? {};
    const area: Area = body.area;
    const filters: Filters = body.filters;
    const threshold = body.threshold as Session["threshold"]; // { type: 'absolute', value, participants }

    if (!area?.radiusKm || !Array.isArray(filters?.cuisines) || filters.cuisines.length === 0) {
        return reply.code(400).send({ error: "Parámetros inválidos" });
    }

    const { items } = await provider.search({ radiusKm: area.radiusKm, filters });

    const sessionId = "s_" + Math.random().toString(36).slice(2, 10);
    const session: Session = {
        id: sessionId,
        area,
        filters,
        threshold,
        status: "open",
        restaurants: items,
        createdAt: new Date().toISOString(),
        participants: {},
        votes: {}
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

app.post("/api/sessions/:id/join", async (req, reply) => {
    const { id } = req.params as any;
    const body = (req.body as any) ?? {};
    const name = String(body.name || "").trim() || "Invitado";

    const s = sessions.get(id);
    if (!s) return reply.code(404).send({ error: "Session not found" });

    const pid = "p_" + Math.random().toString(36).slice(2, 10);
    const participant: Participant = { id: pid, name, joinedAt: new Date().toISOString() };
    s.participants[pid] = participant;


    if (s.status === "open") s.status = "voting";

    try {
        app.io.to(id).emit("participant:joined", {
            sessionId: id,
            participant: { id: pid, name },
            participants: Object.values(s.participants)
        });
    } catch {
        // noop
    }

    return reply.send({
        sessionId: id,
        participant: { id: pid, name },
        invitePath: `/s/${id}`,
        session: {
            id: s.id,
            area: s.area,
            filters: s.filters,
            threshold: s.threshold,
            status: s.status
        },
        restaurants: s.restaurants,
        winner: s.winner ?? null
    });
});


app.get("/api/sessions/:id", async (req, reply) => {
    const { id } = req.params as any;
    const s = sessions.get(id);
    if (!s) return reply.code(404).send({ error: "Session not found" });
    return reply.send(s);
});


app.post("/api/sessions/:id/votes", async (req, reply) => {
  const { id } = (req.params as any);
  const { participantId, restaurantId, choice } = (req.body as any) as {
    participantId?: string;
    restaurantId?: string;
    choice?: Choice;
  };

  const s = sessions.get(id);
  if (!s) return reply.code(404).send({ error: "Session not found" });
  if (!participantId || !s.participants?.[participantId]) {
    return reply.code(403).send({ error: "Unknown participant" });
  }
  if (!restaurantId || (choice !== "yes" && choice !== "no")) {
    return reply.code(400).send({ error: "Bad vote payload" });
  }

  const bucket: VoteBuckets = s.votes[restaurantId] ?? { yes: new Set<string>(), no: new Set<string>() };
  s.votes[restaurantId] = bucket;

  bucket.yes.delete(participantId);
  bucket.no.delete(participantId);
  (choice === "yes" ? bucket.yes : bucket.no).add(participantId);

  const yesCount = bucket.yes.size;
  const needed = s.threshold?.value ?? 2;
  const matched = yesCount >= needed;

  if (matched && s.status !== "matched") {
    const winner = s.restaurants.find(r => r.id === restaurantId);
    if (winner) {
      s.status = "matched";
      s.winner = winner; 
      try {
        app.io.to(id).emit("session:matched", { sessionId: id, winner });
      } catch {}
    } else {
      app.log.warn({ id: restaurantId }, "winner restaurant not found in session");
    }
  }

  return reply.send({
    ok: true,
    matched: s.status === "matched",
    winner: s.winner ?? null,
    yesCount,
    needed
  });
});


app.ready().then(() => {
  app.io.on("connection", (socket: Socket) => {
    app.log.info({ id: socket.id }, "socket connected");

    socket.on("session:join", (payload: { sessionId?: string }) => {
      const sessionId = payload?.sessionId;
      if (!sessionId) return;                
      socket.join(sessionId);

      const s = sessions.get(sessionId);
      if (s) {
        socket.emit("session:participants", {
          sessionId: s.id,
          participants: Object.values(s.participants),
        });
      }
    });

    socket.on("vote", (payload: {
      sessionId?: string;
      participantId?: string;
      restaurantId?: string;
      choice?: "yes" | "no";
    }) => {
      const { sessionId, participantId, restaurantId, choice } = payload || {};
      if (!sessionId) return;

      const s = sessions.get(sessionId);
      if (!s || !participantId || !s.participants?.[participantId] || !restaurantId || (choice !== "yes" && choice !== "no")) {
        return;
      }

      const bucket = s.votes[restaurantId] ?? { yes: new Set<string>(), no: new Set<string>() };
      s.votes[restaurantId] = bucket;

      bucket.yes.delete(participantId);
      bucket.no.delete(participantId);
      (choice === "yes" ? bucket.yes : bucket.no).add(participantId);

      const yesCount = bucket.yes.size;
      const needed = s.threshold?.value ?? 2;
      const matched = yesCount >= needed;

      app.io.to(s.id).emit("session:vote", { participantId, restaurantId, choice, yesCount, needed });

      if (matched && s.status !== "matched") {
        const winner = s.restaurants.find(r => r.id === restaurantId);
        if (winner) {
          s.status = "matched";
          s.winner = winner;
          app.io.to(s.id).emit("session:matched", { sessionId: s.id, winner });
        } else {
          app.log.warn({ id: restaurantId }, "winner restaurant not found in session");
        }
      }
    });

    socket.on("disconnect", () => {
      app.log.info({ id: socket.id }, "socket disconnected");
    });
  });
});

const port = Number(process.env.PORT || 4000);
app.listen({ port, host: "0.0.0.0" }).then(() => {
    app.log.info(`API on http://localhost:${port}`);
});

function computeResults(s: Session) {
  const results = s.restaurants.map(r => {
    const b = s.votes[r.id] ?? { yes: new Set<string>(), no: new Set<string>() };
    const yes = b.yes.size;
    const no  = b.no.size;
    return {
      restaurantId: r.id,
      name: r.name,
      img: (r as any).img,
      yes,
      no,
      total: yes + no
    };
  }).sort((a, b) => b.yes - a.yes);

  return {
    sessionId: s.id,
    status: s.status,
    winner: s.winner ?? null,
    results
  };
}

app.get("/api/sessions/:id/results", async (req, reply) => {
  const { id } = req.params as any;
  const s = sessions.get(id);
  if (!s) return reply.code(404).send({ error: "Session not found" });
  return reply.send(computeResults(s));
});