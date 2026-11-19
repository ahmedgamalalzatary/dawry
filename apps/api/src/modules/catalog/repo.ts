import { and, asc, eq, gte } from "drizzle-orm";
import type { Db } from "../../db/client";
import { customField, menuItem, orderItem, orders } from "../../db/schema";

export type MenuItemRow = typeof menuItem.$inferSelect;
export type CustomFieldRow = typeof customField.$inferSelect;

export function listMenu(db: Db, restaurantId: string) {
  return db
    .select()
    .from(menuItem)
    .where(eq(menuItem.organizationId, restaurantId))
    .orderBy(asc(menuItem.name));
}

export async function findMenuItem(db: Db, restaurantId: string, id: string) {
  const [row] = await db
    .select()
    .from(menuItem)
    .where(and(eq(menuItem.id, id), eq(menuItem.organizationId, restaurantId)))
    .limit(1);
  return row ?? null;
}

export async function insertMenuItem(db: Db, values: typeof menuItem.$inferInsert) {
  await db.insert(menuItem).values(values);
}

export async function updateMenuItem(db: Db, id: string, values: Partial<MenuItemRow>) {
  await db.update(menuItem).set(values).where(eq(menuItem.id, id));
}

export function listFields(db: Db, restaurantId: string) {
  return db
    .select()
    .from(customField)
    .where(eq(customField.organizationId, restaurantId))
    .orderBy(asc(customField.createdAt));
}

export async function findField(db: Db, restaurantId: string, id: string) {
  const [row] = await db
    .select()
    .from(customField)
    .where(and(eq(customField.id, id), eq(customField.organizationId, restaurantId)))
    .limit(1);
  return row ?? null;
}

export async function insertField(db: Db, values: typeof customField.$inferInsert) {
  await db.insert(customField).values(values);
}

export async function updateField(db: Db, id: string, values: Partial<CustomFieldRow>) {
  await db.update(customField).set(values).where(eq(customField.id, id));
}

/** Every order line of one menu item from `fromDay` on. */
export function itemSales(db: Db, restaurantId: string, menuItemId: string, fromDay: string) {
  return db
    .select({
      orderId: orderItem.orderId,
      quantity: orderItem.quantity,
      businessDay: orders.businessDay,
      createdAt: orders.createdAt,
      status: orders.status,
    })
    .from(orderItem)
    .innerJoin(orders, eq(orders.id, orderItem.orderId))
    .where(
      and(
        eq(orderItem.menuItemId, menuItemId),
        eq(orders.organizationId, restaurantId),
        gte(orders.businessDay, fromDay),
      ),
    );
}
