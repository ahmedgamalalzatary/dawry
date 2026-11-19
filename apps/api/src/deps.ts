import type { Auth } from "./auth";
import type { Db } from "./db/client";
import type { EventBus } from "./http/events";

/** Everything the HTTP app needs; built in index.ts (or test helpers). */
export interface Deps {
  db: Db;
  auth: Auth;
  bus: EventBus;
  webOrigin: string;
  /** IANA zone used for business days and clock-time ETAs. */
  timeZone: string;
  /** Per-IP rate limits on public endpoints (off in tests). */
  rateLimit: boolean;
  now: () => Date;
}
