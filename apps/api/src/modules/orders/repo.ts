import { and, asc, eq, inArray, or } from "drizzle-orm";
import type { Db } from "../../db/client";
import { customField, menuItem, orderFieldValue, orderItem, orders } from "../../db/schema";

export type OrderRow = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type NewOrderItem = typeof orderItem.$inferInsert;
export type NewOrderFieldValue = typeof orderFieldValue.$inferInsert;

const ACTIVE = ["preparing", "out_for_delivery"] as const;

/** Today's orders plus yesterday's unfinished ones. */
export function liveOrders(db: Db, restaurantId: string, today: string, yesterday: string) {
  return db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.organizationId, restaurantId),
        or(
          eq(orders.businessDay, today),
          and(eq(orders.businessDay, yesterday), inArray(orders.status, [...ACTIVE])),
        ),
      ),
    );
}

export async function findOrder(db: Db, restaurantId: string, orderId: string) {
  const [row] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.organizationId, restaurantId)))
    .limit(1);
  return row ?? null;
}

export async function invoiceExists(db: Db, restaurantId: string, day: string, invoice: string) {
  const [row] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(
      and(
        eq(orders.organizationId, restaurantId),
        eq(orders.businessDay, day),
        eq(orders.invoiceNumber, invoice),
      ),
    )
    .limit(1);
  return Boolean(row);
}

export async function itemsAndFields(db: Db, orderIds: string[]) {
  if (orderIds.length === 0) return { items: [], fields: [] };
  const [items, fields] = await Promise.all([
    db
      .select()
      .from(orderItem)
      .where(inArray(orderItem.orderId, orderIds))
      .orderBy(asc(orderItem.position)),
    db
      .select()
      .from(orderFieldValue)
      .where(inArray(orderFieldValue.orderId, orderIds))
      .orderBy(asc(orderFieldValue.position)),
  ]);
  return { items, fields };
}

export function restaurantFields(db: Db, restaurantId: string) {
  return db.select().from(customField).where(eq(customField.organizationId, restaurantId));
}

export async function countOwnMenuItems(db: Db, restaurantId: string, ids: string[]) {
  const rows = await db
    .select({ id: menuItem.id })
    .from(menuItem)
    .where(and(eq(menuItem.organizationId, restaurantId), inArray(menuItem.id, ids)));
  return rows.length;
}

export async function insertOrder(
  db: Db,
  order: NewOrder,
  items: NewOrderItem[],
  fields: NewOrderFieldValue[],
) {
  await db.transaction(async (tx) => {
    await tx.insert(orders).values(order);
    await tx.insert(orderItem).values(items);
    if (fields.length > 0) await tx.insert(orderFieldValue).values(fields);
  });
}

export async function updateOrder(db: Db, orderId: string, values: Partial<NewOrder>) {
  await db.update(orders).set(values).where(eq(orders.id, orderId));
}
