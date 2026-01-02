// src/providers/InMemoryRestaurantProvider.ts
import { Restaurant } from "../types";
import { IRestaurantProvider, SearchParams, SearchResult, RestaurantDTO } from "./types";
import { normalizeMock } from "./utils/normalize";

export class InMemoryRestaurantProvider implements IRestaurantProvider {
  private data: Restaurant[];

  constructor(data: Restaurant[]) {
    this.data = data;
  }


  async search(params: SearchParams): Promise<SearchResult> {
    const { /* radiusKm, */ filters } = params;
    const { cuisines, price, openNow, minRating } = filters;

    const filtered = this.data.filter((r) => {
      const cuisineList = r.cuisine || [];
      const okCuisine =
        Array.isArray(cuisines) && cuisines.length > 0
          ? cuisineList.some((c) => cuisines.includes(c))
          : true;

      const okPrice =
        Array.isArray(price) && price.length > 0
          ? typeof r.price === "number" && price.includes(r.price)
          : true;

      const okRating =
        typeof minRating === "number"
          ? (typeof r.rating === "number" ? r.rating >= minRating : false)
          : true;

      const okOpen =
        openNow === true ? (r.openNow !== false) : true;

      return okCuisine && okPrice && okRating && okOpen;
    });
    const items: RestaurantDTO[] = filtered.map((r) => normalizeMock(r));
    return { items, nextPageToken: undefined };
  }
}