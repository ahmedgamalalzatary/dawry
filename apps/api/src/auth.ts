import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import { organization } from "better-auth/plugins/organization";
import { username } from "better-auth/plugins/username";
import type { Db } from "./db/client";
import * as schema from "./db/schema";

export interface AuthOptions {
  secret: string;
  baseURL: string;
  trustedOrigins: string[];
}

/**
 * Accounts:
 * - Everyone signs in with username + password. A restaurant owner's username is
 *   their phone number; staff get a plain username.
 * - No self-signup: the super-admin creates restaurants (organizations) and owners,
 *   owners create their staff.
 * - admin plugin = super-admin (suspend via ban, set passwords, stats).
 * - organization plugin = restaurant workspace with owner / member (staff) roles.
 */
export function createAuth(db: Db, { secret, baseURL, trustedOrigins }: AuthOptions) {
  return betterAuth({
    secret,
    baseURL,
    trustedOrigins,
    database: drizzleAdapter(db, { provider: "mysql", schema }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 8,
    },
    plugins: [username(), admin(), organization({ allowUserToCreateOrganization: false })],
  });
}

export type Auth = ReturnType<typeof createAuth>;
