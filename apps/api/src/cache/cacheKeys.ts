// apps/api/src/cache/cacheKeys.ts
import crypto from "crypto";

function hashObject(obj: any): string {
  const str = JSON.stringify(obj, Object.keys(obj).sort());
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
    radiusKm: typeof params.radiusKm === "number" ? params.radiusKm : "default",
    filters: {
      cuisines: Array.isArray(params.filters?.cuisines)
        ? [...params.filters.cuisines].sort()
        : [],
      price: Array.isArray(params.filters?.price)
        ? [...params.filters.price].sort()
        : [],
      openNow: !!params.filters?.openNow,
      minRating:
        typeof params.filters?.minRating === "number"
          ? params.filters.minRating
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
