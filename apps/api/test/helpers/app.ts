import type { Express } from "express";
import request from "supertest";
import { createApp } from "../../src/app";
import { createAuth, type Auth } from "../../src/auth";
import { EventBus } from "../../src/http/events";
import { testDb } from "./db";

export const WEB_ORIGIN = "http://localhost:3000";
export const TIME_ZONE = "Africa/Cairo";

/** Mutable clock for business-day and lateness tests. */
export const clock = {
  now: new Date("2026-11-19T18:00:00Z"), // 20:00 in Cairo
  set(iso: string) {
    this.now = new Date(iso);
  },
};

export interface TestApp {
  app: Express;
  auth: Auth;
  bus: EventBus;
}

export function makeApp(): TestApp {
  const auth = createAuth(testDb, {
    secret: process.env.BETTER_AUTH_SECRET!,
    baseURL: process.env.BETTER_AUTH_URL!,
    trustedOrigins: [WEB_ORIGIN],
    production: false,
    rateLimit: false,
  });
  const bus = new EventBus();
  const app = createApp({
    db: testDb,
    auth,
    bus,
    webOrigin: WEB_ORIGIN,
    timeZone: TIME_ZONE,
    rateLimit: false,
    now: () => clock.now,
  });
  return { app, auth, bus };
}

type Method = "get" | "post" | "patch" | "put" | "delete";

/** A cookie-keeping client that always sends the web Origin (like the browser). */
export function client(app: Express) {
  const agent = request.agent(app);
  const call = (method: Method) => (url: string, body?: object) => {
    const req = agent[method](url).set("Origin", WEB_ORIGIN);
    return body === undefined ? req : req.send(body);
  };
  return {
    get: call("get"),
    post: call("post"),
    patch: call("patch"),
    put: call("put"),
    delete: call("delete"),
  };
}
export type Client = ReturnType<typeof client>;

export async function signIn(app: Express, username: string, password: string) {
  const c = client(app);
  const res = await c.post("/api/auth/sign-in/username", { username, password });
  if (res.status !== 200) throw new Error(`sign-in failed for ${username}: ${res.status}`);
  return c;
}

export const ADMIN = { username: "boss", password: "admin-pass-1" };

export async function seedAdmin({ auth, app }: TestApp) {
  await auth.api.createUser({
    body: {
      name: "Boss",
      email: "boss@users.dawry.local",
      password: ADMIN.password,
      role: "admin",
      data: { username: ADMIN.username },
    },
  });
  return signIn(app, ADMIN.username, ADMIN.password);
}

let seq = 0;

/** Create a restaurant through the admin API and sign its owner in. */
export async function seedRestaurant(t: TestApp, admin: Client, name = "Pizza X") {
  seq += 1;
  const input = {
    name,
    slug: `${name.toLowerCase().replace(/\W+/g, "-")}-${seq}`,
    ownerName: `${name} Owner`,
    ownerPhone: `0100000${String(seq).padStart(4, "0")}`,
    ownerPassword: "owner-pass-1",
  };
  const res = await admin.post("/api/admin/restaurants", input);
  if (res.status !== 201) throw new Error(`seedRestaurant: ${res.status} ${JSON.stringify(res.body)}`);
  const owner = await signIn(t.app, input.ownerPhone, input.ownerPassword);
  return { ...input, id: res.body.id as string, owner };
}

export async function seedStaff(t: TestApp, owner: Client, username = `staff${++seq}a`) {
  const res = await owner.post("/api/restaurant/staff", {
    name: "Staff",
    username,
    password: "staff-pass-1",
  });
  if (res.status !== 201) throw new Error(`seedStaff: ${res.status} ${JSON.stringify(res.body)}`);
  const staff = await signIn(t.app, username, "staff-pass-1");
  return { id: res.body.id as string, username, staff };
}

export const order = (invoiceNumber: string, minutes = 30, extra: object = {}) => ({
  invoiceNumber,
  eta: { mode: "countdown", minutes },
  items: [{ name: "Margherita", quantity: 1 }],
  ...extra,
});
