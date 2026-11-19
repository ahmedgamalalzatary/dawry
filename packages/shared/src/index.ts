// Shared between apps/api and apps/web: constants, zod schemas, pure order logic
// and API response types. No I/O here.
export * from "./schemas";
export * from "./orders";
export * from "./types";

export const LOCALES = ["ar", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_TIME_ZONE = "Africa/Cairo";
