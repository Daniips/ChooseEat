// apps/api/src/cache/cacheKeys.ts
import crypto from "crypto";

function sortDeep(value: any): any {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === "object" && value.constructor === Object) {
    const out: Record<string, any> = {};
    for (const k of Object.keys(value).sort()) out[k] = sortDeep(value[k]);
    return out;
  }
  return value;
}

function stableStringify(value: any): string {
  return JSON.stringify(sortDeep(value));
}

function hashObject(obj: any): string {
  const str = stableStringify(obj);
  return crypto.createHash("md5").update(str).digest("hex");
}

export function searchCacheKey(params: {
  center?: { lat: number; lng: number };
  radiusKm?: number;
  filters?: any;
}): string {
  const centerNormalized = params.center
    ? {
        lat: Number(params.center.lat.toFixed(4)),
        lng: Number(params.center.lng.toFixed(4)),
      }
    : "default";

  const normalized = {
    center: centerNormalized,
    radiusKm:
      typeof params.radiusKm === "number" ? Number(params.radiusKm) : "default",
    filters: {
      cuisines: Array.isArray(params.filters?.cuisines)
        ? [...params.filters.cuisines].map((s: any) => String(s).toLowerCase()).sort()
        : [],
      price: Array.isArray(params.filters?.price)
        ? [...params.filters.price].map((n: any) => Number(n)).sort((a, b) => a - b)
        : [],
      openNow: !!params.filters?.openNow,
      minRating:
        typeof params.filters?.minRating === "number"
          ? Number(params.filters.minRating)
          : 0,
    },
  };

  const hash = hashObject(normalized);
  return `search:${hash}`;
}

export function detailsCacheKey(placeId: string): string {
  return `details:${placeId}`;
}

export function sessionCacheKey(sessionId: string): string {
  return `session:${sessionId}`;
}