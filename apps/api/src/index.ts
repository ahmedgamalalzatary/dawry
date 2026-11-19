import { createApp } from "./app";
import { createAuth } from "./auth";
import { createDb } from "./db/client";
import { loadEnv } from "./env";

const env = loadEnv();
const { db } = createDb(env.DATABASE_URL);
const auth = createAuth(db, {
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [env.WEB_ORIGIN],
});
const app = createApp({ webOrigin: env.WEB_ORIGIN, auth });

app.listen(env.API_PORT, () => {
  console.log(`dawry api listening on http://localhost:${env.API_PORT}`);
});
