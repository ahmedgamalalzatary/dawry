import { resolve } from "node:path";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { createDb } from "../../src/db/client";

/** Bring the test database schema up to date once per test run. */
export default async function setup() {
  const url = process.env.DATABASE_URL;
  if (!url?.includes("_test")) {
    throw new Error("Refusing to migrate: DATABASE_URL is not a _test database.");
  }
  const { db, pool } = createDb(url);
  try {
    await migrate(db, { migrationsFolder: resolve(import.meta.dirname, "../../drizzle") });
  } finally {
    await pool.end();
  }
}
