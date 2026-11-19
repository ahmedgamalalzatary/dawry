import { describe, expect, it } from "vitest";
import {
  byHour,
  byPerson,
  byWeekday,
  prepBuckets,
  topItems,
  totalsOf,
  wasLate,
  type ReportOrder,
} from "../src/modules/reports/helpers";

const at = (hhmm: string, day = "2026-11-19") => new Date(`${day}T${hhmm}:00Z`);

function order(overrides: Partial<ReportOrder> = {}): ReportOrder {
  return {
    id: "o1",
    organizationId: "r1",
    businessDay: "2026-11-19",
    status: "preparing",
    etaMode: "minutes",
    createdAt: at("18:00"),
    etaAt: at("18:20"),
    outAt: null,
    deliveredAt: null,
    cancelledAt: null,
    createdById: "u1",
    ...overrides,
  };
}

const now = at("18:30");

describe("wasLate", () => {
  it("is late when it left after the ETA", () => {
    expect(wasLate(order({ status: "out_for_delivery", outAt: at("18:25") }), now)).toBe(true);
    expect(wasLate(order({ status: "out_for_delivery", outAt: at("18:15") }), now)).toBe(false);
  });

  it("is late when still preparing past the ETA", () => {
    expect(wasLate(order(), now)).toBe(true);
    expect(wasLate(order(), at("18:10"))).toBe(false);
  });

  it("never counts cancelled orders as late", () => {
    expect(wasLate(order({ status: "cancelled", cancelledAt: at("18:25") }), now)).toBe(false);
  });
});

describe("totalsOf", () => {
  it("averages prep, delay and delivery and rates on-time departures", () => {
    const totals = totalsOf(
      [
        order({ id: "a", status: "delivered", outAt: at("18:10"), deliveredAt: at("18:30") }),
        order({ id: "b", status: "out_for_delivery", outAt: at("18:30") }),
        order({ id: "c", status: "cancelled", cancelledAt: at("18:05") }),
        order({ id: "d", etaAt: at("19:00") }),
      ],
      now,
    );
    expect(totals).toEqual({
      orders: 4,
      delivered: 1,
      cancelled: 1,
      open: 2,
      late: 1,
      onTimeRate: 0.5,
      avgPrepMinutes: 20, // (10 + 30) / 2
      avgDelayMinutes: 0, // (-10 + 10) / 2
      avgDeliveryMinutes: 20,
    });
  });

  it("has no rates without departures", () => {
    const totals = totalsOf([order({ etaAt: at("19:00") })], now);
    expect(totals.onTimeRate).toBeNull();
    expect(totals.avgPrepMinutes).toBeNull();
  });
});

describe("byHour / byWeekday", () => {
  it("buckets entry times in the restaurant time zone", () => {
    const hours = byHour([order({ createdAt: at("18:00") }), order({ createdAt: at("22:30") })], "Africa/Cairo");
    expect(hours).toHaveLength(24);
    expect(hours[20]).toEqual({ hour: 20, orders: 1 });
    expect(hours[0]).toEqual({ hour: 0, orders: 1 }); // 22:30Z is 00:30 next day in Cairo
  });

  it("buckets business days by weekday", () => {
    // 2026-11-19 is a Thursday.
    expect(byWeekday([order(), order()])[4]).toEqual({ weekday: 4, orders: 2 });
  });
});

describe("topItems", () => {
  it("sums quantities per name and counts orders", () => {
    expect(
      topItems([
        { orderId: "a", name: "Pizza", quantity: 2 },
        { orderId: "b", name: "Pizza ", quantity: 1 },
        { orderId: "b", name: "Cola", quantity: 4 },
      ]),
    ).toEqual([
      { name: "Cola", quantity: 4, orders: 1 },
      { name: "Pizza", quantity: 3, orders: 2 },
    ]);
  });
});

describe("byPerson", () => {
  it("ranks people by orders entered and skips unknown accounts", () => {
    const people = byPerson(
      [order({ id: "a" }), order({ id: "b", createdById: "u2" }), order({ id: "c", createdById: "u2" }), order({ id: "d", createdById: null })],
      new Map([
        ["u1", "Mona"],
        ["u2", "Karim"],
      ]),
      now,
    );
    expect(people.map((p) => [p.name, p.orders])).toEqual([
      ["Karim", 2],
      ["Mona", 1],
    ]);
  });
});

describe("prepBuckets", () => {
  it("counts departures by minutes from entry", () => {
    const buckets = prepBuckets([
      order({ status: "out_for_delivery", outAt: at("18:05") }),
      order({ status: "out_for_delivery", outAt: at("18:25") }),
      order({ status: "delivered", outAt: at("19:30"), deliveredAt: at("19:40") }),
      order(),
    ]);
    expect(buckets.map((b) => b.orders)).toEqual([1, 0, 1, 0, 0, 1]);
  });
});
