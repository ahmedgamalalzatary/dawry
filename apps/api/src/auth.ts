import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { admin } from "better-auth/plugins/admin";
import { organization } from "better-auth/plugins/organization";
import { username } from "better-auth/plugins/username";
import type { Db } from "./db/client";
import * as schema from "./db/schema";
import { checkSessionCredential } from "./modules/accounts/repo";

export const AUTH_CLIENT_IP_HEADER = "x-dawry-client-ip";

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
      ipAddress: { ipAddressHeaders: [AUTH_CLIENT_IP_HEADER] },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/sign-in/username") return;

        // Keep the hash verified by this request. Recheck after the session insert,
        // before Better Auth returns a token, so a concurrent reset cannot be bypassed.
        const { password, internalAdapter } = ctx.context;
        let verifiedHash: string | undefined;
        return {
          context: {
            context: {
              password: {
                ...password,
                verify: async (input: Parameters<typeof password.verify>[0]) => {
                  const valid = await password.verify(input);
                  if (valid) verifiedHash = input.hash;
                  return valid;
                },
              },
              internalAdapter: {
                ...internalAdapter,
                createSession: async (...args: Parameters<typeof internalAdapter.createSession>) => {
                  const hash = verifiedHash;
                  if (!hash) throw new APIError("UNAUTHORIZED", { message: "Invalid username or password" });
                  const session = await internalAdapter.createSession(...args);
                  if (session && !(await checkSessionCredential(db, args[0], session.id, hash))) {
                    throw new APIError("UNAUTHORIZED", { message: "Invalid username or password" });
                  }
                  return session;
                },
              },
            },
          },
        };
      }),
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
