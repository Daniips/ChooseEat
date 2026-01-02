// apps/api/src/sessionRepo.ts
import { getRedis } from "../redis.js";

const SESSION_PREFIX = "session:";
export const TTL_DAYS = Number(process.env.SESSION_TTL_DAYS || 7);
const TTL_SECONDS = TTL_DAYS * 24 * 60 * 60;

const USE_MEMORY_FALLBACK = (process.env.MEMORY_FALLBACK || "true") === "true";

type VotesJSON = Record<string, { yes: string[]; no: string[] }>;

export type Participant = {
  id: string;
  name: string;
  joinedAt?: string;
  done?: boolean;
};

export type VoteBuckets = {
  yes: Set<string>;
  no: Set<string>;
};

export type SessionStatus = "open" | "voting" | "matched" | "finished";

export interface Session {
  id: string;
  name?: string;
  area: { radiusKm: number };
  filters: {
    cuisines: string[];
    price?: number[];
    openNow?: boolean;
    minRating?: number;
  };
  threshold: { type: "absolute"; value: number; participants: number };
  status: SessionStatus;
  restaurants: Array<{
    id: string;
    name: string;
    img?: string;
    cuisine?: string[];
    price?: number;
    rating?: number;
  }>;
  createdAt: string;
  updatedAt?: string;
  participants: Record<string, Participant>;
  votes: Record<string, VoteBuckets>;
  matchedIds: Set<string>;
  winners?: Session["restaurants"];
}

function key(id: string) {
  return SESSION_PREFIX + id;
}

export const mem = new Map<string, Session>();

function dehydrate(s: Session) {
  const votes: VotesJSON = {};
  for (const [rid, v] of Object.entries(s.votes || {})) {
    votes[rid] = { yes: Array.from(v.yes || []), no: Array.from(v.no || []) };
  }
  return {
    ...s,
    votes,
    matchedIds: Array.from(s.matchedIds || []),
  };
}

function rehydrate(obj: any): Session {
  const votes: Record<string, VoteBuckets> = {};
  const rawVotes = (obj?.votes || {}) as VotesJSON;
  for (const [rid, v] of Object.entries(rawVotes)) {
    votes[rid] = { yes: new Set(v.yes || []), no: new Set(v.no || []) };
  }
  return {
    ...obj,
    votes,
    matchedIds: new Set(obj?.matchedIds || []),
  } as Session;
}

export async function saveSession(s: Session): Promise<void> {
  const sessionWithTimestamp = { ...s, updatedAt: new Date().toISOString() };
  const payload = JSON.stringify(dehydrate(sessionWithTimestamp));
  const redis = getRedis();
  if (redis?.isOpen) {
    try {
      await withTimeout(
        redis.set(key(s.id), payload, { EX: TTL_SECONDS }),
        1200
      );
      if (USE_MEMORY_FALLBACK) mem.set(s.id, s);
      return;
    } catch {
      //noop
    }
  }
  if (USE_MEMORY_FALLBACK) {
    mem.set(s.id, s);
    return;
  }
  throw new Error("Redis set failed and MEMORY_FALLBACK=false");
}

export async function getSession(id: string): Promise<Session | null> {
  const redis = getRedis();
  if (redis) {
    try {
      const raw = await withTimeout(redis.get(key(id)), 500);
      if (raw) {
        const s = rehydrate(JSON.parse(raw));
        if (USE_MEMORY_FALLBACK) mem.set(id, s);
        return s;
      }
    } catch (e) {
      if (!USE_MEMORY_FALLBACK) {
        const err: any = new Error("STORAGE_UNAVAILABLE");
        err.cause = e;
        throw err;
      }
    }
  }
  if (USE_MEMORY_FALLBACK) {
    return mem.get(id) || null;
  }
  return null;
}

export async function updateSession(
  id: string,
  updater: (s: Session) => void | Session
): Promise<Session | null> {
  let s: Session | null;
  try {
    s = await getSession(id);
  } catch (e) {
    throw e;
  }
  if (!s) return null;
  const out = (updater(s) as Session) || s;
  try {
    await saveSession(out);
  } catch (e) {
    throw e;
  }
  return out;
}

export async function touchSession(id: string): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    if (!USE_MEMORY_FALLBACK) throw new Error("STORAGE_UNAVAILABLE");
    return;
  }
  try {
    await withTimeout(redis.expire(key(id), TTL_SECONDS), 400);
  } catch (e) {
    if (!USE_MEMORY_FALLBACK) {
      const err: any = new Error("STORAGE_UNAVAILABLE");
      err.cause = e;
      throw err;
    }
  }
}

export async function deleteSession(id: string): Promise<void> {
  const redis = getRedis();
  try {
    if (redis?.isOpen) await withTimeout(redis.del(key(id)), 1200);
  } finally {
    mem.delete(id);
  }
}

export function computeResults(s: Session) {
  const totalParticipants =
    Object.keys(s.participants || {}).length || s.threshold?.participants || 0;

  const votersTarget = s.threshold?.participants ?? totalParticipants;
  const needed = s.threshold?.value ?? 2;

  const results = s.restaurants
    .map((r) => {
      const b = s.votes[r.id] ?? {
        yes: new Set<string>(),
        no: new Set<string>(),
      };
      const yes = b.yes.size;
      const no = b.no.size;
      const pending = Math.max(0, votersTarget - yes - no);
      return {
        ...r,
        yes,
        no,
        pending,
        total: yes + no,
        votersTarget,
        yesIds: Array.from(b.yes),
        noIds: Array.from(b.no),
      };
    })
    .sort((a, b) => b.yes - a.yes || a.no - b.no);

  const winnerIds = results.filter((x) => x.yes >= needed).map((x) => x.id);

  return { totalParticipants, votersTarget, needed, results, winnerIds };
}

function withTimeout<T>(p: Promise<T>, ms = 600): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("REDIS_TIMEOUT")), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

export async function resyncMemoryToRedis(): Promise<number> {
  const redis = getRedis();
  if (!redis?.isOpen) return 0;
  let count = 0;
  for (const [id, s] of mem.entries()) {
    await redis.set(key(id), JSON.stringify(dehydrate(s)), { EX: TTL_SECONDS });
    count++;
  }
  return count;
}
