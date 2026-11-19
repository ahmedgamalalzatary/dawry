import { randomUUID } from "node:crypto";
import {
  businessDay,
  createStaffSchema,
  type AdminRestaurant,
  type createRestaurantSchema,
  type PlatformStats,
} from "@dawry/shared";
import type { z } from "zod";
import type { Auth } from "../../auth";
import type { Db } from "../../db/client";
import { conflict, notFound } from "../../http/errors";
import { createAccount, deleteUser, setPassword } from "../accounts/service";
import { isDuplicateKey, type Clock } from "../orders/helpers";
import * as repo from "./repo";

const slugTaken = () => conflict("This restaurant link is already taken");

export async function createRestaurant(
  auth: Auth,
  db: Db,
  input: z.output<typeof createRestaurantSchema>,
) {
  if (await repo.slugExists(db, input.slug)) throw slugTaken();

  const ownerId = await createAccount(auth, db, {
    name: input.ownerName,
    username: input.ownerPhone,
    password: input.ownerPassword,
  });

  const id = randomUUID();
  try {
    await repo.insertRestaurant(db, { id, name: input.name, slug: input.slug, ownerId });
  } catch (error) {
    await deleteUser(db, ownerId); // no orphan owner accounts
    if (isDuplicateKey(error)) throw slugTaken();
    throw error;
  }
  return { id, name: input.name, slug: input.slug, active: true };
}

export async function listRestaurants(db: Db, clock: Clock): Promise<AdminRestaurant[]> {
  const today = businessDay(clock.now(), clock.timeZone);
  const [restaurants, members, todayCounts] = await Promise.all([
    repo.listRestaurants(db),
    repo.listMembers(db),
    repo.orderCountsForDay(db, today),
  ]);

  return restaurants.map((r) => {
    const owner = members.find((m) => m.organizationId === r.id && m.role === "owner");
    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      active: r.active,
      owner: owner ? { id: owner.userId, name: owner.name, phone: owner.username ?? "" } : null,
      staffCount: members.filter((m) => m.organizationId === r.id && m.role === "member").length,
      ordersToday: todayCounts.find((c) => c.organizationId === r.id)?.n ?? 0,
      createdAt: r.createdAt.toISOString(),
    };
  });
}

export async function setActive(db: Db, restaurantId: string, active: boolean) {
  if (!(await repo.setActive(db, restaurantId, active))) throw notFound("Restaurant not found");
}

export async function resetPassword(auth: Auth, db: Db, userId: string, password: string) {
  if (!(await setPassword(auth, db, userId, password))) throw notFound("User not found");
}

export async function stats(db: Db, clock: Clock): Promise<PlatformStats> {
  const now = clock.now();
  const today = businessDay(now, clock.timeZone);
  const from = businessDay(new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000), clock.timeZone);
  return repo.counts(db, today, from);
}

/** Super-admin accounts are created from the CLI only (src/cli/create-admin.ts). */
export async function createSuperAdmin(
  auth: Auth,
  db: Db,
  input: { name: string; username: string; password: string },
) {
  // Same username rules as staff: contains a letter, never a phone number.
  const valid = createStaffSchema.parse(input);
  return createAccount(auth, db, { ...valid, role: "admin" });
}
