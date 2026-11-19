import { get, IncomingMessage, ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { Socket } from "node:net";
import express, { type Response } from "express";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { openStream as initializeStream } from "../src/http/events";
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
  it("does not start a heartbeat for an already closed response", () => {
    const socket = new Socket();
    const req = new IncomingMessage(socket);
    const res = Object.assign(new ServerResponse(req), { status: express.response.status, set: express.response.set });
    res.destroy();
    vi.useFakeTimers();
    try {
      initializeStream(res as Response, t.bus, () => true);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
      socket.destroy();
    }
  });

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
