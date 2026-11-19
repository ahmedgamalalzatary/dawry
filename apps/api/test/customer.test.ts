import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  clock,
  client,
  makeApp,
  order,
  seedAdmin,
  seedRestaurant,
  signIn,
  type Client,
} from "./helpers/app";
import { closeTestDb, resetDb } from "./helpers/db";

const t = makeApp();
let admin: Client;

beforeEach(async () => {
  await resetDb();
  clock.set("2026-11-19T18:00:00Z");
  admin = await seedAdmin(t);
});
afterAll(closeTestDb);

const signUp = (c: Client, phone = "01200000000") =>
  c.post("/api/customer/sign-up", { name: "Sara", phone, password: "customer-pass" });

describe("POST /api/customer/sign-up", () => {
  it("creates a customer and signs them in", async () => {
    const c = client(t.app);
    const res = await signUp(c, "+20 120 000 0000");

    expect(res.status).toBe(201);
    const me = await c.get("/api/me");
    expect(me.body).toMatchObject({
      kind: "customer",
      name: "Sara",
      username: "201200000000",
      restaurant: null,
    });
    await expect(signIn(t.app, "201200000000", "customer-pass")).resolves.toBeDefined();
  });

  it("rejects a phone that already has an account with 409", async () => {
    await signUp(client(t.app));
    expect((await signUp(client(t.app))).status).toBe(409);
  });

  it("rejects a restaurant owner's phone with 409", async () => {
    const r = await seedRestaurant(t, admin);
    expect((await signUp(client(t.app), r.ownerPhone)).status).toBe(409);
  });
});

describe("GET /api/me", () => {
  it("is 401 for guests", async () => {
    expect((await client(t.app).get("/api/me")).status).toBe(401);
  });
});

describe("saved orders", () => {
  it("opens the exact saved order after its invoice number is reused", async () => {
    const a = await seedRestaurant(t, admin);
    const old = await a.owner.post("/api/restaurant/orders", order("42"));
    const c = client(t.app);
    await signUp(c);
    const lookup = `/api/public/r/${a.slug}/orders/42`;
    await c.get(lookup);
    await a.owner.patch(`/api/restaurant/orders/${old.body.id}/status`, { status: "cancelled" });
    clock.set("2026-11-20T18:00:00Z");
    await a.owner.post("/api/restaurant/orders", order("42"));
    await c.get(lookup);

    const saved = `/api/me/orders/${a.slug}`;
    const older = await c.get(`${saved}/2026-11-19/42`);
    expect(older.status).toBe(200);
    expect(older.body).toMatchObject({ businessDay: "2026-11-19", status: "cancelled" });
    expect((await c.get(`${saved}/2026-11-20/42`)).body).toMatchObject({ businessDay: "2026-11-20", status: "preparing" });
    expect((await client(t.app).get(`${saved}/2026-11-19/42`)).status).toBe(401);
    expect((await a.owner.get(`${saved}/2026-11-19/42`)).status).toBe(404);
  });

  it("lists active orders first and hides suspended restaurants", async () => {
    const a = await seedRestaurant(t, admin, "A");
    const b = await seedRestaurant(t, admin, "B");
    const done = await a.owner.post("/api/restaurant/orders", order("1"));
    await a.owner.post("/api/restaurant/orders", order("2"));
    await b.owner.post("/api/restaurant/orders", order("3"));
    await a.owner.patch(`/api/restaurant/orders/${done.body.id}/status`, {
      status: "cancelled",
    });

    const c = client(t.app);
    await signUp(c);
    await c.get(`/api/public/r/${a.slug}/orders/1`);
    await c.get(`/api/public/r/${a.slug}/orders/2`);
    await c.get(`/api/public/r/${b.slug}/orders/3`);
    await admin.patch(`/api/admin/restaurants/${b.id}`, { active: false });

    const res = await c.get("/api/me/orders");

    expect(res.body.map((o: { invoiceNumber: string; status: string }) => [o.invoiceNumber, o.status])).toEqual([
      ["2", "preparing"],
      ["1", "cancelled"],
    ]);
  });

  it("removes a saved order", async () => {
    const a = await seedRestaurant(t, admin);
    await a.owner.post("/api/restaurant/orders", order("1"));
    const c = client(t.app);
    await signUp(c);
    await c.get(`/api/public/r/${a.slug}/orders/1`);

    const res = await c.delete(`/api/me/orders/${a.slug}/2026-11-19/1`);

    expect(res.status).toBe(204);
    expect((await c.get("/api/me/orders")).body).toEqual([]);
  });
});

describe("favorite restaurants", () => {
  it("adds, lists and removes favorites", async () => {
    const a = await seedRestaurant(t, admin, "Fav");
    const c = client(t.app);
    await signUp(c);

    expect((await c.put(`/api/me/favorites/${a.slug}`)).status).toBe(204);
    expect((await c.put(`/api/me/favorites/${a.slug}`)).status).toBe(204); // idempotent
    expect((await c.get("/api/me/favorites")).body).toEqual([
      { slug: a.slug, name: "Fav", logoUrl: null, phone: null },
    ]);

    expect((await c.delete(`/api/me/favorites/${a.slug}`)).status).toBe(204);
    expect((await c.get("/api/me/favorites")).body).toEqual([]);
  });

  it("returns 404 for unknown restaurants", async () => {
    const c = client(t.app);
    await signUp(c);
    expect((await c.put("/api/me/favorites/nope")).status).toBe(404);
  });
});
