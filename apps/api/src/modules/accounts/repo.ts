import { and, eq } from "drizzle-orm";
import type { Db } from "../../db/client";
import { account, member, organization, restaurantSettings, session, user } from "../../db/schema";

export async function usernameExists(db: Db, username: string) {
  const [row] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.username, username))
    .limit(1);
  return Boolean(row);
}

/** Returns false when the user has no password account. */
export async function updatePasswordHash(db: Db, userId: string, hash: string) {
  const [result] = await db
    .update(account)
    .set({ password: hash })
    .where(and(eq(account.userId, userId), eq(account.providerId, "credential")));
  return result.affectedRows > 0;
}

export async function deleteSessions(db: Db, userId: string) {
  await db.delete(session).where(eq(session.userId, userId));
}

export async function deleteUser(db: Db, userId: string) {
  await db.delete(user).where(eq(user.id, userId));
}

/** The restaurant a user belongs to (a user belongs to at most one). */
export async function findMembership(db: Db, userId: string) {
  const [row] = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      role: member.role,
      active: restaurantSettings.active,
    })
    .from(member)
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .innerJoin(restaurantSettings, eq(restaurantSettings.organizationId, organization.id))
    .where(eq(member.userId, userId))
    .limit(1);
  if (!row) return null;
  return { ...row, role: row.role === "owner" ? ("owner" as const) : ("member" as const) };
}
