//apps/api/src/types.ts
export type Restaurant = {
    id: string;
    name: string;
    address?: string;
    rating?: number;
    price?: number;
    photos?: string[];
    location?: { lat: number; lng: number };
    cuisines?: string[];
    cuisine?: string[]; // deprecated, use cuisines
    openNow?: boolean;
    userRatingsTotal?: number;
    businessStatus?: string;
    types?: string[];
    vicinity?: string;
    distanceKm?: number;
    source?: 'mock' | 'google';
    img?: string; // deprecated, use photos
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
