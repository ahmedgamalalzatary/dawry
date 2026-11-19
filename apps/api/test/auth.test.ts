import request from "supertest";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { session } from "../src/db/schema";
import * as accounts from "../src/modules/accounts/repo";
import { makeApp, WEB_ORIGIN } from "./helpers/app";
import { closeTestDb, resetDb, testDb } from "./helpers/db";

const { app, auth } = makeApp();

async function createAccount(username: string, password: string) {
  await auth.api.createUser({
    body: {
      name: username,
      email: `${username}@users.dawry.local`,
      password,
      data: { username },
    },
  });
}

const signIn = (username: string, password: string, origin = WEB_ORIGIN) =>
  request(app).post("/api/auth/sign-in/username").set("Origin", origin).send({ username, password });

beforeEach(resetDb);
afterAll(closeTestDb);

describe("POST /api/auth/sign-in/username", () => {
  it("uses the client address resolved by Express across trusted proxy hops", async () => {
    await createAccount("cashier1", "correct-horse-1");
    const res = await signIn("cashier1", "correct-horse-1")
      .set("X-Forwarded-For", "192.0.2.10, 172.18.0.5");
    expect(res.status).toBe(200);
    expect(await testDb.select({ ip: session.ipAddress }).from(session)).toEqual([{ ip: "192.0.2.10" }]);
  });

  it("signs a staff member in with username + password", async () => {
    await createAccount("cashier1", "correct-horse-1");

    const res = await signIn("cashier1", "correct-horse-1");

    expect(res.status).toBe(200);
  });

  it("withholds the session cookie when the credential cannot be confirmed", async () => {
    await createAccount("cashier1", "correct-horse-1");
    const check = vi.spyOn(accounts, "checkSessionCredential").mockResolvedValueOnce(false);
    try {
      const res = await signIn("cashier1", "correct-horse-1");
      expect(res.status).toBe(401);
      expect(res.headers["set-cookie"]).toBeUndefined();
    } finally {
      check.mockRestore();
    }
  });

  it("sets an HttpOnly, SameSite=Lax session cookie", async () => {
    await createAccount("cashier1", "correct-horse-1");

    const res = await signIn("cashier1", "correct-horse-1");
    const cookie = String(res.headers["set-cookie"]);

    expect(cookie).toContain("better-auth.session_token=");
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  it("signs an owner in with their phone number as the username", async () => {
    await createAccount("01012345678", "owner-pass-123");

    expect((await signIn("01012345678", "owner-pass-123")).status).toBe(200);
  });

  it("rejects a wrong password with 401", async () => {
    await createAccount("cashier2", "correct-horse-1");

    expect((await signIn("cashier2", "wrong-password")).status).toBe(401);
  });

  it("rejects sign-in from an untrusted origin", async () => {
    await createAccount("cashier3", "correct-horse-1");

    const res = await signIn("cashier3", "correct-horse-1", "https://evil.example");

    expect(res.status).toBe(403);
  });
});

describe("POST /api/auth/sign-up/email", () => {
  it("is disabled: accounts are only created by the platform or the customer sign-up route", async () => {
    const res = await request(app)
      .post("/api/auth/sign-up/email")
      .set("Origin", WEB_ORIGIN)
      .send({ name: "x", email: "x@example.com", password: "whatever-123" });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});
