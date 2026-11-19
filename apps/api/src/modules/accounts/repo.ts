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

const credentialsFor = (userId: string) =>
  and(eq(account.userId, userId), eq(account.providerId, "credential"));

/** Replace the credential and revoke sessions atomically. */
export function resetCredentials(db: Db, userId: string, hash: string) {
  return db.transaction(async (tx) => {
    const [result] = await tx.update(account).set({ password: hash }).where(credentialsFor(userId));
    if (result.affectedRows === 0) return false;
    await tx.delete(session).where(eq(session.userId, userId));
    return true;
  });
}

/** Wait for any reset in progress before allowing the new session token to be returned. */
export function checkSessionCredential(db: Db, userId: string, sessionId: string, verifiedHash: string) {
  return db.transaction(async (tx) => {
    const [credential] = await tx.select({ hash: account.password })
      .from(account).where(credentialsFor(userId)).limit(1).for("share");
    if (credential?.hash === verifiedHash) return true;
    await tx.delete(session).where(and(eq(session.id, sessionId), eq(session.userId, userId)));
    return false;
  });
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
