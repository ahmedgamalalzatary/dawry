// Shared between apps/api and apps/web: constants, types and zod schemas.
// Queue / ETA logic will live here (built test-first).

export const ORDER_STATUSES = [
  "preparing",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const LOCALES = ["ar", "en"] as const;
export type Locale = (typeof LOCALES)[number];
