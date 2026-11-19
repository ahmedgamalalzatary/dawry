import type { createStaffSchema, StaffMember } from "@dawry/shared";
import type { z } from "zod";
import type { Auth } from "../../auth";
import type { Db } from "../../db/client";
import { notFound } from "../../http/errors";
import { createAccount, deleteUser, setPassword } from "../accounts/service";
import * as repo from "./repo";

export async function listStaff(db: Db, restaurantId: string): Promise<StaffMember[]> {
  const rows = await repo.listStaff(db, restaurantId);
  return rows.map((r) => ({ ...r, username: r.username ?? "", createdAt: r.createdAt.toISOString() }));
}

export async function createStaff(
  auth: Auth,
  db: Db,
  restaurantId: string,
  input: z.output<typeof createStaffSchema>,
) {
  const userId = await createAccount(auth, db, input);
  await repo.addStaffMember(db, restaurantId, userId);
  return { id: userId, name: input.name, username: input.username };
}

async function requireStaffOf(db: Db, restaurantId: string, userId: string) {
  if (!(await repo.isStaffOf(db, restaurantId, userId))) throw notFound("Staff member not found");
}

/** Deleting the user also ends their sessions (cascade). */
export async function removeStaff(db: Db, restaurantId: string, userId: string) {
  await requireStaffOf(db, restaurantId, userId);
  await deleteUser(db, userId);
}

export async function resetStaffPassword(
  auth: Auth,
  db: Db,
  restaurantId: string,
  userId: string,
  password: string,
) {
  await requireStaffOf(db, restaurantId, userId);
  await setPassword(auth, db, userId, password);
}
