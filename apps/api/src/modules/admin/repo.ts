import { randomUUID } from "node:crypto";
import { and, count, eq, gte, isNull, ne, or } from "drizzle-orm";
import type { Db } from "../../db/client";
import { member, orders, organization, restaurantSettings, user } from "../../db/schema";

export async function slugExists(db: Db, slug: string) {
  const [row] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.slug, slug))
    .limit(1);
  return Boolean(row);
}

export async function insertRestaurant(
  db: Db,
  values: { id: string; name: string; slug: string; ownerId: string },
) {
  await db.transaction(async (tx) => {
    await tx.insert(organization).values({ id: values.id, name: values.name, slug: values.slug });
    await tx.insert(restaurantSettings).values({ organizationId: values.id });
    await tx
      .insert(member)
      .values({ id: randomUUID(), organizationId: values.id, userId: values.ownerId, role: "owner" });
  });
}

export function listRestaurants(db: Db) {
  return db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      createdAt: organization.createdAt,
      active: restaurantSettings.active,
    })
    .from(organization)
    .innerJoin(restaurantSettings, eq(restaurantSettings.organizationId, organization.id))
    .orderBy(organization.name);
}

export function listMembers(db: Db) {
  return db
    .select({
      organizationId: member.organizationId,
      role: member.role,
      userId: user.id,
      name: user.name,
      username: user.username,
    })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId));
}

export function orderCountsForDay(db: Db, day: string) {
  return db
    .select({ organizationId: orders.organizationId, n: count() })
    .from(orders)
    .where(eq(orders.businessDay, day))
    .groupBy(orders.organizationId);
}

/** Returns false when the restaurant does not exist. */
export async function setActive(db: Db, restaurantId: string, active: boolean) {
  const [result] = await db
    .update(restaurantSettings)
    .set({ active })
    .where(eq(restaurantSettings.organizationId, restaurantId));
  return result.affectedRows > 0;
}

const first = async (query: Promise<{ n: number }[]>) => (await query)[0]?.n ?? 0;

export async function counts(db: Db, today: string, from: string) {
  const [restaurants, activeRestaurants, ordersToday, ordersLast30Days, customers] =
    await Promise.all([
      first(db.select({ n: count() }).from(restaurantSettings)),
      first(
        db.select({ n: count() }).from(restaurantSettings).where(eq(restaurantSettings.active, true)),
      ),
      first(db.select({ n: count() }).from(orders).where(eq(orders.businessDay, today))),
      first(db.select({ n: count() }).from(orders).where(gte(orders.businessDay, from))),
      // Customers: users who are neither restaurant members nor admins.
      first(
        db
          .select({ n: count() })
          .from(user)
          .leftJoin(member, eq(member.userId, user.id))
          .where(and(isNull(member.id), or(isNull(user.role), ne(user.role, "admin")))),
      ),
    ]);
  return { restaurants, activeRestaurants, ordersToday, ordersLast30Days, customers };
}

export async function findRestaurant(db: Db, restaurantId: string) {
  const [row] = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      createdAt: organization.createdAt,
      active: restaurantSettings.active,
      phone: restaurantSettings.phone,
      logoUrl: restaurantSettings.logoUrl,
    })
    .from(organization)
    .innerJoin(restaurantSettings, eq(restaurantSettings.organizationId, organization.id))
    .where(eq(organization.id, restaurantId))
    .limit(1);
  return row ?? null;
}

export function membersOf(db: Db, restaurantId: string) {
  return db
    .select({
      role: member.role,
      userId: user.id,
      name: user.name,
      username: user.username,
      createdAt: member.createdAt,
    })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .where(eq(member.organizationId, restaurantId));
}

/** New customers and restaurants since `since`. */
export async function growth(db: Db, since: Date) {
  const [newCustomers, newRestaurants] = await Promise.all([
    first(
      db
        .select({ n: count() })
        .from(user)
        .leftJoin(member, eq(member.userId, user.id))
        .where(
          and(isNull(member.id), or(isNull(user.role), ne(user.role, "admin")), gte(user.createdAt, since)),
        ),
    ),
    first(db.select({ n: count() }).from(organization).where(gte(organization.createdAt, since))),
  ]);
  return { newCustomers, newRestaurants };
}
