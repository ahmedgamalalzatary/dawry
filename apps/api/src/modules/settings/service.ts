import type { RestaurantSettings, restaurantSettingsSchema } from "@dawry/shared";
import type { z } from "zod";
import type { Db } from "../../db/client";
import { notFound } from "../../http/errors";
import * as repo from "./repo";

export async function getSettings(db: Db, restaurantId: string): Promise<RestaurantSettings> {
  const settings = await repo.findSettings(db, restaurantId);
  if (!settings) throw notFound();
  return settings;
}

export async function updateSettings(
  db: Db,
  restaurantId: string,
  input: z.output<typeof restaurantSettingsSchema>,
) {
  await repo.saveSettings(db, restaurantId, input);
  return getSettings(db, restaurantId);
}
