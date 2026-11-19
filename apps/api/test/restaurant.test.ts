import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createStaff } from "../src/modules/staff/service";
import { currentDays } from "../src/modules/orders/helpers";
import * as orderRepo from "../src/modules/orders/repo";
import { updateStatus } from "../src/modules/orders/service";
import {
  clock,
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
let a: Awaited<ReturnType<typeof seedRestaurant>>;
let b: Awaited<ReturnType<typeof seedRestaurant>>;

beforeEach(async () => {
  await resetDb();
  clock.set("2026-11-19T18:00:00Z"); // 20:00 Cairo
  admin = await seedAdmin(t);
  a = await seedRestaurant(t, admin, "Alpha");
  b = await seedRestaurant(t, admin, "Beta");
});
afterAll(closeTestDb);

describe("staff management (owner only)", () => {
  it("allows retrying a username after membership creation fails", async () => {
    const input = { name: "Cashier", username: "retrycashier", password: "staff-pass-1" };
    await expect(createStaff(t.auth, testDb, "missing-restaurant", input)).rejects.toThrow();
    expect((await a.owner.post("/api/restaurant/staff", input)).status).toBe(201);
  });

  it("creates staff who can sign in and work on orders", async () => {
    const { staff } = await seedStaff(t, a.owner, "cashier1");

    expect((await staff.get("/api/me")).body).toMatchObject({
      kind: "staff",
      restaurant: { slug: a.slug },
    });
    expect((await staff.post("/api/restaurant/orders", order("1"))).status).toBe(201);
  });

  it("lists staff without the owner", async () => {
    await seedStaff(t, a.owner, "cashier1");
    const res = await a.owner.get("/api/restaurant/staff");
    expect(res.body.map((s: { username: string }) => s.username)).toEqual(["cashier1"]);
  });

  it("rejects a taken username with 409", async () => {
    await seedStaff(t, a.owner, "cashier1");
    const res = await b.owner.post("/api/restaurant/staff", {
      name: "x",
      username: "cashier1",
      password: "staff-pass-1",
    });
    expect(res.status).toBe(409);
  });

  it("does not let staff manage staff, menu, fields, settings or reports", async () => {
    const { staff } = await seedStaff(t, a.owner);
    const forbidden = [
      await staff.get("/api/restaurant/staff"),
      await staff.post("/api/restaurant/staff", { name: "x", username: "abc", password: "12345678" }),
      await staff.post("/api/restaurant/menu", { name: "Pizza" }),
      await staff.post("/api/restaurant/fields", { label: "Table" }),
      await staff.put("/api/restaurant/settings", { name: "Hacked" }),
      await staff.get("/api/restaurant/reports"),
    ];
    expect(forbidden.map((r) => r.status)).toEqual([403, 403, 403, 403, 403, 403]);
  });

  it("deletes staff and ends their session", async () => {
    const { id, staff } = await seedStaff(t, a.owner);

    expect((await a.owner.delete(`/api/restaurant/staff/${id}`)).status).toBe(204);
    expect((await staff.get("/api/me")).status).toBe(401);
  });

  it("resets a staff password", async () => {
    const { id, username } = await seedStaff(t, a.owner);
    const res = await a.owner.post(`/api/restaurant/staff/${id}/password`, {
      password: "new-staff-pass",
    });
    expect(res.status).toBe(204);
    await expect(signIn(t.app, username, "new-staff-pass")).resolves.toBeDefined();
  });

  it("cannot touch another restaurant's staff", async () => {
    const { id } = await seedStaff(t, b.owner);
    expect((await a.owner.delete(`/api/restaurant/staff/${id}`)).status).toBe(404);
    expect(
      (await a.owner.post(`/api/restaurant/staff/${id}/password`, { password: "xxxxxxxx1" }))
        .status,
    ).toBe(404);
  });
});

describe("menu and custom fields", () => {
  it("preserves omitted boolean flags on partial updates", async () => {
    const menu = await a.owner.post("/api/restaurant/menu", { name: "Pizza", active: false });
    const field = await a.owner.post("/api/restaurant/fields", { label: "Table", required: true, public: true });

    expect((await a.owner.patch(`/api/restaurant/menu/${menu.body.id}`, { name: "Pepperoni" })).body)
      .toMatchObject({ name: "Pepperoni", active: false });
    expect((await a.owner.patch(`/api/restaurant/fields/${field.body.id}`, { active: false })).body)
      .toMatchObject({ required: true, public: true, active: false });
  });

  it("lets the owner manage the menu; staff can read it", async () => {
    const created = await a.owner.post("/api/restaurant/menu", { name: "Margherita" });
    expect(created.status).toBe(201);

    const renamed = await a.owner.patch(`/api/restaurant/menu/${created.body.id}`, {
      name: "Pepperoni",
      active: false,
    });
    expect(renamed.body).toMatchObject({ name: "Pepperoni", active: false });

    const { staff } = await seedStaff(t, a.owner);
    const list = await staff.get("/api/restaurant/menu");
    expect(list.body).toEqual([{ id: created.body.id, name: "Pepperoni", active: false }]);
  });

  it("lets the owner manage custom fields", async () => {
    const created = await a.owner.post("/api/restaurant/fields", {
      label: "Table number",
      public: true,
      required: true,
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ label: "Table number", public: true, required: true });

    const list = await a.owner.get("/api/restaurant/fields");
    expect(list.body).toHaveLength(1);
  });

  it("keeps menus and fields separate per restaurant", async () => {
    const item = await a.owner.post("/api/restaurant/menu", { name: "Secret" });
    const field = await a.owner.post("/api/restaurant/fields", { label: "Secret" });

    expect((await b.owner.get("/api/restaurant/menu")).body).toEqual([]);
    expect((await b.owner.get("/api/restaurant/fields")).body).toEqual([]);
    expect((await b.owner.patch(`/api/restaurant/menu/${item.body.id}`, { name: "x" })).status).toBe(
      404,
    );
    expect(
      (await b.owner.patch(`/api/restaurant/fields/${field.body.id}`, { label: "x" })).status,
    ).toBe(404);
  });
});

describe("settings", () => {
  it("updates name, phone and logo", async () => {
    const res = await a.owner.put("/api/restaurant/settings", {
      name: "Alpha Pizza",
      phone: "02 1234 5678",
      logoUrl: "https://cdn.example.com/logo.png",
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      name: "Alpha Pizza",
      slug: a.slug,
      phone: "0212345678",
      logoUrl: "https://cdn.example.com/logo.png",
    });
  });

  it("rejects non-http logo URLs", async () => {
    const res = await a.owner.put("/api/restaurant/settings", {
      name: "Alpha",
      logoUrl: "javascript:alert(1)",
    });
    expect(res.status).toBe(400);
  });
});

describe("orders", () => {
  it("uses the previous local calendar day after a spring-forward transition", () => {
    expect(currentDays({ timeZone: "America/New_York", now: () => new Date("2026-03-09T04:30:00Z") }))
      .toEqual({ today: "2026-03-09", yesterday: "2026-03-08" });
  });

  it("rejects a status update if the order changed after it was read", async () => {
    const { body: created } = await a.owner.post("/api/restaurant/orders", order("cas"));
    const findOrder = orderRepo.findOrder;
    let release!: () => void;
    let markRead!: () => void;
    const writeAllowed = new Promise<void>((resolve) => { release = resolve; });
    const read = new Promise<void>((resolve) => { markRead = resolve; });
    const spy = vi.spyOn(orderRepo, "findOrder").mockImplementationOnce(async (...args) => {
      const row = await findOrder(...args);
      markRead();
      await writeAllowed;
      return row;
    });
    const orderClock = { timeZone: "Africa/Cairo", now: () => clock.now };
    const pending = updateStatus(testDb, a.id, created.id, "out_for_delivery", orderClock);
    await read;
    spy.mockRestore();
    await updateStatus(testDb, a.id, created.id, "cancelled", orderClock).finally(release);
    await expect(pending).rejects.toMatchObject({ code: "conflict" });
    expect((await a.owner.get("/api/restaurant/orders")).body[0].status).toBe("cancelled");
  });

  it("creates an order with items, fields and an absolute ETA", async () => {
    const field = await a.owner.post("/api/restaurant/fields", { label: "Table", public: true });

    const res = await a.owner.post(
      "/api/restaurant/orders",
      order("42", 35, {
        customerName: "Ali",
        fields: [{ fieldId: field.body.id, value: "7" }],
      }),
    );

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      invoiceNumber: "42",
      businessDay: "2026-11-19",
      status: "preparing",
      etaMode: "countdown",
      etaAt: "2026-11-19T18:35:00.000Z",
      late: false,
      ordersAhead: 0,
      customerName: "Ali",
      items: [{ name: "Margherita", quantity: 1, menuItemId: null }],
      fields: [{ fieldId: field.body.id, label: "Table", value: "7", public: true }],
    });
  });

  it("rejects a duplicate invoice number on the same business day only", async () => {
    await a.owner.post("/api/restaurant/orders", order("42"));
    expect((await a.owner.post("/api/restaurant/orders", order("42"))).status).toBe(409);

    // Another restaurant may use the same number.
    expect((await b.owner.post("/api/restaurant/orders", order("42"))).status).toBe(201);

    clock.set("2026-11-20T08:00:00Z"); // next day in Cairo
    expect((await a.owner.post("/api/restaurant/orders", order("42"))).status).toBe(201);
  });

  it("requires required custom fields and refuses fields or menu items of other restaurants", async () => {
    await a.owner.post("/api/restaurant/fields", { label: "Table", required: true });
    const foreignField = await b.owner.post("/api/restaurant/fields", { label: "X" });
    const foreignItem = await b.owner.post("/api/restaurant/menu", { name: "X" });

    const missing = await a.owner.post("/api/restaurant/orders", order("1"));
    const otherField = await a.owner.post(
      "/api/restaurant/orders",
      order("2", 30, { fields: [{ fieldId: foreignField.body.id, value: "x" }] }),
    );
    const otherItem = await a.owner.post("/api/restaurant/orders", {
      ...order("3"),
      items: [{ menuItemId: foreignItem.body.id, name: "X", quantity: 1 }],
    });

    expect([missing.status, otherField.status, otherItem.status]).toEqual([400, 400, 400]);
  });

  it("lists today's orders with the queue position by expected finish time", async () => {
    await a.owner.post("/api/restaurant/orders", order("1", 40)); // Ali, long order
    clock.set("2026-11-19T18:05:00Z");
    await a.owner.post("/api/restaurant/orders", order("2", 10)); // Sara, short order

    const res = await a.owner.get("/api/restaurant/orders");

    const byInvoice = Object.fromEntries(
      res.body.map((o: { invoiceNumber: string; ordersAhead: number }) => [o.invoiceNumber, o.ordersAhead]),
    );
    expect(byInvoice).toEqual({ "1": 1, "2": 0 });
  });

  it("moves through statuses and rejects invalid transitions", async () => {
    const created = await a.owner.post("/api/restaurant/orders", order("1"));
    const url = `/api/restaurant/orders/${created.body.id}/status`;

    expect((await a.owner.patch(url, { status: "delivered" })).status).toBe(409);

    const out = await a.owner.patch(url, { status: "out_for_delivery" });
    expect(out.body).toMatchObject({ status: "out_for_delivery", ordersAhead: 0 });
    expect(out.body.outAt).toBe("2026-11-19T18:00:00.000Z");

    const done = await a.owner.patch(url, { status: "delivered" });
    expect(done.body.status).toBe("delivered");
    expect((await a.owner.patch(url, { status: "cancelled" })).status).toBe(409);
  });

  it("updates the ETA while preparing and flags late orders", async () => {
    const created = await a.owner.post("/api/restaurant/orders", order("1", 10));
    clock.set("2026-11-19T18:11:00Z");

    const late = await a.owner.get(`/api/restaurant/orders/${created.body.id}`);
    expect(late.body.late).toBe(true);

    const updated = await a.owner.patch(`/api/restaurant/orders/${created.body.id}/eta`, {
      eta: { mode: "clock", time: "20:30" },
    });
    expect(updated.body).toMatchObject({
      etaMode: "clock",
      etaAt: "2026-11-19T18:30:00.000Z",
      late: false,
    });
  });

  it("hides one restaurant's orders from another", async () => {
    const created = await a.owner.post("/api/restaurant/orders", order("1"));
    const id = created.body.id;

    expect((await b.owner.get("/api/restaurant/orders")).body).toEqual([]);
    expect((await b.owner.get(`/api/restaurant/orders/${id}`)).status).toBe(404);
    expect(
      (await b.owner.patch(`/api/restaurant/orders/${id}/status`, { status: "cancelled" })).status,
    ).toBe(404);
    expect(
      (await b.owner.patch(`/api/restaurant/orders/${id}/eta`, { eta: { mode: "minutes", minutes: 5 } }))
        .status,
    ).toBe(404);
  });

  it("publishes a change event for the restaurant", async () => {
    const seen: string[] = [];
    const stop = t.bus.subscribe((id) => seen.push(id));
    await a.owner.post("/api/restaurant/orders", order("1"));
    stop();
    expect(seen).toEqual([a.id]);
  });
});

describe("reports", () => {
  it("summarises the last 30 days", async () => {
    const one = await a.owner.post("/api/restaurant/orders", order("1", 20));
    await a.owner.post("/api/restaurant/orders", order("2", 20));
    clock.set("2026-11-19T18:25:00Z");
    await a.owner.patch(`/api/restaurant/orders/${one.body.id}/status`, { status: "out_for_delivery" });

    const res = await a.owner.get("/api/restaurant/reports");

    expect(res.body.days).toEqual([
      {
        day: "2026-11-19",
        orders: 2,
        delivered: 0,
        cancelled: 0,
        avgPrepMinutes: 25,
        avgDelayMinutes: 5,
      },
    ]);
  });
});
