// apps/api/src/index.ts
import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyIO from "fastify-socket.io";

import { createRestaurantsProvider } from "./providers/index.js";
import { Area, Filters } from "./types.js";
import type { Server as IOServer, Socket } from "socket.io";

import "dotenv/config";
import { ensureRedis, getRedis, isRedisAvailable } from "./redis.js";
import { resyncMemoryToRedis } from "./data/sessionRepo.js";
import { cleanupExpiredSessions } from "./jobs/cleanupSessions.js";

import {
  saveSession,
  getSession,
  updateSession,
  computeResults as computeRepoResults,
  touchSession,
  TTL_DAYS,
  type Session as StoredSession,
  VoteBuckets,
} from "./data/sessionRepo.js";
import { CachedGooglePlacesProvider } from "./providers/google/CachedGooglePlacesProvider.js";
import { redisCache } from "./cache/RedisCache.js";

declare module "fastify" {
  interface FastifyInstance {
    io: IOServer;
  }
}

const isDev = process.env.NODE_ENV !== "production";
const corsOrigin = process.env.CORS_ORIGIN || (isDev ? true : false);

const app = Fastify({ 
  logger: isDev ? true : { level: "info" },
});

await app.register(cors, { origin: corsOrigin });

await app.register(fastifyIO, {
  cors: { origin: corsOrigin },

  pingInterval: 25_000,
  pingTimeout: 20_000,

  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
  },
});

function requireStorage(reply: any) {
  if (!isRedisAvailable()) {
    reply.code(503).send({ error: "Storage unavailable" });
    return false;
  }
  return true;
}

try {
  await ensureRedis();
  app.log.info("[Redis] connected");
  getRedis()?.on("ready", async () => {
    const n = await resyncMemoryToRedis();
    app.log.info(`[Redis] ready – resynced ${n} sessions from memory`);
  });
} catch (err) {
  app.log.error(
    { err },
    "[Redis] failed to connect – running with in-memory store"
  );
}

await redisCache.connect();
app.log.info("[Cache] connected");

const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hora
setInterval(() => {
  cleanupExpiredSessions();
}, CLEANUP_INTERVAL);
app.log.info("[Cleanup] Background job started (runs every hour)");

const useMock = process.env.USE_MOCK === "true";
let provider: any;
if (useMock) {
  provider = createRestaurantsProvider();
  app.log.info(`[Provider] Using: In-Memory Mock`);
} else {
  provider = new CachedGooglePlacesProvider();
  app.log.info(`[Provider] Using: Google Places API (cached)`);
}

app.get("/health", async () => ({
  ok: true,
  redisOpen: !!getRedis()?.isOpen,
  mode: getRedis()?.isOpen ? "redis" : "memory-fallback",
}));

app.get("/api/restaurants", async (req, reply) => {
  const q = (req as any).query || {};

  const radiusKm = Number(q.radiusKm ?? 2);

  const cuisines = q.cuisines
    ? String(q.cuisines)
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean)
    : [];

  const customCuisines = q.customCuisines
    ? String(q.customCuisines)
        .split(",")
        .map((s: string) => {
          const cleaned = s.trim().toLowerCase();
          if (cleaned.length < 2 || cleaned.length > 40) return null;
          return cleaned.replace(/[^a-záéíóúüñ\s]/gi, '') || null;
        })
        .filter((term): term is string => term !== null)
        .slice(0, 3)
    : [];

  const customFilters = q.customFilters
    ? String(q.customFilters)
        .split(",")
        .map((s: string) => {
          const cleaned = s.trim().toLowerCase();
          if (cleaned.length < 2 || cleaned.length > 40) return null;
          return cleaned.replace(/[^a-záéíóúüñ\s]/gi, '') || null;
        })
        .filter((term): term is string => term !== null)
        .slice(0, 3)
    : [];

  const dietaryFilters = q.dietaryFilters
    ? String(q.dietaryFilters)
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean)
    : [];

  const price = q.price
    ? String(q.price)
        .split(",")
        .map((n: string) => Number(n))
        .filter((n: number) => !Number.isNaN(n) && n >= 0 && n <= 4)
    : undefined;

  const openNow = String(q.openNow) === "true";

  const minRating = q.minRating ? Number(q.minRating) : undefined;

  let center: { lat: number; lng: number } | undefined;
  if (q.center && typeof q.center === "string") {
    const [latStr, lngStr] = q.center.split(",");
    const lat = Number(latStr);
    const lng = Number(lngStr);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      center = { lat, lng };
    }
  }

  if (!useMock && !center && !process.env.PLACES_DEFAULT_CENTER) {
    return reply.code(400).send({
      error:
        "Center required: provide ?center=lat,lng or set PLACES_DEFAULT_CENTER",
    });
  }

  const filters: Filters = { cuisines, customCuisines, dietaryFilters, customFilters, price, openNow, minRating };

  try {
    const { items, nextPageToken } = await provider.search({
      radiusKm,
      filters,
      center,
    });
    return { count: items.length, items, nextPageToken };
  } catch (e: any) {
    req.log.error({ err: e }, "Provider search failed");
    return reply.code(500).send({ error: e?.message || "Search failed" });
  }
});

