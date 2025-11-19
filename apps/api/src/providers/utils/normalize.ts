// apps/api/src/providers/utils/normalize.ts
import type { RestaurantDTO } from "../types";

/**
 * Construye URL de foto desde resource name de Google Places v1
 * @param photoName - Resource path de la foto (ej: "places/ChIJ.../photos/...")
 * @param apiKey - API key de Google
 * @param maxHeight - Altura máxima en píxeles
 */
function buildPhotoUrl(photoName: string, apiKey: string, maxHeight = 400): string {
  if (!photoName || !photoName.startsWith("places/")) {
    return "";
  }
  const url = `https://places.googleapis.com/v1/${photoName}/media?key=${apiKey}&maxWidthPx=800&maxHeightPx=${maxHeight}`;
  return url;
}

/**
 * Mapea priceLevel de Google Places API v1 a 0–4
 */
function mapPriceLevel(level: any): number | undefined {
  if (!level) return undefined;
  const str = String(level).toUpperCase();
  if (str.includes("FREE")) return 0;
  if (str.includes("INEXPENSIVE")) return 1;
  if (str.includes("MODERATE")) return 2;
  if (str.includes("EXPENSIVE") && !str.includes("VERY")) return 3;
  if (str.includes("VERY_EXPENSIVE")) return 4;
  const num = Number(level);
  return Number.isFinite(num) && num >= 0 && num <= 4 ? num : undefined;
}

/**
 * Extrae categorías de cocina de los types de Google Places v1
 */
function extractCuisinesFromTypes(types: string[]): string[] {
  const cuisines: string[] = [];
  
  const cuisineTypes = [
    'italian', 'japanese', 'chinese', 'indian', 'mexican', 'thai', 
    'american', 'mediterranean', 'spanish', 'korean', 'french', 'greek',
    'vietnamese', 'turkish', 'lebanese', 'indonesian', 'brazilian',
    'african', 'afghani', 'asian', 'middle_eastern',
    'vegan', 'vegetarian',
    'italian_restaurant', 'japanese_restaurant', 'chinese_restaurant',
    'indian_restaurant', 'mexican_restaurant', 'thai_restaurant',
    'american_restaurant', 'mediterranean_restaurant', 'spanish_restaurant',
    'korean_restaurant', 'french_restaurant', 'greek_restaurant',
    'vietnamese_restaurant', 'turkish_restaurant', 'lebanese_restaurant',
    'indonesian_restaurant', 'brazilian_restaurant', 'african_restaurant',
    'afghani_restaurant', 'asian_restaurant', 'middle_eastern_restaurant',
    'vegan_restaurant', 'vegetarian_restaurant',
    'seafood_restaurant', 'steak_house', 'sushi_restaurant', 'ramen_restaurant',
    'pizza_restaurant', 'hamburger_restaurant', 'fast_food_restaurant',
    'fine_dining_restaurant', 'barbecue_restaurant'
  ];
  
  for (const type of types) {
    const lower = type.toLowerCase();    
    if (cuisineTypes.includes(lower)) {
      const cuisineName = lower.replace(/_restaurant$/, '');
      cuisines.push(cuisineName);
    }
  }

  return cuisines.length > 0 ? cuisines : [];
}

/**
 * Convierte un Place de Google Places API v1 (searchText) a RestaurantDTO
 */
export function normalizeGooglePlaceSummary(place: any, locale?: string): RestaurantDTO {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY || "";
  
  return {
    id: place.id || `unknown_${Date.now()}`,
    name: place.displayName?.text || place.displayName || "Unknown",
    address: place.formattedAddress || undefined,
    rating: typeof place.rating === "number" ? place.rating : undefined,
    price: mapPriceLevel(place.priceLevel),
    photos: place.photos?.map((p: any) => buildPhotoUrl(p.name, apiKey, 400)) || [],
    location: place.location
      ? {
          lat: place.location.latitude,
          lng: place.location.longitude,
        }
      : undefined,
    cuisines: extractCuisinesFromTypes(place.types || []),
    openNow: place.currentOpeningHours?.openNow,
    source: "google",
    userRatingsTotal: typeof place.userRatingCount === "number" ? place.userRatingCount : undefined,
    businessStatus: place.businessStatus || undefined,
    types: place.types || [],
    vicinity: place.shortFormattedAddress || place.formattedAddress || undefined,
  };
}

/**
 * Convierte un Place details de Google Places API v1 a RestaurantDTO
 */
export function normalizeGooglePlaceDetails(place: any, locale?: string): RestaurantDTO {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY || "";
  
  return {
    id: place.id || `unknown_${Date.now()}`,
    name: place.displayName?.text || place.displayName || "Unknown",
    address: place.formattedAddress || undefined,
    rating: typeof place.rating === "number" ? place.rating : undefined,
    price: mapPriceLevel(place.priceLevel),
    photos: place.photos?.map((p: any) => buildPhotoUrl(p.name, apiKey, 800)) || [],
    location: place.location
      ? {
          lat: place.location.latitude,
          lng: place.location.longitude,
        }
      : undefined,
    cuisines: extractCuisinesFromTypes(place.types || []),
    openNow: place.currentOpeningHours?.openNow,
    source: "google",
    userRatingsTotal: typeof place.userRatingCount === "number" ? place.userRatingCount : undefined,
    businessStatus: place.businessStatus || undefined,
    types: place.types || [],
    vicinity: place.shortFormattedAddress || place.formattedAddress || undefined,
  };
}

/**
 * Convierte un item del mock interno a RestaurantDTO
 */
export function normalizeMock(item: any): RestaurantDTO {
  return {
    id: item.id,
    name: item.name,
    cuisines: item.cuisine || [],
    price: item.price,
    rating: item.rating,
    openNow: item.openNow,
    photos: item.img ? [item.img] : [],
    source: "mock",
    userRatingsTotal: Math.floor(Math.random() * 500) + 50,
    businessStatus: "OPERATIONAL",
    types: ["restaurant", ...(item.cuisine || [])],
    vicinity: item.address || "Ubicación desconocida",
  };
}