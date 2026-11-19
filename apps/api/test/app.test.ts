import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { makeApp, WEB_ORIGIN } from "./helpers/app";
import { closeTestDb } from "./helpers/db";

const { app } = makeApp();
afterAll(closeTestDb);

describe("GET /health", () => {
  it("responds 200 with status ok", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("sends security headers", async () => {
    const res = await request(app).get("/health");

    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["content-security-policy"]).toContain("default-src 'none'");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });
});

describe("errors", () => {
  it("answers unknown routes with a JSON 404", async () => {
    const res = await request(app).get("/does-not-exist");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: "not_found", message: "Not found" } });
  });

  it("rejects malformed JSON with 400", async () => {
    const res = await request(app)
      .post("/api/customer/sign-up")
      .set("Origin", WEB_ORIGIN)
      .set("Content-Type", "application/json")
      .send("{not json");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_failed");
  });

  it("rejects bodies over 100 kB", async () => {
    const res = await request(app)
      .post("/api/customer/sign-up")
      .set("Origin", WEB_ORIGIN)
      .send({ name: "x".repeat(110_000), phone: "01000000000", password: "12345678" });

    expect(res.status).toBe(400);
  });
});
