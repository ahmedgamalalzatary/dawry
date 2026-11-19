import { describe, expect, it } from "vitest";
import {
  businessDay,
  canTransition,
  computeEtaAt,
  isLate,
  ordersAhead,
  type QueueOrder,
} from "../src/orders";

const at = (iso: string) => new Date(iso);

describe("ordersAhead", () => {
  const order = (
    id: string,
    etaAt: string,
    createdAt: string,
    status: QueueOrder["status"] = "preparing",
  ): QueueOrder => ({ id, etaAt: at(etaAt), createdAt: at(createdAt), status });

  it("counts preparing orders that finish before this one, not by entry order", () => {
    // Ali entered first with a long ETA; Sara entered later with a short ETA.
    const ali = order("ali", "2026-11-19T18:40:00Z", "2026-11-19T18:00:00Z");
    const sara = order("sara", "2026-11-19T18:15:00Z", "2026-11-19T18:05:00Z");

    expect(ordersAhead(sara, [ali, sara])).toBe(0);
    expect(ordersAhead(ali, [ali, sara])).toBe(1);
  });

  it("breaks ETA ties by who was entered first", () => {
    const first = order("a", "2026-11-19T18:30:00Z", "2026-11-19T18:00:00Z");
    const second = order("b", "2026-11-19T18:30:00Z", "2026-11-19T18:01:00Z");

    expect(ordersAhead(first, [first, second])).toBe(0);
    expect(ordersAhead(second, [first, second])).toBe(1);
  });

  it("ignores orders that are out for delivery, delivered or cancelled", () => {
    const mine = order("me", "2026-11-19T19:00:00Z", "2026-11-19T18:00:00Z");
    const others = [
      order("o1", "2026-11-19T18:10:00Z", "2026-11-19T17:00:00Z", "out_for_delivery"),
      order("o2", "2026-11-19T18:10:00Z", "2026-11-19T17:00:00Z", "delivered"),
      order("o3", "2026-11-19T18:10:00Z", "2026-11-19T17:00:00Z", "cancelled"),
      order("o4", "2026-11-19T18:10:00Z", "2026-11-19T17:00:00Z"),
    ];

    expect(ordersAhead(mine, [mine, ...others])).toBe(1);
  });

  it("is 0 when this order itself is no longer preparing", () => {
    const mine = order("me", "2026-11-19T19:00:00Z", "2026-11-19T18:00:00Z", "out_for_delivery");
    const other = order("o", "2026-11-19T18:10:00Z", "2026-11-19T17:00:00Z");

    expect(ordersAhead(mine, [mine, other])).toBe(0);
  });
});

describe("isLate", () => {
  const now = at("2026-11-19T18:30:00Z");

  it("is true when preparing and the ETA has passed", () => {
    expect(isLate({ status: "preparing", etaAt: at("2026-11-19T18:29:59Z") }, now)).toBe(true);
  });

  it("is false before the ETA", () => {
    expect(isLate({ status: "preparing", etaAt: at("2026-11-19T18:30:00Z") }, now)).toBe(false);
  });

  it("is false once the order has left the kitchen", () => {
    expect(isLate({ status: "out_for_delivery", etaAt: at("2026-11-19T18:00:00Z") }, now)).toBe(
      false,
    );
  });
});

describe("canTransition", () => {
  it.each([
    ["preparing", "out_for_delivery"],
    ["out_for_delivery", "delivered"],
    ["preparing", "cancelled"],
    ["out_for_delivery", "cancelled"],
  ] as const)("allows %s → %s", (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  it.each([
    ["preparing", "delivered"],
    ["delivered", "cancelled"],
    ["cancelled", "preparing"],
    ["out_for_delivery", "preparing"],
    ["preparing", "preparing"],
  ] as const)("rejects %s → %s", (from, to) => {
    expect(canTransition(from, to)).toBe(false);
  });
});

describe("businessDay", () => {
  it("uses the calendar date in the given time zone", () => {
    // 23:30 UTC on the 19th is already the 20th in Cairo (UTC+2).
    expect(businessDay(at("2026-11-19T23:30:00Z"), "Africa/Cairo")).toBe("2026-11-20");
    expect(businessDay(at("2026-11-19T21:59:00Z"), "Africa/Cairo")).toBe("2026-11-19");
  });
});

describe("computeEtaAt", () => {
  const now = at("2026-11-19T18:00:00Z"); // 20:00 in Cairo

  it("adds minutes for countdown and minutes modes", () => {
    expect(computeEtaAt({ mode: "countdown", minutes: 35 }, now, "Africa/Cairo")).toEqual(
      at("2026-11-19T18:35:00Z"),
    );
    expect(computeEtaAt({ mode: "minutes", minutes: 10 }, now, "Africa/Cairo")).toEqual(
      at("2026-11-19T18:10:00Z"),
    );
  });

  it("reads a clock time in the restaurant's time zone", () => {
    expect(computeEtaAt({ mode: "clock", time: "20:45" }, now, "Africa/Cairo")).toEqual(
      at("2026-11-19T18:45:00Z"),
    );
  });

  it("treats a clock time earlier than now as tomorrow", () => {
    expect(computeEtaAt({ mode: "clock", time: "00:30" }, now, "Africa/Cairo")).toEqual(
      at("2026-11-19T22:30:00Z"),
    );
  });
});
