import type { createStaffSchema, StaffMember, StaffMemberDetail } from "@dawry/shared";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import type { Auth } from "../../auth";
import type { Db } from "../../db/client";
import { notFound } from "../../http/errors";
import { createAccount, deleteUser, setPassword } from "../accounts/service";
import { orders } from "../../db/schema";
import type { Clock } from "../orders/helpers";
import * as orderRepo from "../orders/repo";
import { summaries } from "../orders/service";
import { personStats } from "../reports/helpers";
import * as reportRepo from "../reports/repo";
import { rangeOf } from "../reports/service";
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
  try {
    await repo.addStaffMember(db, restaurantId, userId);
  } catch (error) {
    await deleteUser(db, userId);
    throw error;
  }
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

/** One member: who they are, their last 30 days, and the orders they entered last. */
export async function staffDetail(
  db: Db,
  restaurantId: string,
  userId: string,
  clock: Clock,
): Promise<StaffMemberDetail> {
  const row = await repo.findMember(db, restaurantId, userId);
  if (!row) throw notFound("Staff member not found");
  const range = rangeOf(clock, 30);
  const [rows, recent] = await Promise.all([
    reportRepo.ordersSince(db, restaurantId, range.from, eq(orders.createdById, userId)),
    orderRepo.recentByCreator(db, restaurantId, userId, 25),
  ]);
  return {
    member: {
      id: row.id,
      name: row.name,
      username: row.username ?? "",
      createdAt: row.createdAt.toISOString(),
      role: row.role === "owner" ? "owner" : "member",
    },
    stats: personStats(rows, clock.now()),
    recent: await summaries(db, recent, clock),
  };
}
