import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { createAuth } from "../src/auth";
import { testDb, resetDb, closeTestDb } from "./helpers/db";

const WEB_ORIGIN = "http://localhost:3000";
const auth = createAuth(testDb, {
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
  trustedOrigins: [WEB_ORIGIN],
});
const app = createApp({ webOrigin: WEB_ORIGIN, auth });

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

beforeEach(resetDb);
afterAll(closeTestDb);

describe("POST /api/auth/sign-in/username", () => {
  it("signs a staff member in with username + password and sets a session cookie", async () => {
    await createAccount("cashier1", "correct-horse-1");

    const res = await request(app)
      .post("/api/auth/sign-in/username")
      .set("Origin", WEB_ORIGIN)
      .send({ username: "cashier1", password: "correct-horse-1" });

    expect(res.status).toBe(200);
    expect(String(res.headers["set-cookie"])).toContain("better-auth.session_token");
  });

  it("signs an owner in with their phone number as the username", async () => {
    await createAccount("01012345678", "owner-pass-123");

    const res = await request(app)
      .post("/api/auth/sign-in/username")
      .set("Origin", WEB_ORIGIN)
      .send({ username: "01012345678", password: "owner-pass-123" });

    expect(res.status).toBe(200);
  });

  it("rejects a wrong password with 401", async () => {
    await createAccount("cashier2", "correct-horse-1");

    const res = await request(app)
      .post("/api/auth/sign-in/username")
      .set("Origin", WEB_ORIGIN)
      .send({ username: "cashier2", password: "wrong-password" });

    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/sign-up/email", () => {
  it("is disabled: accounts are only created by the platform", async () => {
    const res = await request(app)
      .post("/api/auth/sign-up/email")
      .set("Origin", WEB_ORIGIN)
      .send({ name: "x", email: "x@example.com", password: "whatever-123" });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});
