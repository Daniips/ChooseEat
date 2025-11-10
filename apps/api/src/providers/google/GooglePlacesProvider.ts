// apps/api/src/providers/google/GooglePlacesProvider.ts
import { IRestaurantProvider, SearchParams, SearchResult, RestaurantDTO } from "../types";
import { normalizeGooglePlaceSummary, normalizeGooglePlaceDetails } from "../utils/normalize";

const CUISINE_KEYWORDS: Record<string, string> = {
  italian: "italian pizza pasta",
  japanese: "japanese sushi ramen",
  chinese: "chinese dim sum",
  indian: "indian curry",
  mexican: "mexican tacos",
  thai: "thai pad thai curry",
  american: "american burger",
  mediterranean: "mediterranean greek",
  spanish: "spanish tapas paella",
  korean: "korean bbq kimchi",
  vegetarian: "vegetarian",
  vegan: "vegan",
};

const CUISINE_PATTERNS: Record<string, string[]> = {
  italian: ['italian', 'pizza', 'pasta', 'restaurant'],
  japanese: ['japanese', 'sushi', 'ramen', 'restaurant'],
  chinese: ['chinese', 'dim_sum', 'restaurant'],
  indian: ['indian', 'curry', 'restaurant'],
  mexican: ['mexican', 'tacos', 'restaurant'],
  thai: ['thai', 'restaurant'],
  american: ['american', 'burger', 'restaurant'],
  mediterranean: ['mediterranean', 'greek', 'restaurant'],
  spanish: ['spanish', 'tapas', 'restaurant'],
  korean: ['korean', 'bbq', 'restaurant'],
  vegetarian: ['vegetarian', 'restaurant'],
  vegan: ['vegan', 'restaurant'],
};

