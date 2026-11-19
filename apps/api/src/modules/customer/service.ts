import {
  isLate,
  type customerSignUpSchema,
  type Me,
  type PublicRestaurant,
  type SavedOrder,
} from "@dawry/shared";
import type { z } from "zod";
import type { Db } from "../../db/client";
import type { Deps } from "../../deps";
import { notFound } from "../../http/errors";
import type { SessionUser } from "../../http/guards";
import { createAccount, findMembership } from "../accounts/service";
import { findRestaurant } from "../public/service";
import * as repo from "./repo";

export async function signUp(deps: Deps, input: z.output<typeof customerSignUpSchema>) {
  return createAccount(deps.auth, deps.db, {
    name: input.name,
    username: input.phone,
    password: input.password,
  });
}

export async function me(db: Db, user: SessionUser): Promise<Me> {
  const base = { id: user.id, name: user.name, username: user.username };
  if (user.role === "admin") return { ...base, kind: "admin", restaurant: null };
  const membership = await findMembership(db, user.id);
  if (!membership) return { ...base, kind: "customer", restaurant: null };
  const { id, name, slug, active } = membership;
  return {
    ...base,
    kind: membership.role === "owner" ? "owner" : "staff",
    restaurant: { id, name, slug, active },
  };
}

const ACTIVE = new Set(["preparing", "out_for_delivery"]);

/** Active orders first, then newest saved. */
export async function savedOrders(deps: Deps, userId: string): Promise<SavedOrder[]> {
  const now = deps.now();
  const rows = await repo.savedOrders(deps.db, userId);
  return rows
    .map((r) => ({
      ...r,
      etaAt: r.etaAt.toISOString(),
      savedAt: r.savedAt.toISOString(),
      late: isLate(r, now),
    }))
    .sort((a, b) => Number(ACTIVE.has(b.status)) - Number(ACTIVE.has(a.status)));
}

export const activeSavedRestaurantIds = repo.activeSavedRestaurantIds;

export async function forgetOrder(
  db: Db,
  userId: string,
  slug: string,
  day: string,
  invoiceNumber: string,
) {
  const orderId = await repo.findSavedOrderId(db, userId, slug, day, invoiceNumber);
  if (!orderId) throw notFound("Saved order not found");
  await repo.deleteSavedOrder(db, userId, orderId);
}

export async function favorites(db: Db, userId: string): Promise<PublicRestaurant[]> {
  const rows = await repo.favorites(db, userId);
  return rows.map((r) => ({ ...r, logoUrl: r.logoUrl || null, phone: r.phone || null }));
}

async function requireRestaurant(db: Db, slug: string) {
  const restaurant = await findRestaurant(db, slug);
  if (!restaurant) throw notFound();
  return restaurant;
}

export async function addFavorite(db: Db, userId: string, slug: string) {
  await repo.addFavorite(db, userId, (await requireRestaurant(db, slug)).id);
}

export async function removeFavorite(db: Db, userId: string, slug: string) {
  await repo.removeFavorite(db, userId, (await requireRestaurant(db, slug)).id);
}
