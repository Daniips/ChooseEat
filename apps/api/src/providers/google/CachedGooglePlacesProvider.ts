// apps/api/src/providers/google/CachedGooglePlacesProvider.ts
import { GooglePlacesProvider } from "./GooglePlacesProvider.js";
import { redisCache } from "../../cache/RedisCache.js";
import { searchCacheKey, detailsCacheKey } from "../../cache/cacheKeys.js";
import { CACHE_TTL } from "../../cache/cacheConfig.js";
import { SearchParams, SearchResult, RestaurantDTO } from "../types.js";

const isDev = process.env.NODE_ENV !== "production";

export class CachedGooglePlacesProvider extends GooglePlacesProvider {
  async search(params: SearchParams): Promise<SearchResult> {
    const cacheKey = searchCacheKey(params);

    const cached = await redisCache.get<SearchResult>(cacheKey);
    if (cached) {
      if (isDev) console.log(`✅ Cache HIT: ${cacheKey}`);
      return cached;
    }

    if (isDev) console.log(`❌ Cache MISS: ${cacheKey}`);

    const result = await super.search(params);

    await redisCache.set(cacheKey, result, CACHE_TTL.SEARCH);
    return result;
  }

  async getDetails(id: string): Promise<RestaurantDTO | null> {
    const cacheKey = detailsCacheKey(id);
    const cached = await redisCache.get<RestaurantDTO>(cacheKey);
    if (cached) {
      if (isDev) console.log(`✅ Cache HIT: ${cacheKey}`);
      return cached;
    }

    if (isDev) console.log(`❌ Cache MISS: ${cacheKey}`);
    const details = await super.getDetails(id);
    if (details) {
      await redisCache.set(cacheKey, details, CACHE_TTL.DETAILS);
    }

    return details;
  }
}
