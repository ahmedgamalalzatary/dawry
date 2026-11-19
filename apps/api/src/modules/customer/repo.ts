import { and, desc, eq, inArray } from "drizzle-orm";
import type { Db } from "../../db/client";
import {
  favoriteRestaurant,
  orders,
  organization,
  restaurantSettings,
  savedOrder,
} from "../../db/schema";

const ACTIVE = ["preparing", "out_for_delivery"] as const;

/** Saved orders of active restaurants, newest first. */
export function savedOrders(db: Db, userId: string, limit = 100) {
  return db
    .select({
      slug: organization.slug,
      restaurantName: organization.name,
      invoiceNumber: orders.invoiceNumber,
      businessDay: orders.businessDay,
      status: orders.status,
      etaAt: orders.etaAt,
      savedAt: savedOrder.createdAt,
    })
    .from(savedOrder)
    .innerJoin(orders, eq(orders.id, savedOrder.orderId))
    .innerJoin(organization, eq(organization.id, orders.organizationId))
    .innerJoin(restaurantSettings, eq(restaurantSettings.organizationId, organization.id))
    .where(and(eq(savedOrder.userId, userId), eq(restaurantSettings.active, true)))
    .orderBy(desc(savedOrder.createdAt))
    .limit(limit);
}

export async function activeSavedRestaurantIds(db: Db, userId: string) {
  const rows = await db
    .selectDistinct({ id: orders.organizationId })
    .from(savedOrder)
    .innerJoin(orders, eq(orders.id, savedOrder.orderId))
    .where(and(eq(savedOrder.userId, userId), inArray(orders.status, [...ACTIVE])));
  return new Set(rows.map((r) => r.id));
}

export async function findSavedOrderId(
  db: Db,
  userId: string,
  slug: string,
  day: string,
  invoiceNumber: string,
) {
  const [row] = await db
    .select({ orderId: orders.id })
    .from(savedOrder)
    .innerJoin(orders, eq(orders.id, savedOrder.orderId))
    .innerJoin(organization, eq(organization.id, orders.organizationId))
    .where(
      and(
        eq(savedOrder.userId, userId),
        eq(organization.slug, slug),
        eq(orders.businessDay, day),
        eq(orders.invoiceNumber, invoiceNumber),
      ),
    )
    .limit(1);
  return row?.orderId ?? null;
}

export async function deleteSavedOrder(db: Db, userId: string, orderId: string) {
  await db
    .delete(savedOrder)
    .where(and(eq(savedOrder.userId, userId), eq(savedOrder.orderId, orderId)));
}

export function favorites(db: Db, userId: string) {
  return db
    .select({
      slug: organization.slug,
      name: organization.name,
      logoUrl: restaurantSettings.logoUrl,
      phone: restaurantSettings.phone,
    })
    .from(favoriteRestaurant)
    .innerJoin(organization, eq(organization.id, favoriteRestaurant.organizationId))
    .innerJoin(restaurantSettings, eq(restaurantSettings.organizationId, organization.id))
    .where(and(eq(favoriteRestaurant.userId, userId), eq(restaurantSettings.active, true)))
    .orderBy(organization.name);
}

/** Idempotent. */
export async function addFavorite(db: Db, userId: string, restaurantId: string) {
  await db
    .insert(favoriteRestaurant)
    .values({ userId, organizationId: restaurantId })
    .onDuplicateKeyUpdate({ set: { userId } });
}

export async function removeFavorite(db: Db, userId: string, restaurantId: string) {
  await db
    .delete(favoriteRestaurant)
    .where(
      and(eq(favoriteRestaurant.userId, userId), eq(favoriteRestaurant.organizationId, restaurantId)),
    );
}
