// apps/api/src/redis.ts
import { createClient, type RedisClientType } from "redis";

let client: RedisClientType | null = null;

export async function ensureRedis() {
  if (client?.isOpen) return client;

  const host = process.env.REDIS_HOST || "127.0.0.1";
  const port = Number(process.env.REDIS_PORT || 6379);
  const url  = process.env.REDIS_URL || undefined;
  const password = process.env.REDIS_PASSWORD || undefined;

  client = createClient({
    url,
    password,
    socket: {
      host: url ? undefined : host,
      port: url ? undefined : port,
      connectTimeout: 8000,
      keepAlive: true,
      keepAliveInitialDelay: 5000,
      reconnectStrategy: (retries) => Math.min(1000 * 2 ** retries, 15000),
    },
  });

  client.on("connect", () =>  console.info("[Redis] connecting…"));
  client.on("ready",   () =>  console.info("[Redis] ready"));
  client.on("end",     () =>  console.warn("[Redis] connection ended"));
  client.on("reconnecting", () => console.warn("[Redis] reconnecting…"));
  client.on("error",   (err) => console.warn("[Redis] error:", (err as Error)?.message || err));

  try { await client.connect(); } catch { /* a usar memoria */ }
  return client;
}

export function getRedis()  { return client; }
export function isRedisAvailable() { return !!client?.isOpen; }
