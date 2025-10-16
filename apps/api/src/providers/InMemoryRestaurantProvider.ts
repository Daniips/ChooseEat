import { Filters, Restaurant } from "../types";

export class InMemoryRestaurantProvider {
    private data: Restaurant[];

    constructor(data: Restaurant[]) {
        this.data = data;
    }

    async search(params: { radiusKm: number; filters: Filters })
        : Promise<{ items: Restaurant[] }> {
        const { radiusKm, filters } = params;

        const byRadius = this.data.filter(r => r.distanceKm <= radiusKm);

        const items = byRadius.filter(r => {
            const okCuisine = filters.cuisines.length
                ? r.cuisine.some(c => filters.cuisines.includes(c))
                : true;
            const okPrice = filters.price?.length ? filters.price.includes(r.price) : true;
            const okOpen = filters.openNow ? r.openNow : true;
            const okRating = r.rating >= (filters.minRating ?? 0);
            return okCuisine && okPrice && okOpen && okRating;
        });

        return { items };
    }
}
