// Applies pending migrations from ./drizzle. Used by the production container
// before the API starts (drizzle-kit is a dev-only tool).
import { resolve } from "node:path";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { createDb } from "./db/client";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const { db, pool } = createDb(url);
try {
  await migrate(db, { migrationsFolder: resolve(process.cwd(), "drizzle") });
  console.log("migrations applied");
} finally {
  await pool.end();
}