app.post("/api/sessions", async (req, reply) => {
  const body = (req.body as any) ?? {};
  const area: Area = body.area;
  const name: string | undefined = typeof body.name === 'string' && body.name.trim().length > 0 ? body.name.trim() : undefined;
  const filtersRaw = body.filters || {};
  const center = body.center;
  const rawThreshold = body.threshold as
    | Partial<StoredSession["threshold"]>
    | undefined;

  const cuisines = Array.isArray(filtersRaw.cuisines) ? filtersRaw.cuisines : [];
  
  let customCuisines: string[] = [];
  if (Array.isArray(filtersRaw.customCuisines)) {
    customCuisines = filtersRaw.customCuisines
      .map((term: any) => {
        if (typeof term !== 'string') return null;
        const cleaned = term.trim().toLowerCase();
        if (cleaned.length < 2 || cleaned.length > 40) return null;
        const sanitized = cleaned.replace(/[^a-záéíóúüñ\s]/gi, '');
        return sanitized || null;
      })
      .filter((term: string | null): term is string => term !== null)
      .slice(0, 3);
  }

  let customFilters: string[] = [];
  if (Array.isArray(filtersRaw.customFilters)) {
    customFilters = filtersRaw.customFilters
      .map((term: any) => {
        if (typeof term !== 'string') return null;
        const cleaned = term.trim().toLowerCase();
        if (cleaned.length < 2 || cleaned.length > 40) return null;
        const sanitized = cleaned.replace(/[^a-záéíóúüñ\s]/gi, '');
        return sanitized || null;
      })
      .filter((term: string | null): term is string => term !== null)
      .slice(0, 3);
  }

  const dietaryFilters = Array.isArray(filtersRaw.dietaryFilters)
    ? filtersRaw.dietaryFilters.filter((f: any) => typeof f === 'string')
    : [];

  const filters: Filters = {
    cuisines,
    customCuisines,
    dietaryFilters,
    customFilters,
    price: Array.isArray(filtersRaw.price) ? filtersRaw.price : [],
    openNow: !!filtersRaw.openNow,
    minRating: typeof filtersRaw.minRating === 'number' ? filtersRaw.minRating : 0,
  };

  if (
    !area?.radiusKm ||
    (cuisines.length === 0 && customCuisines.length === 0)
  ) {
    return reply.code(400).send({ error: "Parámetros inválidos" });
  }

  if (!useMock && !center && !process.env.PLACES_DEFAULT_CENTER) {
    return reply.code(400).send({
      error: "Center required: provide center or set PLACES_DEFAULT_CENTER",
    });
  }

  const participants = Math.max(
    2,
    Number(rawThreshold?.participants ?? 2) || 2
  );
  const valueRaw = Number(rawThreshold?.value ?? 2) || 2;
  const value = Math.min(Math.max(2, valueRaw), participants);
  const threshold: StoredSession["threshold"] = {
    type: "absolute",
    value,
    participants,
  };

  try {
    const { items } = await provider.search({
      radiusKm: area.radiusKm,
      filters,
      center,
    });

    const sessionId = "s_" + Math.random().toString(36).slice(2, 10);
    const session: StoredSession = {
      id: sessionId,
      name,
      area,
      filters,
      threshold,
      status: "open",
      restaurants: items,
      createdAt: new Date().toISOString(),
      participants: {},
      votes: {},
      matchedIds: new Set(),
      winners: [],
    };

    await saveSession(session);

    return reply.send({
      sessionId,
      invitePath: `/s/${sessionId}`,
      count: items.length,
      session: {
        id: session.id,
        name: session.name,
        area: session.area,
        filters: session.filters,
        threshold: session.threshold,
        status: session.status,
      },
      restaurants: items,
    });
  } catch (e: any) {
    req.log.error({ err: e }, "Failed to create session");
    if (
      e?.message === "STORAGE_UNAVAILABLE" ||
      e?.message === "REDIS_TIMEOUT"
    ) {
      return reply.code(503).send({ error: "Storage unavailable" });
    }
    return reply
      .code(500)
      .send({ error: e?.message || "Cannot create session" });
  }
});

