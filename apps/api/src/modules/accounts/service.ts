import type { Auth } from "../../auth";
import type { Db } from "../../db/client";
import { conflict } from "../../http/errors";
import * as repo from "./repo";

export interface NewAccount {
  name: string;
  /** Digits-only phone for owners/customers, or a staff username. */
  username: string;
  password: string;
  role?: "admin" | "user";
}

/** Create a username/password account. 409 when the username (phone) is taken. */
export async function createAccount(auth: Auth, db: Db, input: NewAccount): Promise<string> {
  if (await repo.usernameExists(db, input.username)) {
    throw conflict("This phone number or username is already registered");
  }
  const { user } = await auth.api.createUser({
    body: {
      name: input.name,
      // Better Auth requires an email; it is internal and never shown or used.
      email: `${input.username}@users.dawry.local`,
      password: input.password,
      role: input.role ?? "user",
      data: { username: input.username, displayUsername: input.username },
    },
  });
  return user.id;
}

/** Replace a user's password and sign them out everywhere. False if no such user. */
export async function setPassword(auth: Auth, db: Db, userId: string, password: string) {
  const ctx = await auth.$context;
  return repo.resetCredentials(db, userId, await ctx.password.hash(password));
}

export const deleteUser = repo.deleteUser;
export const findMembership = repo.findMembership;
