// apps/api/src/providers/index.ts
import { InMemoryRestaurantProvider } from "./InMemoryRestaurantProvider";
import { GooglePlacesProvider } from "./google/GooglePlacesProvider";
import { IRestaurantProvider } from "./types";
import { MOCK_RESTAURANTS } from "../data/restaurants";


export function createRestaurantsProvider(): IRestaurantProvider {
  const useMock = process.env.USE_MOCK !== "false";
  if (useMock) {
    return new InMemoryRestaurantProvider(MOCK_RESTAURANTS);
  }
  return new GooglePlacesProvider();
}