// Creates a super-admin account.
//   ADMIN_NAME="Boss" ADMIN_USERNAME=boss ADMIN_PASSWORD=... pnpm --filter @dawry/api admin:create
// Production (inside the api container):
//   docker compose run --rm -e ADMIN_NAME=... -e ADMIN_USERNAME=... -e ADMIN_PASSWORD=... api node dist/cli/create-admin.js
import { createAuth } from "../auth";
import { createDb } from "../db/client";
import { loadEnv } from "../env";
import { createSuperAdmin } from "../modules/admin/service";

const env = loadEnv();
const { ADMIN_NAME, ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;
if (!ADMIN_NAME || !ADMIN_USERNAME || !ADMIN_PASSWORD) {
  console.error("Set ADMIN_NAME, ADMIN_USERNAME and ADMIN_PASSWORD.");
  process.exit(1);
}

const { db, pool } = createDb(env.DATABASE_URL);
const auth = createAuth(db, {
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [env.WEB_ORIGIN],
  production: process.env.NODE_ENV === "production",
  rateLimit: false,
});

try {
  await createSuperAdmin(auth, db, {
    name: ADMIN_NAME,
    username: ADMIN_USERNAME,
    password: ADMIN_PASSWORD,
  });
  console.log(`super-admin "${ADMIN_USERNAME}" created`);
} catch (error) {
  console.error(`failed: ${(error as Error).message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
