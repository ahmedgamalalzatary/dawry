import { and, eq, gte } from "drizzle-orm";
import type { Db } from "../../db/client";
import { orders } from "../../db/schema";

export function ordersSince(db: Db, restaurantId: string, fromDay: string) {
  return db
    .select({
      businessDay: orders.businessDay,
      status: orders.status,
      createdAt: orders.createdAt,
      etaAt: orders.etaAt,
      outAt: orders.outAt,
    })
    .from(orders)
    .where(and(eq(orders.organizationId, restaurantId), gte(orders.businessDay, fromDay)));
}

export type ReportOrder = Awaited<ReturnType<typeof ordersSince>>[number];
