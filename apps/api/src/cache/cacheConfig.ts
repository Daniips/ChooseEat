// apps/api/src/cache/cacheConfig.ts
export const CACHE_TTL = {
  // Búsquedas: 1 hora
  SEARCH: 60 * 60,

  // Detalles: 24 horas
  DETAILS: 24 * 60 * 60,

  // Sesiones: 7 días
  SESSION: 7 * 24 * 60 * 60,
} as const;