/**
 * Calcula distancia en metros entre dos coordenadas (Haversine)
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export class GooglePlacesProvider implements IRestaurantProvider {
  private apiKey: string;
  private locale: string;
  private defaultRadiusM: number;
  private defaultCenter?: { lat: number; lng: number };

  constructor() {
    const key = process.env.GOOGLE_PLACES_API_KEY;
    if (!key) {
      throw new Error("GOOGLE_PLACES_API_KEY missing");
    }
    this.apiKey = key;
    this.locale = process.env.PLACES_LOCALE || "es";
    this.defaultRadiusM = Number(process.env.PLACES_DEFAULT_RADIUS_M || 2000);

    const centerEnv = process.env.PLACES_DEFAULT_CENTER;
    if (centerEnv) {
      const [latStr, lngStr] = centerEnv.split(",");
      const lat = Number(latStr);
      const lng = Number(lngStr);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        this.defaultCenter = { lat, lng };
      }
    }
  }

  async search(params: SearchParams): Promise<SearchResult> {
    const { radiusKm, filters, center } = params;
    const effectiveCenter = center || this.defaultCenter;
    
    console.log("🔍 Search params:", {
      center: effectiveCenter,
      radiusKm,
      filters,
      defaultCenter: this.defaultCenter,
    });
    
    if (!effectiveCenter) {
      throw new Error("Center required: provide center or set PLACES_DEFAULT_CENTER");
    }

    const radiusM = typeof radiusKm === "number" && radiusKm > 0
      ? Math.round(radiusKm * 1000)
      : this.defaultRadiusM;

    const selectedCuisines = filters?.cuisines || [];

    
    // 1. Si NO hay cocinas → búsqueda genérica
    if (selectedCuisines.length === 0) {
      return this.executeSearch("restaurant", effectiveCenter, radiusM, filters);
    }

    // 2. Si hay 1-2 cocinas → búsqueda con la cocina principal
    if (selectedCuisines.length <= 2) {
      const mainCuisine = CUISINE_KEYWORDS[selectedCuisines[0]] || selectedCuisines[0];
      const query = `restaurant ${mainCuisine}`;
      
      const result = await this.executeSearch(query, effectiveCenter, radiusM, filters);
      
      // Si hay 2 cocinas, filtrar en memoria para incluir ambas
      if (selectedCuisines.length === 2) {
        result.items = result.items.filter(r => {
          if (!r.cuisines?.length) return false;
          return selectedCuisines.some(sc => {
            const patterns = CUISINE_PATTERNS[sc] || [sc];
            return r.cuisines!.some(c => 
              patterns.some(p => c.toLowerCase().includes(p.toLowerCase()))
            );
          });
        });
      }
      
      return result;
    }

    // 3. Si hay 3+ cocinas → búsqueda genérica + filtrado agresivo
    const result = await this.executeSearch("restaurant", effectiveCenter, radiusM, {
      ...filters,
      cuisines: undefined,
    });

    // Filtrar solo restaurantes que cumplan AL MENOS UNA cocina
    result.items = result.items.filter(r => {
      if (!r.cuisines?.length) return false;
      
      return selectedCuisines.some(selectedCuisine => {
        const patterns = CUISINE_PATTERNS[selectedCuisine] || [selectedCuisine];
        return r.cuisines!.some(c => 
          patterns.some(p => c.toLowerCase().includes(p.toLowerCase()))
        );
      });
    });

    // Si quedan pocos resultados (<5), hacer segunda búsqueda con la cocina más popular
    if (result.items.length < 5) {
      const mainCuisine = CUISINE_KEYWORDS[selectedCuisines[0]] || selectedCuisines[0];
      const fallbackResult = await this.executeSearch(
        `restaurant ${mainCuisine}`,
        effectiveCenter,
        radiusM,
        filters
      );
      
      const existingIds = new Set(result.items.map(r => r.id));
      fallbackResult.items.forEach(item => {
        if (!existingIds.has(item.id)) {
          result.items.push(item);
        }
      });
    }

    return result;
  }

  private async executeSearch(
    query: string,
    center: { lat: number; lng: number },
    radiusM: number,
    filters: any
  ): Promise<SearchResult> {
  let priceLevels: string[] | undefined;
  if (filters?.price?.length) {
    const priceMap: Record<number, string> = {
      1: "PRICE_LEVEL_INEXPENSIVE",
      2: "PRICE_LEVEL_MODERATE",
      3: "PRICE_LEVEL_EXPENSIVE",
      4: "PRICE_LEVEL_VERY_EXPENSIVE",
    };
    
    priceLevels = filters.price
      .filter((n: number) => n >= 1 && n <= 4)
      .map((n: number) => priceMap[n])
      .filter(Boolean);
    if (priceLevels && priceLevels.length === 0) {
      priceLevels = undefined;
    }
  }
    const FIELD_MASK = [
      "places.id",
      "places.displayName",
      "places.formattedAddress",
      "places.location",
      "places.rating",
      "places.priceLevel",
      "places.photos",
      "places.types",
      "places.currentOpeningHours",
    ].join(",");

    const url = "https://places.googleapis.com/v1/places:searchText";
    const body: any = {
      textQuery: query,
      locationBias: {
        circle: {
          center: {
            latitude: center.lat,
            longitude: center.lng,
          },
          radius: radiusM,
        },
      },
      includedType: "restaurant",
      languageCode: this.locale,
      maxResultCount: 20,
    };

    if (priceLevels) {
    body.priceLevels = priceLevels;
  }

  if (filters?.openNow) {
    body.openNow = true;
  }
    let json: any;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": this.apiKey,
          "X-Goog-FieldMask": FIELD_MASK,
        },
        body: JSON.stringify(body),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Google Places v1 error ${res.status}: ${errorText}`);
      }
      
      json = await res.json();
    } catch (e: any) {
      throw new Error(`Failed to fetch Google Places v1: ${e?.message || "unknown"}`);
    }

    const rawPlaces: any[] = Array.isArray(json?.places) ? json.places : [];
    let items: RestaurantDTO[] = rawPlaces.map(p => normalizeGooglePlaceSummary(p, this.locale));

    items = items.filter(r => {
      if (!r.location) return false;
      const distance = calculateDistance(center.lat, center.lng, r.location.lat, r.location.lng);
      return distance <= radiusM;
    });

    if (typeof filters?.minRating === "number") {
      items = items.filter(r => 
        typeof r.rating === "number" && r.rating >= filters.minRating
      );
    }

    if (filters?.openNow) {
      items = items.filter(r => r.openNow === true);
    }

    const nextPageToken: string | undefined = json?.nextPageToken || undefined;

    return { items, nextPageToken };
  }

  async getDetails(id: string): Promise<RestaurantDTO | null> {
    if (!id) return null;

    const fields = [
      "id",
      "displayName",
      "formattedAddress",
      "location",
      "rating",
      "priceLevel",
      "currentOpeningHours",
      "photos",
      "types",
    ].join(",");

    const url = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`);
    url.searchParams.set("fields", fields);
    url.searchParams.set("languageCode", this.locale);

    let json: any;
    try {
      const res = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "X-Goog-Api-Key": this.apiKey,
        },
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Google Place details v1 error ${res.status}: ${errorText}`);
      }
      
      json = await res.json();
    } catch (e: any) {
      throw new Error(`Failed to fetch Place details v1: ${e?.message || "unknown"}`);
    }

    if (!json?.id) return null;

    return normalizeGooglePlaceDetails(json, this.locale);
  }
}