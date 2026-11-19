import { and, eq, gte, inArray, lte, type SQL } from "drizzle-orm";
import type { Db } from "../../db/client";
import { member, orderItem, orders, organization, restaurantSettings, user } from "../../db/schema";
import type { ReportItemRow, ReportOrder } from "./helpers";

const columns = {
  id: orders.id,
  organizationId: orders.organizationId,
  businessDay: orders.businessDay,
  status: orders.status,
  etaMode: orders.etaMode,
  createdAt: orders.createdAt,
  etaAt: orders.etaAt,
  outAt: orders.outAt,
  deliveredAt: orders.deliveredAt,
  cancelledAt: orders.cancelledAt,
  createdById: orders.createdById,
};

/** Orders from `fromDay` on: one restaurant, or every restaurant when `restaurantId` is null. */
export function ordersSince(db: Db, restaurantId: string | null, fromDay: string, extra?: SQL): Promise<ReportOrder[]> {
  const where = [gte(orders.businessDay, fromDay)];
  if (restaurantId) where.push(eq(orders.organizationId, restaurantId));
  if (extra) where.push(extra);
  return db.select(columns).from(orders).where(and(...where));
}

const CHUNK = 1000;

export async function itemsOf(db: Db, orderIds: string[]): Promise<ReportItemRow[]> {
  const rows: ReportItemRow[] = [];
  for (let i = 0; i < orderIds.length; i += CHUNK) {
    rows.push(
      ...(await db
        .select({ orderId: orderItem.orderId, name: orderItem.name, quantity: orderItem.quantity })
        .from(orderItem)
        .where(inArray(orderItem.orderId, orderIds.slice(i, i + CHUNK)))),
    );
  }
  return rows;
}

/** Owner and staff names of one restaurant, by user id. */
export async function memberNames(db: Db, restaurantId: string) {
  const rows = await db
    .select({ id: user.id, name: user.name })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .where(eq(member.organizationId, restaurantId));
  return new Map(rows.map((r) => [r.id, r.name]));
}

/** Orders whose business day is within from..to: one restaurant, or all when `restaurantId` is null. */
export function ordersBetween(db: Db, restaurantId: string | null, from: string, to: string) {
  const where = [gte(orders.businessDay, from), lte(orders.businessDay, to)];
  if (restaurantId) where.push(eq(orders.organizationId, restaurantId));
  return db
    .select({ ...columns, invoiceNumber: orders.invoiceNumber, customerName: orders.customerName })
    .from(orders)
    .where(and(...where));
}

/** Everyone who works at a restaurant (or at any restaurant). */
export function peopleOf(db: Db, restaurantId: string | null) {
  const query = db
    .select({ id: user.id, name: user.name, restaurantId: member.organizationId })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId));
  return restaurantId ? query.where(eq(member.organizationId, restaurantId)) : query;
}

export function restaurantsOf(db: Db, restaurantId: string | null) {
  const query = db
    .select({ id: organization.id, name: organization.name, slug: organization.slug, active: restaurantSettings.active })
    .from(organization)
    .innerJoin(restaurantSettings, eq(restaurantSettings.organizationId, organization.id));
  return restaurantId ? query.where(eq(organization.id, restaurantId)) : query;
}
