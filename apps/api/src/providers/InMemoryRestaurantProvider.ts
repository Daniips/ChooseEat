import { Filters, Restaurant } from "../types";

export class InMemoryRestaurantProvider {
  private data: Restaurant[];

  constructor(data: Restaurant[]) {
    this.data = data;
  }

  async search(params: { radiusKm: number; filters: Filters }): Promise<{ items: Restaurant[] }> {
    const { radiusKm, filters } = params;
    const { cuisines, price, openNow, minRating } = filters;

    const byRadius = this.data.filter((r) => r.distanceKm <= radiusKm);

    const items = byRadius.filter((r) => {
      const okCuisine =
        cuisines && cuisines.length
          ? r.cuisine.some((c) => cuisines.includes(c))
          : true;

      const okPrice = price?.length ? price.includes(r.price) : true;
      const okOpen = openNow ? r.openNow : true;
      const okRating = r.rating >= (minRating ?? 0);

      return okCuisine && okPrice && okOpen && okRating;
    });

    return { items };
  }
}
