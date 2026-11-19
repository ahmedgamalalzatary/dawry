import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  clock,
  client,
  makeApp,
  order,
  seedAdmin,
  seedRestaurant,
  type Client,
} from "./helpers/app";
import { closeTestDb, resetDb } from "./helpers/db";

const t = makeApp();
let admin: Client;
let r: Awaited<ReturnType<typeof seedRestaurant>>;

beforeEach(async () => {
  await resetDb();
  clock.set("2026-11-19T18:00:00Z");
  admin = await seedAdmin(t);
  r = await seedRestaurant(t, admin);
  await r.owner.put("/api/restaurant/settings", {
    name: "Pizza X",
    phone: "0212345678",
    logoUrl: "https://cdn.example.com/x.png",
  });
});
afterAll(closeTestDb);

const guest = () => client(t.app);

describe("GET /api/public/r/:slug", () => {
  it("returns the public restaurant profile", async () => {
    const res = await guest().get(`/api/public/r/${r.slug}`);
    expect(res.body).toEqual({
      slug: r.slug,
      name: "Pizza X",
      logoUrl: "https://cdn.example.com/x.png",
      phone: "0212345678",
    });
  });

  it("returns 404 for unknown restaurants", async () => {
    expect((await guest().get("/api/public/r/nope")).status).toBe(404);
  });
});

describe("GET /api/public/r/:slug/orders/:invoice", () => {
  it("shows the order with its queue position and only public data", async () => {
    const pub = await r.owner.post("/api/restaurant/fields", { label: "Table", public: true });
    const priv = await r.owner.post("/api/restaurant/fields", { label: "VIP note" });
    await r.owner.post("/api/restaurant/orders", order("1", 10));
    await r.owner.post(
      "/api/restaurant/orders",
      order("2", 30, {
        customerName: "Ali",
        customerPhone: "01000000000",
        address: "Street 1",
        notes: "ring twice",
        fields: [
          { fieldId: pub.body.id, value: "7" },
          { fieldId: priv.body.id, value: "secret" },
        ],
      }),
    );

    const res = await guest().get(`/api/public/r/${r.slug}/orders/2`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      restaurant: {
        slug: r.slug,
        name: "Pizza X",
        logoUrl: "https://cdn.example.com/x.png",
        phone: "0212345678",
      },
      invoiceNumber: "2",
      businessDay: "2026-11-19",
      status: "preparing",
      etaMode: "countdown",
      etaAt: "2026-11-19T18:30:00.000Z",
      late: false,
      ordersAhead: 1,
      items: [{ name: "Margherita", quantity: 1 }],
      fields: [{ label: "Table", value: "7" }],
      createdAt: "2026-11-19T18:00:00.000Z",
      updatedAt: expect.any(String),
    });
    expect(JSON.stringify(res.body)).not.toMatch(/Ali|01000000000|Street 1|ring twice|secret/);
  });

  it("returns 404 for an unknown invoice", async () => {
    expect((await guest().get(`/api/public/r/${r.slug}/orders/999`)).status).toBe(404);
  });

  it("still finds yesterday's order while it is active, but not once it is done", async () => {
    const created = await r.owner.post("/api/restaurant/orders", order("5"));
    clock.set("2026-11-19T22:10:00Z"); // 00:10 the next day in Cairo

    expect((await guest().get(`/api/public/r/${r.slug}/orders/5`)).status).toBe(200);

    await r.owner.patch(`/api/restaurant/orders/${created.body.id}/status`, {
      status: "cancelled",
    });
    expect((await guest().get(`/api/public/r/${r.slug}/orders/5`)).status).toBe(404);
  });

  it("returns 404 when the restaurant is suspended", async () => {
    await r.owner.post("/api/restaurant/orders", order("1"));
    await admin.patch(`/api/admin/restaurants/${r.id}`, { active: false });
    expect((await guest().get(`/api/public/r/${r.slug}/orders/1`)).status).toBe(404);
  });

  it("saves the order for a logged-in viewer", async () => {
    await r.owner.post("/api/restaurant/orders", order("1"));
    const customer = guest();
    await customer.post("/api/customer/sign-up", {
      name: "Sara",
      phone: "01200000000",
      password: "customer-pass",
    });

    await customer.get(`/api/public/r/${r.slug}/orders/1`);
    await customer.get(`/api/public/r/${r.slug}/orders/1`); // idempotent

    const saved = await customer.get("/api/me/orders");
    expect(saved.body).toHaveLength(1);
    expect(saved.body[0]).toMatchObject({ slug: r.slug, invoiceNumber: "1", status: "preparing" });
  });
});
