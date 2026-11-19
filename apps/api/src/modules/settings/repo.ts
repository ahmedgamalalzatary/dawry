import { eq } from "drizzle-orm";
import type { Db } from "../../db/client";
import { organization, restaurantLogo, restaurantSettings } from "../../db/schema";

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

export async function saveLogo(db: Db, restaurantId: string, mime: string, data: Buffer, logoUrl: string) {
  await db.transaction(async (tx) => {
    await tx
      .insert(restaurantLogo)
      .values({ organizationId: restaurantId, mime, data })
      .onDuplicateKeyUpdate({ set: { mime, data, updatedAt: new Date() } });
    await tx.update(restaurantSettings).set({ logoUrl }).where(eq(restaurantSettings.organizationId, restaurantId));
  });
}

export async function deleteLogo(db: Db, restaurantId: string) {
  await db.transaction(async (tx) => {
    await tx.delete(restaurantLogo).where(eq(restaurantLogo.organizationId, restaurantId));
    await tx.update(restaurantSettings).set({ logoUrl: "" }).where(eq(restaurantSettings.organizationId, restaurantId));
  });
}

export async function findLogo(db: Db, restaurantId: string) {
  const [row] = await db
    .select({ mime: restaurantLogo.mime, data: restaurantLogo.data })
    .from(restaurantLogo)
    .where(eq(restaurantLogo.organizationId, restaurantId))
    .limit(1);
  return row ?? null;
}
