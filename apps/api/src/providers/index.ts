// apps/api/src/providers/index.ts
import { InMemoryRestaurantProvider } from "./InMemoryRestaurantProvider.js";
import { GooglePlacesProvider } from "./google/GooglePlacesProvider.js";
import { IRestaurantProvider } from "./types.js";
import { MOCK_RESTAURANTS } from "../data/restaurants.js";


export function createRestaurantsProvider(): IRestaurantProvider {
  const useMock = process.env.USE_MOCK !== "false";
  if (useMock) {
    return new InMemoryRestaurantProvider(MOCK_RESTAURANTS);
  }
  return new GooglePlacesProvider();
}