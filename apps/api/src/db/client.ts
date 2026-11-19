import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

export function createDb(databaseUrl: string) {
  const pool = mysql.createPool(databaseUrl);
  const db = drizzle(pool, { schema, mode: "default" });
  return { db, pool };
}

export type Db = ReturnType<typeof createDb>["db"];
