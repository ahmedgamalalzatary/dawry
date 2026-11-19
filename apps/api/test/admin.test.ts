import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  ADMIN,
  client,
  makeApp,
  order,
  seedAdmin,
  seedRestaurant,
  seedStaff,
  signIn,
  type Client,
} from "./helpers/app";
import { closeTestDb, resetDb, testDb } from "./helpers/db";

const t = makeApp();
let admin: Client;

beforeEach(async () => {
  await resetDb();
  admin = await seedAdmin(t);
});
afterAll(closeTestDb);

const restaurantInput = {
  name: "Burger Y",
  slug: "burger-y",
  ownerName: "Mona",
  ownerPhone: "0111 222 3333",
  ownerPassword: "owner-pass-1",
};

describe("access", () => {
  it("rejects guests with 401 and non-admins with 403", async () => {
    expect((await client(t.app).get("/api/admin/restaurants")).status).toBe(401);

    const { owner } = await seedRestaurant(t, admin);
    expect((await owner.get("/api/admin/restaurants")).status).toBe(403);
  });

  it("rejects state changes without the web Origin (CSRF)", async () => {
    const res = await request(t.app).post("/api/admin/restaurants").send(restaurantInput);
    expect(res.status).toBe(403);
  });
});

describe("POST /api/admin/restaurants", () => {
  it("creates the restaurant and an owner who can sign in with their phone", async () => {
    const res = await admin.post("/api/admin/restaurants", restaurantInput);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: "Burger Y", slug: "burger-y", active: true });

    const owner = await signIn(t.app, "01112223333", "owner-pass-1");
    const me = await owner.get("/api/me");
    expect(me.body).toMatchObject({
      kind: "owner",
      restaurant: { slug: "burger-y", active: true },
    });
  });

  it("rejects a taken slug or phone with 409", async () => {
    await admin.post("/api/admin/restaurants", restaurantInput);

    const sameSlug = await admin.post("/api/admin/restaurants", {
      ...restaurantInput,
      ownerPhone: "0111 999 9999",
    });
    const samePhone = await admin.post("/api/admin/restaurants", {
      ...restaurantInput,
      slug: "other-slug",
    });

    expect(sameSlug.status).toBe(409);
    expect(samePhone.status).toBe(409);
  });

  it("validates input", async () => {
    const res = await admin.post("/api/admin/restaurants", { ...restaurantInput, slug: "Bad Slug" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_failed");
  });
});

describe("GET /api/admin/restaurants", () => {
  it("lists restaurants with owner, staff count and today's orders", async () => {
    const r = await seedRestaurant(t, admin);
    await seedStaff(t, r.owner);
    await r.owner.post("/api/restaurant/orders", order("1"));

    const res = await admin.get("/api/admin/restaurants");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      slug: r.slug,
      active: true,
      owner: { phone: r.ownerPhone },
      staffCount: 1,
      ordersToday: 1,
    });
  });
});

describe("suspending a restaurant", () => {
  it("blocks its owner and staff and hides its public pages until reactivated", async () => {
    const r = await seedRestaurant(t, admin);
    const { staff } = await seedStaff(t, r.owner);

    const off = await admin.patch(`/api/admin/restaurants/${r.id}`, { active: false });
    expect(off.status).toBe(200);

    expect((await r.owner.get("/api/restaurant/orders")).status).toBe(403);
    expect((await staff.get("/api/restaurant/orders")).status).toBe(403);
    expect((await client(t.app).get(`/api/public/r/${r.slug}`)).status).toBe(404);

    await admin.patch(`/api/admin/restaurants/${r.id}`, { active: true });
    expect((await r.owner.get("/api/restaurant/orders")).status).toBe(200);
    expect((await client(t.app).get(`/api/public/r/${r.slug}`)).status).toBe(200);
  });
});

describe("resetting a password", () => {
  it("replaces the password and signs the user out everywhere", async () => {
    const r = await seedRestaurant(t, admin);
    const list = await admin.get("/api/admin/restaurants");
    const ownerId = list.body[0].owner.id;

    const res = await admin.post(`/api/admin/users/${ownerId}/password`, {
      password: "brand-new-pass",
    });

    expect(res.status).toBe(204);
    expect((await r.owner.get("/api/me")).status).toBe(401);
    await expect(signIn(t.app, r.ownerPhone, "owner-pass-1")).rejects.toThrow();
    await expect(signIn(t.app, r.ownerPhone, "brand-new-pass")).resolves.toBeDefined();
  });

  it("returns 404 for an unknown user", async () => {
    const res = await admin.post("/api/admin/users/nope/password", { password: "brand-new-pass" });
    expect(res.status).toBe(404);
  });
});

describe("GET /api/admin/stats", () => {
  it("counts restaurants, orders and customers", async () => {
    const a = await seedRestaurant(t, admin, "A");
    const b = await seedRestaurant(t, admin, "B");
    await admin.patch(`/api/admin/restaurants/${b.id}`, { active: false });
    await a.owner.post("/api/restaurant/orders", order("1"));
    await a.owner.post("/api/restaurant/orders", order("2"));
    await client(t.app).post("/api/customer/sign-up", {
      name: "Sara",
      phone: "01200000000",
      password: "customer-pass",
    });

    const res = await admin.get("/api/admin/stats");

    expect(res.body).toEqual({
      restaurants: 2,
      activeRestaurants: 1,
      ordersToday: 2,
      ordersLast30Days: 2,
      customers: 1,
    });
  });
});

describe("the super-admin account", () => {
  it("reports kind admin from /api/me", async () => {
    const res = await admin.get("/api/me");
    expect(res.body).toMatchObject({ kind: "admin", username: ADMIN.username, restaurant: null });
  });
});

describe("createSuperAdmin (CLI)", () => {
  it("creates an admin account that can sign in", async () => {
    const { createSuperAdmin } = await import("../src/modules/admin/service");
    await createSuperAdmin(t.auth, testDb, {
      name: "Second Boss",
      username: "boss2",
      password: "another-pass-1",
    });

    const c = await signIn(t.app, "boss2", "another-pass-1");
    expect((await c.get("/api/me")).body).toMatchObject({ kind: "admin" });
  });

  it("refuses a taken username and invalid input", async () => {
    const { createSuperAdmin } = await import("../src/modules/admin/service");
    await expect(
      createSuperAdmin(t.auth, testDb, { name: "x", username: ADMIN.username, password: "pass-12345" }),
    ).rejects.toThrow(/already registered/);
    await expect(
      createSuperAdmin(t.auth, testDb, { name: "x", username: "boss3", password: "short" }),
    ).rejects.toThrow();
  });
});
