import { createApp } from "./app";
import { createAuth } from "./auth";
import { createDb } from "./db/client";
import { loadEnv } from "./env";
import { EventBus } from "./http/events";

const env = loadEnv();
const production = process.env.NODE_ENV === "production";
const { db } = createDb(env.DATABASE_URL);
const auth = createAuth(db, {
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [env.WEB_ORIGIN],
  production,
  rateLimit: production,
});

const app = createApp({
  db,
  auth,
  bus: new EventBus(),
  webOrigin: env.WEB_ORIGIN,
  timeZone: env.APP_TIME_ZONE,
  rateLimit: production,
  now: () => new Date(),
});

app.listen(env.API_PORT, () => {
  console.log(`dawry api listening on http://localhost:${env.API_PORT}`);
});
