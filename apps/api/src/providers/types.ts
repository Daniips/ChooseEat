//src/providers/types.ts
import { Filters, Restaurant } from "../types";


export type RestaurantDTO = {
  id: string;
  name: string;
  address?: string;
  rating?: number;
  price?: number;
  photos?: string[];
  location?: { lat: number; lng: number };
  cuisines?: string[];
  openNow?: boolean;
  source?: 'mock' | 'google';
};

export interface SearchParams {
  radiusKm: number;
  center?: { lat: number; lng: number }; 
  filters: Filters;
}

export interface SearchResult {
  items: RestaurantDTO[];
  nextPageToken?: string;
}

export interface IRestaurantProvider {
  search(params: SearchParams): Promise<SearchResult>;
  getDetails?(id: string): Promise<RestaurantDTO | null>;
}