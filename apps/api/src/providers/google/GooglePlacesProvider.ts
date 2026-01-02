// apps/api/src/providers/google/GooglePlacesProvider.ts
import { IRestaurantProvider, SearchParams, SearchResult, RestaurantDTO } from "../types.js";
import { normalizeGooglePlaceSummary, normalizeGooglePlaceDetails } from "../utils/normalize.js";

/**
 * Mapeo de cocinas a sus keywords para búsqueda.
 * Solo el término canónico (primera palabra) se usa en la query principal.
 * Los sinónimos se usan para filtrado local después.
 */
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

/**
 * Cocinas canónicas priorizadas para incluir en la query (más específicas primero).
 * Usamos máximo 3-4 para no saturar tokens en textQuery.
 */
const CANONICAL_PRIORITY = [
  'japanese', 'korean', 'thai', 'indian', 'mexican',
  'chinese', 'mediterranean', 'spanish', 'italian',
  'vegetarian', 'vegan', 'american'
];

/**
 * Configuración de límites y umbrales del algoritmo.
 */
const MAX_CANONICAL_IN_QUERY = 3; // Máximo de cocinas canónicas en textQuery
const MIN_RESULTS_THRESHOLD = 10; // Mínimo de resultados antes de activar fallback
const MAX_API_CALLS = 2; // Máximo de llamadas a la API por búsqueda
const FALLBACK_RADIUS_MULTIPLIER = 1.3; // Ampliar radio 30% en fallback
const MAX_PER_CHAIN = 3; // Máximo de restaurantes de la misma cadena

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
  private isDev: boolean;
  
  // Configuración de knobs
  private readonly MAX_CALLS = 2;
  private readonly MIN_RESULTS = 10;

  constructor() {
    const key = process.env.GOOGLE_PLACES_API_KEY;
    if (!key) {
      throw new Error("GOOGLE_PLACES_API_KEY missing");
    }
    this.apiKey = key;
    this.locale = process.env.PLACES_LOCALE || "es";
    this.defaultRadiusM = Number(process.env.PLACES_DEFAULT_RADIUS_M || 2000);
    this.isDev = process.env.NODE_ENV !== "production";

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

  /**
   * Selecciona las top N cocinas canónicas más prioritarias para incluir en la query.
   * Prioriza las más específicas y diversas entre sí para maximizar relevancia.
   */
  private selectCanonicalCuisines(cuisines: string[], maxCount: number = MAX_CANONICAL_IN_QUERY): string[] {
    const sorted = cuisines
      .filter(c => CANONICAL_PRIORITY.includes(c))
      .sort((a, b) => CANONICAL_PRIORITY.indexOf(a) - CANONICAL_PRIORITY.indexOf(b));
    return sorted.slice(0, maxCount);
  }

  /**
   * Construye la query de texto optimizada usando cocinas canónicas + términos personalizados.
   * Esto reduce tokens y mejora precisión en Google Places API.
   */
  private buildOptimizedQuery(cuisines: string[], customKeywords: string[] = []): string {
    if (cuisines.length === 0 && customKeywords.length === 0) return "restaurant";
    
    const canonical = this.selectCanonicalCuisines(cuisines);
    const terms = [...canonical, ...customKeywords];
    return `restaurant ${terms.join(" ")}`;
  }

  /**
   * Filtra restaurantes localmente verificando si coinciden con ALGUNA de las cocinas seleccionadas.
   * Usa CUISINE_PATTERNS para match flexible (sinónimos, variantes).
   */
  private filterByCuisines(items: RestaurantDTO[], selectedCuisines: string[]): RestaurantDTO[] {
    if (selectedCuisines.length === 0) return items;

    return items.filter(restaurant => {
      if (!restaurant.cuisines || restaurant.cuisines.length === 0) return false;

      // Match OR: al menos UNA cocina seleccionada debe coincidir
      return selectedCuisines.some(selectedCuisine => {
        const patterns = CUISINE_PATTERNS[selectedCuisine] || [selectedCuisine];
        return restaurant.cuisines!.some(cuisineType =>
          patterns.some(pattern => cuisineType.toLowerCase().includes(pattern.toLowerCase()))
        );
      });
    });
  }

  /**
   * Verifica si un restaurante coincide con un término personalizado (keyword).
   * Busca en múltiples campos: types, name, address.
   */
  private matchesCustomKeyword(restaurant: RestaurantDTO, keyword: string): boolean {
    const lowerKeyword = keyword.toLowerCase();
    
    return (
      restaurant.types?.some(t => t.toLowerCase().includes(lowerKeyword)) ||
      restaurant.name?.toLowerCase().includes(lowerKeyword) ||
      restaurant.address?.toLowerCase().includes(lowerKeyword) ||
      false
    );
  }

  /**
   * Filtra restaurantes por términos personalizados.
   * Verifica que coincidan con algunos de los términos (OR lógico).
   */
  private filterByCustomKeywords(items: RestaurantDTO[], customKeywords: string[]): RestaurantDTO[] {
    if (customKeywords.length === 0) return items;

    return items.filter(restaurant => {
      // Debe coincidir con almenos uno de los términos personalizados
      return customKeywords.some(keyword => 
        this.matchesCustomKeyword(restaurant, keyword)
      );
    });
  }

  /**
   * Aplica filtro suave de precio: descarta solo extremos si hay suficientes resultados.
   * Si hay pocos, permite todos los precios (evita quedarse sin resultados).
   */
  private filterByPriceSoft(items: RestaurantDTO[], priceRange?: number[]): RestaurantDTO[] {
    if (!priceRange || priceRange.length === 0 || items.length < MIN_RESULTS_THRESHOLD) {
      return items; // Si pocos resultados, no filtrar por precio
    }

    const filtered = items.filter(r => {
      if (typeof r.price !== 'number') return true; // Sin info de precio → incluir
      return priceRange.includes(r.price);
    });

    // Si el filtrado reduce demasiado, devolver original
    return filtered.length >= MIN_RESULTS_THRESHOLD / 2 ? filtered : items;
  }

  /**
   * Aplica diversidad limitando restaurantes de la misma cadena/nombre.
   * Evita que el top esté saturado por franquicias repetidas.
   */
  private applyDiversity(items: RestaurantDTO[]): RestaurantDTO[] {
    const chainCounts = new Map<string, number>();
    const result: RestaurantDTO[] = [];

    for (const item of items) {
      // Normalizar nombre: quitar números, "branch", etc.
      const baseName = (item.name || '')
        .toLowerCase()
        .replace(/\d+/g, '')
        .replace(/branch|sucursal|#|\s+/gi, '')
        .trim();

      const count = chainCounts.get(baseName) || 0;
      if (count < MAX_PER_CHAIN) {
        result.push(item);
        chainCounts.set(baseName, count + 1);
      }
    }

    return result;
  }

  /**
   * Detecta qué cocinas seleccionadas NO están representadas en los resultados actuales.
   */
  private findMissingCuisines(items: RestaurantDTO[], selectedCuisines: string[]): string[] {
    if (selectedCuisines.length === 0 || items.length === 0) return [];

    const representedCuisines = new Set<string>();
    
    for (const restaurant of items) {
      if (!restaurant.cuisines) continue;
      
      for (const selectedCuisine of selectedCuisines) {
        const patterns = CUISINE_PATTERNS[selectedCuisine] || [selectedCuisine];
        const matches = restaurant.cuisines.some(cuisineType =>
          patterns.some(pattern => cuisineType.toLowerCase().includes(pattern.toLowerCase()))
        );
        if (matches) {
          representedCuisines.add(selectedCuisine);
        }
      }
    }

    return selectedCuisines.filter(c => !representedCuisines.has(c));
  }

  /**
   * Elimina duplicados por ID y fusiona dos listas de resultados.
   */
  private mergeResults(existing: RestaurantDTO[], newItems: RestaurantDTO[]): RestaurantDTO[] {
    const existingIds = new Set(existing.map(r => r.id));
    const toAdd = newItems.filter(item => !existingIds.has(item.id));
    return [...existing, ...toAdd];
  }

  /**
   * Método principal de búsqueda con estrategia híbrida adaptativa:
   * 
   * ESTRATEGIA SEGÚN CANTIDAD DE COCINAS:
   * - 0-4 cocinas: Query directa con cocinas canónicas (1 llamada + fallback opcional)
   * - 5-8 cocinas: Híbrida inteligente (1ª con top 3-4, 2ª con faltantes si es necesario)
   * - 9+ cocinas: Query genérica "restaurant" + boost con top canónicas si insuficientes
   * 
   * PIPELINE COMÚN (post-query):
   * 1. Filtrado local por TODAS las cocinas seleccionadas (match OR)
   * 2. Filtro suave de precio (no elimina si pocos resultados)
   * 3. Diversidad (limita repeticiones de cadenas)
   * 
   * Máximo 2 llamadas a la API por búsqueda para controlar costes.
   */
  async search(params: SearchParams): Promise<SearchResult> {
    const { radiusKm, filters, center } = params;
    const effectiveCenter = center || this.defaultCenter;
    
    if (!effectiveCenter) {
      throw new Error("Center required: provide center or set PLACES_DEFAULT_CENTER");
    }

    const radiusM = typeof radiusKm === "number" && radiusKm > 0
      ? Math.round(radiusKm * 1000)
      : this.defaultRadiusM;

    const selectedCuisines = filters?.cuisines || [];
    const customKeywords = filters?.customCuisines || [];
    const cuisineCount = selectedCuisines.length;
    let callsMade = 0;
    const filtersWithoutPrice = { ...filters, price: undefined };

    if (this.isDev) {
      console.log(`[GooglePlaces] Búsqueda iniciada: ${cuisineCount} cocinas, ${customKeywords.length} términos personalizados`);
    }

    // ═══════════════════════════════════════════════════════════
    // ESTRATEGIA 1: 0-4 COCINAS → Query directa optimizada
    // ═══════════════════════════════════════════════════════════
    if (cuisineCount <= 4) {
      if (this.isDev) console.log(`[GooglePlaces] Estrategia 1: Query directa (≤4 cocinas)`);
      
      const query = this.buildOptimizedQuery(selectedCuisines, customKeywords);
      let result = await this.executeSearch(query, effectiveCenter, radiusM, filtersWithoutPrice);
      callsMade++;
      
      result.items = this.applyPostProcessing(result.items, selectedCuisines, customKeywords, filters, effectiveCenter, radiusM);
      
      // Fallback si resultados insuficientes
      if (result.items.length < MIN_RESULTS_THRESHOLD && callsMade < MAX_API_CALLS) {
        result = await this.executeFallback(result, query, effectiveCenter, radiusM, filtersWithoutPrice, selectedCuisines, customKeywords, filters);
        callsMade++;
      }
      
      if (this.isDev) console.log(`[GooglePlaces] Completado: ${result.items.length} resultados, ${callsMade} llamadas`);
      return result;
    }

    // ═══════════════════════════════════════════════════════════
    // ESTRATEGIA 2: 5-8 COCINAS → Híbrida inteligente con detección de faltantes
    // ═══════════════════════════════════════════════════════════
    if (cuisineCount >= 5 && cuisineCount <= 8) {
      if (this.isDev) console.log(`[GooglePlaces] Estrategia 2: Híbrida inteligente (5-8 cocinas)`);
      
      // 1ª llamada: top 3-4 cocinas canónicas prioritarias
      const initialQuery = this.buildOptimizedQuery(selectedCuisines, customKeywords);
      let result = await this.executeSearch(initialQuery, effectiveCenter, radiusM, filtersWithoutPrice);
      callsMade++;
      
      result.items = this.applyPostProcessing(result.items, selectedCuisines, customKeywords, filters, effectiveCenter, radiusM);
      
      // Detectar cocinas faltantes en los resultados
      const missingCuisines = this.findMissingCuisines(result.items, selectedCuisines);
      if (this.isDev) console.log(`[GooglePlaces] Cocinas representadas: ${cuisineCount - missingCuisines.length}/${cuisineCount}`);
      
      // 2ª llamada: específica para cocinas faltantes (si las hay y tenemos presupuesto)
      if (missingCuisines.length > 0 && callsMade < MAX_API_CALLS) {
        if (this.isDev) console.log(`[GooglePlaces] 2ª llamada para cubrir faltantes: ${missingCuisines.join(', ')}`);
        
        const missingQuery = this.buildOptimizedQuery(missingCuisines, customKeywords);
        const missingResult = await this.executeSearch(missingQuery, effectiveCenter, radiusM, filtersWithoutPrice);
        callsMade++;
        
        let missingItems = this.applyPostProcessing(missingResult.items, selectedCuisines, customKeywords, filters, effectiveCenter, radiusM);
        
        // Merge sin duplicados
        result.items = this.mergeResults(result.items, missingItems);
        result.items = this.applyDiversity(result.items); // Re-aplicar diversidad tras merge
        
        if (this.isDev) console.log(`[GooglePlaces] Tras 2ª llamada: ${result.items.length} resultados (+${missingItems.length} nuevos)`);
      }
      
      if (this.isDev) console.log(`[GooglePlaces] Completado: ${result.items.length} resultados, ${callsMade} llamadas`);
      return result;
    }

    // ═══════════════════════════════════════════════════════════
    // ESTRATEGIA 3: 9+ COCINAS → Query genérica + boost prioritario
    // ═══════════════════════════════════════════════════════════
    if (this.isDev) console.log(`[GooglePlaces] Estrategia 3: Query genérica + boost (≥9 cocinas)`);
    
    // 1ª llamada: query genérica "restaurant" (filtrado local exhaustivo)
    const genericQuery = customKeywords.length > 0 
      ? `restaurant ${customKeywords.join(' ')}`
      : "restaurant";
    let result = await this.executeSearch(genericQuery, effectiveCenter, radiusM, filtersWithoutPrice);
    callsMade++;
    
    result.items = this.applyPostProcessing(result.items, selectedCuisines, customKeywords, filters, effectiveCenter, radiusM);
    
    // 2ª llamada: boost con top 3-4 canónicas si resultados insuficientes
    if (result.items.length < MIN_RESULTS_THRESHOLD && callsMade < MAX_API_CALLS) {
      if (this.isDev) console.log(`[GooglePlaces] Boost: query con top 3-4 canónicas para mejorar resultados`);
      
      const boostQuery = this.buildOptimizedQuery(selectedCuisines, customKeywords);
      const boostResult = await this.executeSearch(boostQuery, effectiveCenter, radiusM, filtersWithoutPrice);
      callsMade++;
      
      let boostItems = this.applyPostProcessing(boostResult.items, selectedCuisines, customKeywords, filters, effectiveCenter, radiusM);
      
      result.items = this.mergeResults(result.items, boostItems);
      result.items = this.applyDiversity(result.items);
      
      if (this.isDev) console.log(`[GooglePlaces] Tras boost: ${result.items.length} resultados (+${boostItems.length} nuevos)`);
    }
    
    if (this.isDev) console.log(`[GooglePlaces] Completado: ${result.items.length} resultados, ${callsMade} llamadas`);
    return result;
  }

  /**
   * Aplica el pipeline de post-procesado común a todos los resultados:
   * 1. Filtrado por cocinas seleccionadas
   * 2. Filtrado por términos personalizados
   * 3. Filtrado suave de precio
   * 4. Diversidad (limitar cadenas)
   */
  private applyPostProcessing(
    items: RestaurantDTO[],
    selectedCuisines: string[],
    customKeywords: string[],
    filters: any,
    center: { lat: number; lng: number },
    radiusM: number
  ): RestaurantDTO[] {
    const initialCount = items.length;
    
    // 1. Filtrado por cocinas
    items = this.filterByCuisines(items, selectedCuisines);
    if (this.isDev) console.log(`[GooglePlaces] Post-procesado: ${initialCount} → ${items.length} tras filtrado cocinas`);
    
    // 2. Filtrado por términos personalizados
    items = this.filterByCustomKeywords(items, customKeywords);
    if (this.isDev) console.log(`[GooglePlaces] Post-procesado: filtrado custom keywords → ${items.length}`);
    
    // 3. Filtrado suave de precio
    items = this.filterByPriceSoft(items, filters?.price);
    if (this.isDev) console.log(`[GooglePlaces] Post-procesado: filtrado precio → ${items.length}`);
    
    // 4. Diversidad
    items = this.applyDiversity(items);
    if (this.isDev) console.log(`[GooglePlaces] Post-procesado: diversidad → ${items.length}`);
    
    return items;
  }

  /**
   * Ejecuta fallback estándar: amplía radio y relaja openNow.
   */
  private async executeFallback(
    currentResult: SearchResult,
    query: string,
    center: { lat: number; lng: number },
    radiusM: number,
    filtersWithoutPrice: any,
    selectedCuisines: string[],
    customKeywords: string[],
    filters: any
  ): Promise<SearchResult> {
    if (this.isDev) console.log(`[GooglePlaces] Fallback: ${currentResult.items.length} < ${MIN_RESULTS_THRESHOLD}`);
    
    const fallbackFilters = { ...filtersWithoutPrice, openNow: false };
    const fallbackRadiusM = Math.round(radiusM * FALLBACK_RADIUS_MULTIPLIER);
    
    const fallbackResult = await this.executeSearch(query, center, fallbackRadiusM, fallbackFilters);
    let fallbackItems = this.applyPostProcessing(fallbackResult.items, selectedCuisines, customKeywords, filters, center, radiusM);
    
    currentResult.items = this.mergeResults(currentResult.items, fallbackItems);
    currentResult.items = this.applyDiversity(currentResult.items);
    
    return currentResult;
  }

  /**
   * Ejecuta una búsqueda en Google Places API v1.
   * NOTA: NO envía filtro de precio a la API (se aplica localmente para mayor flexibilidad).
   */
  private async executeSearch(
    query: string,
    center: { lat: number; lng: number },
    radiusM: number,
    filters: any
  ): Promise<SearchResult> {
    // NO construimos priceLevels - filtrado de precio se hace localmente
    const FIELD_MASK = [
      "places.id",
      "places.displayName",
      "places.formattedAddress",
      "places.location",
      "places.rating",
      "places.userRatingCount",
      "places.priceLevel",
      "places.photos",
      "places.types",
      "places.currentOpeningHours",
      "places.businessStatus",
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

    // Aplicar filtro de openNow solo si está en filters (puede ser relajado en fallback)
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

    items = items
      .map(r => {
        if (!r.location) return r;
        const distanceM = calculateDistance(center.lat, center.lng, r.location.lat, r.location.lng);
        return { ...r, distanceKm: distanceM / 1000 };
      })
      .filter(r => {
        if (!r.location) return false;
        return (r.distanceKm ?? 0) * 1000 <= radiusM;
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