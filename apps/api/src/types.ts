export type Restaurant = {
    id: string;
    name: string;
    cuisine: string[];
    price: number;
    distanceKm: number;
    rating: number;
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
