import { and, asc, eq, like } from "drizzle-orm";
import type { Db } from "../../db/client";
import { organization, restaurantSettings, savedOrder } from "../../db/schema";

/** Only active restaurants exist publicly. */
export async function findActiveRestaurant(db: Db, slug: string) {
  const [row] = await db
    .select({
      id: organization.id,
      slug: organization.slug,
      name: organization.name,
      logoUrl: restaurantSettings.logoUrl,
      phone: restaurantSettings.phone,
    })
    .from(organization)
    .innerJoin(restaurantSettings, eq(restaurantSettings.organizationId, organization.id))
    .where(and(eq(organization.slug, slug), eq(restaurantSettings.active, true)))
    .limit(1);
  return row ?? null;
}

/** Idempotent. */
export async function saveOrderFor(db: Db, userId: string, orderId: string) {
  await db
    .insert(savedOrder)
    .values({ userId, orderId })
    .onDuplicateKeyUpdate({ set: { userId } });
}

/** Active restaurants, optionally filtered by a name fragment. */
export function searchActiveRestaurants(db: Db, query: string, limit = 50) {
  // Treat % and _ typed by the user as literal characters.
  const escaped = query.replace(/[\\%_]/g, (c) => `\\${c}`);
  return db
    .select({
      slug: organization.slug,
      name: organization.name,
      logoUrl: restaurantSettings.logoUrl,
      phone: restaurantSettings.phone,
    })
    .from(organization)
    .innerJoin(restaurantSettings, eq(restaurantSettings.organizationId, organization.id))
    .where(
      and(
        eq(restaurantSettings.active, true),
        query ? like(organization.name, `%${escaped}%`) : undefined,
      ),
    )
    .orderBy(asc(organization.name))
    .limit(limit);
}
