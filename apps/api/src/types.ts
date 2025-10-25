//apps/api/src/types.ts
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


export type Choice = "yes" | "no";


export interface Participant {
    id: string;
    name: string;
    joinedAt: string;
}

export interface VoteBuckets {
    yes: Set<string>;
    no: Set<string>;
}

export type SessionStatus = "open" | "voting" | "matched" | "finished";

export interface Threshold {
    type: "absolute";
    value: number;           
    participants: number;    
}

export interface Session {
    id: string;
    area: Area;
    filters: Filters;
    threshold: Threshold;
    status: SessionStatus;
    restaurants: Restaurant[];
    createdAt: string;
    participants: Record<string, Participant>;
    votes: Record<string, VoteBuckets>;
    winner?: Restaurant;
}
