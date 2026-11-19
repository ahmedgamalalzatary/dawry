import { eq } from "drizzle-orm";
import type { Db } from "../../db/client";
import { organization, restaurantSettings } from "../../db/schema";

export async function findSettings(db: Db, restaurantId: string) {
  const [row] = await db
    .select({
      name: organization.name,
      slug: organization.slug,
      phone: restaurantSettings.phone,
      logoUrl: restaurantSettings.logoUrl,
    })
    .from(organization)
    .innerJoin(restaurantSettings, eq(restaurantSettings.organizationId, organization.id))
    .where(eq(organization.id, restaurantId))
    .limit(1);
  return row ?? null;
}

export async function saveSettings(
  db: Db,
  restaurantId: string,
  values: { name: string; phone: string; logoUrl: string },
) {
  await db.transaction(async (tx) => {
    await tx.update(organization).set({ name: values.name }).where(eq(organization.id, restaurantId));
    await tx
      .update(restaurantSettings)
      .set({ phone: values.phone, logoUrl: values.logoUrl })
      .where(eq(restaurantSettings.organizationId, restaurantId));
  });
}
