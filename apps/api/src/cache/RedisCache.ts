// apps/api/src/cache/RedisCache.ts
import { createClient, RedisClientType } from "redis";
import { ensureRedis, getRedis } from "../redis";

export class RedisCache {
  private client: RedisClientType | null = null;
  private isReady = false;

  async connect(): Promise<void> {
    if (this.client?.isOpen) {
      this.isReady = true;
      return;
    }

    const c = await ensureRedis();
    if (c?.isOpen) {
      this.client = c;
      this.isReady = true;
    } else {
      this.client = null;
      this.isReady = false;
    }
  }

  async disconnect(): Promise<void> {
    this.client = null;
    this.isReady = false;
  }

  async get<T>(key: string): Promise<T | null> {
    const c = getRedis();
    if (!this.isReady || !c?.isOpen) return null;
    try {
      const value = await c.get(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch (err) {
      console.warn(`⚠️ Cache GET error for key "${key}":`, err);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    const c = getRedis();
    if (!this.isReady || !c?.isOpen) return;
    try {
      await c.setEx(key, ttlSeconds, JSON.stringify(value));
    } catch (err) {
      console.warn(`⚠️ Cache SET error for key "${key}":`, err);
    }
  }

  async delete(key: string): Promise<void> {
    const c = getRedis();
    if (!this.isReady || !c?.isOpen) return;
    try {
      await c.del(key);
    } catch (err) {
      console.warn(`⚠️ Cache DELETE error for key "${key}":`, err);
    }
  }

  async deleteByPattern(pattern: string): Promise<void> {
    const c = getRedis();
    if (!this.isReady || !c?.isOpen) return;
    try {
      const keys = await c.keys(pattern);
      if (keys.length) await c.del(keys);
    } catch (err) {
      console.warn(`⚠️ Cache DELETE pattern error for "${pattern}":`, err);
    }
  }

  ready(): boolean {
    return this.isReady;
  }
}

export const redisCache = new RedisCache();
