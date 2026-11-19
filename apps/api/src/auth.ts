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
  /** Secure cookies (`__Secure-` prefix, HTTPS only). */
  production: boolean;
  rateLimit: boolean;
}

/**
 * Accounts (see docs/project-contract.md):
 * - Everyone signs in with username + password. Owners and customers use their
 *   phone number (digits) as username; staff usernames contain a letter.
 * - No Better Auth sign-up: the super-admin creates owners, owners create staff,
 *   customers sign up through POST /api/customer/sign-up.
 * - admin plugin = super-admin role and server-side user creation.
 * - organization plugin = restaurant (organization) with owner/member roles.
 */
export function createAuth(db: Db, options: AuthOptions) {
  return betterAuth({
    secret: options.secret,
    baseURL: options.baseURL,
    trustedOrigins: options.trustedOrigins,
    database: drizzleAdapter(db, { provider: "mysql", schema }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
    },
    // Only username sign-in is offered to clients.
    disabledPaths: ["/sign-in/email", "/sign-up/email"],
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days
      updateAge: 60 * 60 * 24, // refresh daily
    },
    advanced: {
      useSecureCookies: options.production,
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax", path: "/" },
    },
    rateLimit: {
      enabled: options.rateLimit,
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/username": { window: 60, max: 10 },
      },
    },
    plugins: [
      username({ minUsernameLength: 3, maxUsernameLength: 30 }),
      admin(),
      organization({ allowUserToCreateOrganization: false }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