app.post("/api/sessions/:id/join", async (req, reply) => {
  if (!requireStorage(reply)) return;
  const { id } = req.params as any;
  const body = (req.body as any) ?? {};
  const { participantId, name } = body;

  let s: StoredSession | null;
  try {
    s = await getSession(id);
  } catch (e: any) {
    if (
      e?.message === "STORAGE_UNAVAILABLE" ||
      e?.message === "REDIS_TIMEOUT"
    ) {
      return reply.code(503).send({ error: "Storage unavailable" });
    }
    throw e;
  }
  if (!s) return reply.code(404).send({ error: "Session not found" });

  // Validar límite de participantes PRIMERO (antes de cualquier otra lógica)
  const currentParticipants = Object.keys(s.participants || {}).length;
  const maxParticipants = s.threshold?.participants ?? 2;
  
  // Si intenta entrar con un participantId nuevo y ya hay máximo, rechazar
  if (!participantId && currentParticipants >= maxParticipants) {
    return reply.code(409).send({ 
      error: "Session full",
      code: "SESSION_FULL",
      current: currentParticipants,
      max: maxParticipants
    });
  }

  if (participantId && s.participants[participantId]) {
    const p = s.participants[participantId];
    if (s.status === "open") s.status = "voting";
    await saveSession(s);

    const expiresAt = Date.now() + (TTL_DAYS * 24 * 60 * 60 * 1000);

    return reply.send({
      sessionId: id,
      participant: { id: p.id, name: p.name },
      invitePath: `/s/${id}`,
      expiresAt,
      session: {
        id: s.id,
        name: s.name,
        area: s.area,
        filters: s.filters,
        threshold: s.threshold,
        status: s.status,
      },
      restaurants: s.restaurants,
    });
  }

  const display = String(name || "").trim() || "Invitado";
  const pid = "p_" + Math.random().toString(36).slice(2, 10);

  let after: StoredSession | null;
  try {
    after = await updateSession(id, (sess) => {
      sess.participants[pid] = {
        id: pid,
        name: display,
        joinedAt: new Date().toISOString(),
      };
      if (sess.status === "open") sess.status = "voting";
    });
  } catch (e: any) {
    if (
      e?.message === "STORAGE_UNAVAILABLE" ||
      e?.message === "REDIS_TIMEOUT"
    ) {
      return reply.code(503).send({ error: "Storage unavailable" });
    }
    throw e;
  }
  if (!after) {
    return reply.code(404).send({ error: "Session not found" });
  }

  try {
    app.io.to(id).emit("participant:joined", {
      sessionId: id,
      participant: { id: pid, name: display },
      participants: Object.values(after.participants),
    });
  } catch {}

  const expiresAt = Date.now() + (TTL_DAYS * 24 * 60 * 60 * 1000);

  return reply.send({
    sessionId: id,
    participant: { id: pid, name: display },
    invitePath: `/s/${id}`,
    expiresAt,
    session: {
      id: after.id,
      name: after.name,
      area: after.area,
      filters: after.filters,
      threshold: after.threshold,
      status: after.status,
    },
    restaurants: after.restaurants,
  });
});

