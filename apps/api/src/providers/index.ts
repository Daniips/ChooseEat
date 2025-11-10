// apps/api/src/providers/index.ts
import { InMemoryRestaurantProvider } from "./InMemoryRestaurantProvider";
import { GooglePlacesProvider } from "./google/GooglePlacesProvider";
import { IRestaurantProvider } from "./types";
import { MOCK_RESTAURANTS } from "../data/restaurants";

/**
 * Factory: decide qué provider usar según USE_MOCK
 * - USE_MOCK=true (default) → InMemory
 * - USE_MOCK=false → Google Places
 */
export function createRestaurantsProvider(): IRestaurantProvider {
  const useMock = process.env.USE_MOCK !== "false"; // default true
  
  if (useMock) {
    return new InMemoryRestaurantProvider(MOCK_RESTAURANTS);
  }
  
  return new GooglePlacesProvider();
}