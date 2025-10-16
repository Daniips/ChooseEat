export type Restaurant = {
    id: string;
    name: string;
    cuisine: string[];
    price: number;           // 1–4
    distanceKm: number;
    rating: number;          // 0–5
    openNow: boolean;
    img: string;
};

export type Area = { radiusKm: number };
export type Filters = {
    cuisines: string[];
    price?: number[];
    openNow?: boolean;
    minRating?: number;
};
