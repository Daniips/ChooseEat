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
    done?: boolean; 
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
  status: "open" | "voting" | "matched" | "finished";
  restaurants: Restaurant[];
  createdAt: string;
  participants: Record<string, Participant>;
  votes: Record<string, VoteBuckets>;
  matchedIds: Set<string>;    
  winners?: Restaurant[];               
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
        votes: {},
        matchedIds: new Set(), 
        winners: []
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
  const candidatePid = body.participantId ? String(body.participantId) : undefined;
  const name = String(body.name || "").trim() || "Invitado";

  const s = sessions.get(id);
  if (!s) return reply.code(404).send({ error: "Session not found" });

  let pid: string;
  let created = false;

  if (candidatePid && s.participants[candidatePid]) {
    pid = candidatePid;
    if (name && s.participants[pid].name !== name) {
      s.participants[pid].name = name;
    }
  } else {
    pid = "p_" + Math.random().toString(36).slice(2, 10);
    s.participants[pid] = { id: pid, name, joinedAt: new Date().toISOString() };
    created = true;
    if (s.status === "open") s.status = "voting";
  }

  if (created) {
    try {
      app.io.to(id).emit("participant:joined", {
        sessionId: id,
        participant: { id: pid, name: s.participants[pid].name },
        participants: Object.values(s.participants),
      });
    } catch {}
  }

  return reply.send({
    sessionId: id,
    participant: s.participants[pid],
    invitePath: `/s/${id}`,
    session: {
      id: s.id,
      area: s.area,
      filters: s.filters,
      threshold: s.threshold,
      status: s.status,
    },
    restaurants: s.restaurants,
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
    choice?: "yes" | "no";
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

  const wasAlreadyMatched = s.matchedIds.has(restaurantId);

  bucket.yes.delete(participantId);
  bucket.no.delete(participantId);
  (choice === "yes" ? bucket.yes : bucket.no).add(participantId);

  const yesCount = bucket.yes.size;
  const needed = s.threshold?.value ?? 2;

  const isNewlyMatched = yesCount >= needed && !wasAlreadyMatched;

  if (isNewlyMatched) {
    s.matchedIds.add(restaurantId);
    if (s.status !== "matched") s.status = "matched";
    const w = s.restaurants.find(r => r.id === restaurantId);
    if (w) {
      if (!s.winners) s.winners = [];
      if (!s.winners.some(x => x.id === w.id)) s.winners.push(w);
      try { app.io.to(id).emit("session:matched", { sessionId: id, winner: w }); } catch {}
    }
  }

  const winnerObj =
    yesCount >= needed
      ? (s.restaurants.find(r => r.id === restaurantId) ?? null)
      : null;

  return reply.send({
    ok: true,
    matched: isNewlyMatched,          
    wasAlreadyMatched,                
    winner: winnerObj,                
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

      app.io.to(s.id).emit("session:vote", { participantId, restaurantId, choice, yesCount, needed });

      const isNewlyMatched = yesCount >= needed && !s.matchedIds.has(restaurantId);
      if (isNewlyMatched) {
        s.matchedIds.add(restaurantId);

        if (s.status === "voting") s.status = "matched";

        const winner = s.restaurants.find(r => r.id === restaurantId);
        if (winner) {
          if (!s.winners) s.winners = [];
          if (!s.winners.some(w => w.id === restaurantId)) s.winners.push(winner);

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
  const totalParticipants = Object.keys(s.participants || {}).length;
  const needed = s.threshold?.value ?? 2;

  const rows = s.restaurants.map(r => {
    const b = s.votes[r.id] ?? { yes: new Set<string>(), no: new Set<string>() };
    const yes = b.yes.size;
    const no  = b.no.size;
    const pending = Math.max(0, totalParticipants - yes - no);

    return {
      id: r.id,
      name: r.name,
      img: (r as any).img,
      cuisine: r.cuisine,
      price: r.price,
      rating: r.rating,
      yes,
      no,
      pending,
      total: yes + no,
    };
  }).sort((a, b) => {
    if (b.yes !== a.yes) return b.yes - a.yes;
    return a.no - b.no;
  });

  const winnerIds = rows.filter(x => x.yes >= needed).map(x => x.id);
  const winners = s.winners && s.winners.length
    ? s.winners
    : s.restaurants.filter(r => s.matchedIds.has(r.id));

  return {
    sessionId: s.id,
    status: s.status,
    needed,
    totalParticipants,
    winnerIds,
    winners,
    results: rows,           
  };
}


app.get("/api/sessions/:id/results", async (req, reply) => {
  const { id } = req.params as any;
  const s = sessions.get(id);
  if (!s) return reply.code(404).send({ error: "Session not found" });

  const totalParticipants = Object.keys(s.participants || {}).length;
  const needed = s.threshold?.value ?? 2;

  const results = s.restaurants
    .map(r => {
      const b = s.votes[r.id] ?? { yes: new Set<string>(), no: new Set<string>() };
      const yes = b.yes.size;
      const no  = b.no.size;
      const pending = Math.max(0, totalParticipants - yes - no);
      return {
        id: r.id,
        name: r.name,
        img: r.img,
        cuisine: r.cuisine,
        price: r.price,
        rating: r.rating,
        yes,
        no,
        pending,
        total: yes + no,
      };
    })
    
    .sort((a, b) => (b.yes - a.yes) || (a.no - b.no));

  const winnerIds = results.filter(x => x.yes >= needed).map(x => x.id);
  const winners = (s.winners && s.winners.length)
    ? s.winners
    : s.restaurants.filter(r => s.matchedIds.has(r.id));

  return reply.send({
    sessionId: id,
    status: s.status,
    needed,
    totalParticipants,
    winnerIds,
    winners,
    results,
  });
});

app.post("/api/sessions/:id/done", async (req, reply) => {
  const { id } = req.params as any;
  const { participantId } = (req.body as any) ?? {};

  const s = sessions.get(id);
  if (!s) return reply.code(404).send({ error: "Session not found" });
  const p = participantId ? s.participants?.[participantId] : null;
  if (!p) return reply.code(403).send({ error: "Unknown participant" });

  p.done = true;

  const min = s.threshold?.participants ?? Object.keys(s.participants || {}).length;
  const doneCount = Object.values(s.participants).filter(x => x.done).length;

  if (doneCount >= min && s.status !== "finished") {
    s.status = "finished";
    try { app.io.to(id).emit("session:finished", { sessionId: id }); } catch {}
  }

  return reply.send({ ok: true, status: s.status, doneCount, min });
});

