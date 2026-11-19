import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import type { Db } from "../../db/client";
import { member, user } from "../../db/schema";

export function listStaff(db: Db, restaurantId: string) {
  return db
    .select({ id: user.id, name: user.name, username: user.username, createdAt: member.createdAt })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .where(and(eq(member.organizationId, restaurantId), eq(member.role, "member")))
    .orderBy(asc(member.createdAt));
}

export async function addStaffMember(db: Db, restaurantId: string, userId: string) {
  await db
    .insert(member)
    .values({ id: randomUUID(), organizationId: restaurantId, userId, role: "member" });
}

export async function isStaffOf(db: Db, restaurantId: string, userId: string) {
  const [row] = await db
    .select({ id: member.id })
    .from(member)
    .where(
      and(
        eq(member.organizationId, restaurantId),
        eq(member.userId, userId),
        eq(member.role, "member"),
      ),
    )
    .limit(1);
  return Boolean(row);
}
