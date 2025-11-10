// src/providers/InMemoryRestaurantProvider.ts
import { Restaurant } from "../types";
import { IRestaurantProvider, SearchParams, SearchResult, RestaurantDTO } from "./types";
import { normalizeMock } from "./utils/normalize";

export class InMemoryRestaurantProvider implements IRestaurantProvider {
  private data: Restaurant[];

  constructor(data: Restaurant[]) {
    this.data = data; // MOCK_RESTAURANTS
  }

  // Ignoramos radiusKm por ahora (los mocks no tienen distancia calculada)
  // TODO: calcular distancia desde un centro y filtrar por radiusKm si se aporta centro
  async search(params: SearchParams): Promise<SearchResult> {
    const { /* radiusKm, */ filters } = params;
    const { cuisines, price, openNow, minRating } = filters;

    const filtered = this.data.filter((r) => {
      // cuisines: intersección no vacía si viene filtro
      const cuisineList = r.cuisine || [];
      const okCuisine =
        Array.isArray(cuisines) && cuisines.length > 0
          ? cuisineList.some((c) => cuisines.includes(c))
          : true;

      // price: niveles 0–4
      const okPrice =
        Array.isArray(price) && price.length > 0
          ? price.includes(r.price)
          : true;

      // minRating
      const okRating =
        typeof minRating === "number"
          ? (typeof r.rating === "number" ? r.rating >= minRating : false)
          : true;

      // openNow: si true, incluir solo openNow === true (si falta, asumir true)
      const okOpen =
        openNow === true ? (r.openNow !== false) : true;

      return okCuisine && okPrice && okRating && okOpen;
    });

    // Convertir cada mock al DTO unificado
    const items: RestaurantDTO[] = filtered.map((r) => normalizeMock(r)); // source: 'mock' dentro del normalizador

    return { items, nextPageToken: undefined };
  }
}