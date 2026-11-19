import { LOGO_TYPES, type RestaurantSettings, type restaurantSettingsSchema } from "@dawry/shared";
import type { z } from "zod";
import type { Db } from "../../db/client";
import { HttpError, notFound } from "../../http/errors";
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

type LogoType = (typeof LOGO_TYPES)[number];

/** The real type from the file's first bytes; the Content-Type header alone is not trusted. */
export function sniffImage(data: Buffer): LogoType | null {
  if (data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return "image/jpeg";
  if (data.length >= 12 && data.toString("latin1", 0, 4) === "RIFF" && data.toString("latin1", 8, 12) === "WEBP") {
    return "image/webp";
  }
  return null;
}

export async function uploadLogo(db: Db, restaurantId: string, data: unknown, now: Date) {
  const mime = Buffer.isBuffer(data) ? sniffImage(data) : null;
  if (!mime) throw new HttpError("validation_failed", "Upload a PNG, JPEG or WebP image up to 1 MB");
  await repo.saveLogo(db, restaurantId, mime, data as Buffer, `/api/public/logos/${restaurantId}?v=${now.getTime()}`);
  return getSettings(db, restaurantId);
}

export async function removeLogo(db: Db, restaurantId: string) {
  await repo.deleteLogo(db, restaurantId);
  return getSettings(db, restaurantId);
}

export const findLogo = repo.findLogo;