app.get("/api/sessions/:id", async (req, reply) => {
  if (!requireStorage(reply)) return;
  const { id } = req.params as any;
  let s: StoredSession | null;
  try {
    s = await getSession(id);
  } catch (e: any) {
    if (
      e?.message === "STORAGE_UNAVAILABLE" ||
      e?.message === "REDIS_TIMEOUT"
    ) {
      return reply.code(503).send({ error: "Storage unavailable" });
    }
    throw e;
  }
  if (!s) return reply.code(404).send({ error: "Session not found" });

  try {
    await touchSession(id);
  } catch (e: any) {
    if (
      e?.message === "STORAGE_UNAVAILABLE" ||
      e?.message === "REDIS_TIMEOUT"
    ) {
      return reply.code(503).send({ error: "Storage unavailable" });
    }
    throw e;
  }

  const participants = Object.fromEntries(
    Object.entries(s.participants || {}).map(([pid, p]) => [
      pid,
      { id: p.id, name: p.name, done: p.done === true },
    ])
  );

  return reply.send({
    id: s.id,
    name: s.name,
    status: s.status,
    threshold: s.threshold,
    participants,
    area: s.area,
    filters: s.filters,
  });
});

app.post("/api/sessions/:id/votes", async (req, reply) => {
  if (!requireStorage(reply)) return;
  const { id } = req.params as any;
  const { participantId, restaurantId, choice } = req.body as any as {
    participantId?: string;
    restaurantId?: string;
    choice?: "yes" | "no";
  };

  let s: StoredSession | null;
  try {
    s = await getSession(id);
  } catch (e: any) {
    if (
      e?.message === "STORAGE_UNAVAILABLE" ||
      e?.message === "REDIS_TIMEOUT"
    ) {
      return reply.code(503).send({ error: "Storage unavailable" });
    }
    throw e;
  }
  if (!s) return reply.code(404).send({ error: "Session not found" });
  if (!participantId || !s.participants?.[participantId]) {
    return reply.code(403).send({ error: "Unknown participant" });
  }
  if (!restaurantId || (choice !== "yes" && choice !== "no")) {
    return reply.code(400).send({ error: "Bad vote payload" });
  }

  const needed = s.threshold?.value ?? 2;
  const wasAlreadyMatchedBefore = s.matchedIds.has(restaurantId);

  let yesCount = 0;
  let isNewlyMatched = false;
  let winnerObj: StoredSession["restaurants"][number] | null = null;

  let updated: StoredSession | null;
  try {
    updated = await updateSession(id, (sess) => {
      const bucket: VoteBuckets = sess.votes[restaurantId] ?? {
        yes: new Set<string>(),
        no: new Set<string>(),
      };
      sess.votes[restaurantId] = bucket;

      bucket.yes.delete(participantId);
      bucket.no.delete(participantId);
      (choice === "yes" ? bucket.yes : bucket.no).add(participantId);

      yesCount = bucket.yes.size;

      isNewlyMatched = yesCount >= needed && !sess.matchedIds.has(restaurantId);
      if (isNewlyMatched) {
        sess.matchedIds.add(restaurantId);
        if (sess.status !== "matched") sess.status = "matched";
        const w = sess.restaurants.find((r) => r.id === restaurantId) || null;
        if (w) {
          if (!sess.winners) sess.winners = [];
          if (!sess.winners.some((x) => x.id === w.id)) sess.winners.push(w);
          winnerObj = w;
        }
      }
      return sess;
    });
  } catch (e: any) {
    if (
      e?.message === "STORAGE_UNAVAILABLE" ||
      e?.message === "REDIS_TIMEOUT"
    ) {
      return reply.code(503).send({ error: "Storage unavailable" });
    }
    throw e;
  }

  if (!updated) return reply.code(404).send({ error: "Session not found" });

  try {
    app.io.to(updated.id).emit("session:vote", {
      sessionId: updated.id,
      participantId,
      restaurantId,
      choice,
      yesCount,
      needed,
    });
    if (isNewlyMatched && winnerObj) {
      app.io
        .to(updated.id)
        .emit("session:matched", { sessionId: updated.id, winner: winnerObj });
    }
  } catch {
    /* noop */
  }

  return reply.send({
    ok: true,
    matched: isNewlyMatched,
    wasAlreadyMatched: wasAlreadyMatchedBefore,
    winner: winnerObj,
    yesCount,
    needed,
  });
});

