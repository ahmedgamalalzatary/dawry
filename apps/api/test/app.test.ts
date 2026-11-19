import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";

describe("GET /health", () => {
  it("responds 200 with status ok", async () => {
    const app = createApp({ webOrigin: "http://localhost:3000" });

    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});

describe("unknown routes", () => {
  it("respond 404 with a JSON error", async () => {
    const app = createApp({ webOrigin: "http://localhost:3000" });

    const res = await request(app).get("/does-not-exist");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Not found" });
  });
});
