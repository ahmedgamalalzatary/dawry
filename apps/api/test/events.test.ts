import { get, type IncomingMessage } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { makeApp, order, seedAdmin, seedRestaurant } from "./helpers/app";
import { closeTestDb, resetDb } from "./helpers/db";

const t = makeApp();
const server = t.app.listen(0);
let base = "";

beforeAll(() => {
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
beforeEach(resetDb);
afterAll(async () => {
  server.closeAllConnections();
  await new Promise((done) => server.close(done));
  await closeTestDb();
});

/** Open an SSE stream and collect its text until `until` appears. */
function openStream(path: string) {
  let text = "";
  let response: IncomingMessage | undefined;
  const ready = new Promise<void>((resolve) => {
    get(`${base}${path}`, (res) => {
      response = res;
      res.setEncoding("utf8");
      res.on("data", (chunk: string) => {
        text += chunk;
        if (text.includes("event: ready")) resolve();
      });
    });
  });
  const waitFor = (needle: string, timeoutMs = 2000) =>
    new Promise<void>((resolve, reject) => {
      const started = Date.now();
      const tick = () => {
        if (text.includes(needle)) return resolve();
        if (Date.now() - started > timeoutMs) return reject(new Error(`no "${needle}" in: ${text}`));
        setTimeout(tick, 20);
      };
      tick();
    });
  return { ready, waitFor, close: () => response?.destroy(), text: () => text, status: () => response?.statusCode };
}

describe("GET /api/public/r/:slug/events", () => {
  it("streams a change event when one of the restaurant's orders changes", async () => {
    const admin = await seedAdmin(t);
    const r = await seedRestaurant(t, admin);
    const other = await seedRestaurant(t, admin, "Other");

    const stream = openStream(`/api/public/r/${r.slug}/events`);
    await stream.ready;
    expect(stream.status()).toBe(200);

    await other.owner.post("/api/restaurant/orders", order("1"));
    await new Promise((done) => setTimeout(done, 50));
    expect(stream.text()).not.toContain("event: change");

    await r.owner.post("/api/restaurant/orders", order("1"));
    await stream.waitFor("event: change");
    stream.close();
  });
});