app.ready().then(() => {
  app.io.on("connection", (socket: Socket) => {
    app.log.info({ id: socket.id }, "socket connected");

    socket.on("session:join", async (payload: { sessionId?: string }) => {
      const sessionId = payload?.sessionId;
      if (!sessionId) return;
      socket.join(sessionId);

      const s = await getSession(sessionId);
      if (s) {
        socket.emit("session:participants", {
          sessionId: s.id,
          participants: Object.values(s.participants),
        });
      }
    });

    socket.on(
      "vote",
      async (payload: {
        sessionId?: string;
        participantId?: string;
        restaurantId?: string;
        choice?: "yes" | "no";
      }) => {
        const { sessionId, participantId, restaurantId, choice } =
          payload || {};
        if (!sessionId) return;

        const s = await getSession(sessionId);
        if (
          !s ||
          !participantId ||
          !s.participants?.[participantId] ||
          !restaurantId ||
          (choice !== "yes" && choice !== "no")
        ) {
          return;
        }

        const needed = s.threshold?.value ?? 2;

        let yesCount = 0;
        let isNewlyMatched = false;
        let winnerObj: StoredSession["restaurants"][number] | null = null;

        const updated = await updateSession(sessionId, (sess) => {
          const bucket: VoteBuckets = sess.votes[restaurantId] ?? {
            yes: new Set<string>(),
            no: new Set<string>(),
          };
          sess.votes[restaurantId] = bucket;

          bucket.yes.delete(participantId);
          bucket.no.delete(participantId);
          (choice === "yes" ? bucket.yes : bucket.no).add(participantId);

          yesCount = bucket.yes.size;

          isNewlyMatched =
            yesCount >= needed && !sess.matchedIds.has(restaurantId);
          if (isNewlyMatched) {
            sess.matchedIds.add(restaurantId);
            if (sess.status === "voting") sess.status = "matched";
            const w =
              sess.restaurants.find((r) => r.id === restaurantId) || null;
            if (w) {
              if (!sess.winners) sess.winners = [];
              if (!sess.winners.some((x) => x.id === w.id))
                sess.winners.push(w);
              winnerObj = w;
            }
          }
          return sess;
        });

        if (!updated) return;

        app.io.to(updated.id).emit("session:vote", {
          participantId,
          restaurantId,
          choice,
          yesCount,
          needed,
        });

        if (isNewlyMatched && winnerObj) {
          app.io.to(updated.id).emit("session:matched", {
            sessionId: updated.id,
            winner: winnerObj,
          });
        }
      }
    );

    socket.on("disconnect", () => {
      app.log.info({ id: socket.id }, "socket disconnected");
    });
  });
});

