import { createDb } from "../../src/db/client";

const url = process.env.DATABASE_URL;
if (!url || !url.includes("_test")) {
  throw new Error(
    "Tests must run against the test database (.env.test, DATABASE_URL ending in _test).",
  );
}

const { db, pool } = createDb(url);
export const testDb = db;

/** Empty every table in the test database (keeps the schema and migration history). */
export async function resetDb() {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name <> '__drizzle_migrations'",
    );
    await conn.query("SET FOREIGN_KEY_CHECKS = 0");
    for (const { name } of rows as { name: string }[]) {
      await conn.query(`TRUNCATE TABLE \`${name}\``);
    }
    await conn.query("SET FOREIGN_KEY_CHECKS = 1");
  } finally {
    conn.release();
  }
}

export async function closeTestDb() {
  await pool.end();
}