app.get("/api/photos/proxy", async (req, reply) => {
  const { url } = req.query as { url?: string };
  if (!url || !url.startsWith("https://places.googleapis.com")) {
    return reply.code(400).send({ error: "Invalid URL" });
  }
  try {
    const response = await fetch(url);

    if (!response.ok) {
      return reply
        .code(response.status)
        .send({ error: "Failed to fetch image" });
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";

    reply.header("Content-Type", contentType);
    reply.header("Cache-Control", "public, max-age=86400");
    reply.header("Access-Control-Allow-Origin", "*");

    return Buffer.from(buffer);
  } catch (error: any) {
    req.log.error({ err: error }, "Photo proxy failed");
    return reply.code(500).send({ error: "Failed to fetch image" });
  }
});

const port = Number(process.env.PORT || 4000);
app.listen({ port, host: "0.0.0.0" }).then(() => {
  app.log.info(`API on http://localhost:${port}`);
});

app.get("/api/sessions/:id/results", async (req, reply) => {
  if (!requireStorage(reply)) return;
  const { id } = req.params as any;
  let s: StoredSession | null;
  try {
    s = await getSession(id);
  } catch (e: any) {
    if (
      e?.message === "STORAGE_UNAVAILABLE" ||
      e?.message === "REDIS_TIMEOUT"
    ) {
      return reply.code(503).send({ error: "Storage unavailable" });
    }
    throw e;
  }
  if (!s) return reply.code(404).send({ error: "Session not found" });

  try {
    await touchSession(id);
  } catch (e: any) {
    if (
      e?.message === "STORAGE_UNAVAILABLE" ||
      e?.message === "REDIS_TIMEOUT"
    ) {
      return reply.code(503).send({ error: "Storage unavailable" });
    }
    throw e;
  }

  const { totalParticipants, votersTarget, needed, results, winnerIds } =
    computeRepoResults(s);
  const winners =
    s.winners && s.winners.length
      ? s.winners
      : s.restaurants.filter((r) => s.matchedIds.has(r.id));

  return reply.send({
    sessionId: id,
    sessionName: s.name,
    status: s.status,
    needed,
    totalParticipants,
    votersTarget,
    winnerIds,
    winners,
    results,
    participants: s.participants,
  });
});

app.post("/api/sessions/:id/done", async (req, reply) => {
  if (!requireStorage(reply)) return;
  const { id } = req.params as any;
  const { participantId } = (req.body as any) ?? {};

  let s: StoredSession | null;
  try {
    s = await getSession(id);
  } catch (e: any) {
    if (
      e?.message === "STORAGE_UNAVAILABLE" ||
      e?.message === "REDIS_TIMEOUT"
    ) {
      return reply.code(503).send({ error: "Storage unavailable" });
    }
    throw e;
  }
  if (!s) return reply.code(404).send({ error: "Session not found" });
  if (!participantId || !s.participants?.[participantId]) {
    return reply.code(403).send({ error: "Unknown participant" });
  }

  let newStatus: StoredSession["status"] = s.status;
  let doneCount = 0;
  let min = 0;

  try {
    await updateSession(id, (sess) => {
      const p = sess.participants[participantId];
      if (p) p.done = true;

      min =
        sess.threshold?.participants ??
        Object.keys(sess.participants || {}).length;
      doneCount = Object.values(sess.participants).filter((x) => x.done).length;

      if (doneCount >= min && sess.status !== "finished") {
        sess.status = "finished";
        newStatus = "finished";
        try {
          app.io.to(id).emit("session:finished", { sessionId: id });
        } catch {}
      } else {
        newStatus = sess.status;
      }
    });
    try {
      app.io.to(id).emit("participant:done", {
        sessionId: id,
        participantId,
        doneCount,
        min,
      });
    } catch {}
  } catch (e: any) {
    if (
      e?.message === "STORAGE_UNAVAILABLE" ||
      e?.message === "REDIS_TIMEOUT"
    ) {
      return reply.code(503).send({ error: "Storage unavailable" });
    }
    throw e;
  }

  return reply.send({ ok: true, status: newStatus, doneCount, min });
});

if (isDev) {
  app.get("/debug/redis", async () => {
    const r = getRedis();
    return { isOpen: !!r?.isOpen };
  });
}

app.addHook("onClose", async () => {
  const r = getRedis();
  if (r?.isOpen) {
    try {
      await r.quit();
    } catch {}
  }
  if (redisCache.ready()) {
    try {
      await redisCache.disconnect();
    } catch {}
  }
});
