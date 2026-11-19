import type { ReportData, ReportOrderRow } from "@dawry/shared";
import { describe, expect, it } from "vitest";
import { daysBetween, itemStats, periodRange, toCsv, totals, withFacts } from "@/lib/reports";

const order = (over: Partial<ReportOrderRow>): ReportOrderRow => ({
  id: "o1",
  restaurantId: "r1",
  invoiceNumber: "1",
  businessDay: "2026-11-19",
  hour: 20,
  status: "delivered",
  etaMode: "countdown",
  customerName: "",
  createdById: null,
  createdAt: "2026-11-19T18:00:00.000Z",
  etaAt: "2026-11-19T18:20:00.000Z",
  outAt: null,
  deliveredAt: null,
  cancelledAt: null,
  ...over,
});

const data = (orders: ReportOrderRow[], items: ReportData["items"] = []): ReportData => ({
  from: "2026-11-01",
  to: "2026-11-19",
  now: "2026-11-19T19:00:00.000Z",
  restaurants: [],
  people: [],
  orders,
  items,
});

describe("periodRange", () => {
  const today = "2026-11-19"; // a Thursday

  it("covers today and yesterday", () => {
    expect(periodRange("today", today)).toEqual({ from: today, to: today });
    expect(periodRange("yesterday", today)).toEqual({ from: "2026-11-18", to: "2026-11-18" });
  });

  it("starts the week on Saturday", () => {
    expect(periodRange("week", today)).toEqual({ from: "2026-11-14", to: today });
    expect(periodRange("week", "2026-11-14")).toEqual({ from: "2026-11-14", to: "2026-11-14" });
  });

  it("covers this month and the whole of last month", () => {
    expect(periodRange("month", today)).toEqual({ from: "2026-11-01", to: today });
    expect(periodRange("lastMonth", today)).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(periodRange("lastMonth", "2026-01-10")).toEqual({ from: "2025-12-01", to: "2025-12-31" });
  });

  it("counts rolling windows back from today", () => {
    expect(periodRange("last7", today)).toEqual({ from: "2026-11-13", to: today });
    expect(periodRange("last30", today)).toEqual({ from: "2026-10-21", to: today });
  });

  it("uses a valid custom period and orders its ends", () => {
    expect(periodRange("custom", today, { from: "2026-11-10", to: "2026-11-02" })).toEqual({
      from: "2026-11-02",
      to: "2026-11-10",
    });
    expect(periodRange("custom", today, { from: "nope" })).toEqual({ from: "2026-10-21", to: today });
  });
});

describe("daysBetween", () => {
  it("lists every day, inclusive", () => {
    expect(daysBetween("2026-10-30", "2026-11-02")).toEqual(["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]);
  });
});

describe("withFacts", () => {
  it("judges lateness the way the board does", () => {
    const [early, late, stillCooking, cancelled] = withFacts(
      data([
        order({ id: "a", outAt: "2026-11-19T18:15:00.000Z" }),
        order({ id: "b", outAt: "2026-11-19T18:30:00.000Z" }),
        order({ id: "c", status: "preparing" }),
        order({ id: "d", status: "cancelled", cancelledAt: "2026-11-19T18:40:00.000Z" }),
      ]),
    );
    expect(early).toMatchObject({ late: false, onTime: true, prepMinutes: 15, delayMinutes: -5 });
    expect(late).toMatchObject({ late: true, onTime: false, prepMinutes: 30, delayMinutes: 10 });
    expect(stillCooking).toMatchObject({ late: true, onTime: null, prepMinutes: null });
    expect(cancelled).toMatchObject({ late: false, onTime: null });
  });

  it("measures delivery time and counts items", () => {
    const [row] = withFacts(
      data(
        [order({ outAt: "2026-11-19T18:10:00.000Z", deliveredAt: "2026-11-19T18:35:00.000Z" })],
        [
          { orderId: "o1", name: "Pizza", quantity: 2 },
          { orderId: "o1", name: "Cola", quantity: 1 },
        ],
      ),
    );
    expect(row).toMatchObject({ deliveryMinutes: 25, itemCount: 3, weekday: 4 });
  });
});

describe("totals", () => {
  it("adds up outcomes, punctuality and averages", () => {
    const rows = withFacts(
      data([
        order({ id: "a", outAt: "2026-11-19T18:10:00.000Z", deliveredAt: "2026-11-19T18:30:00.000Z" }),
        order({ id: "b", status: "out_for_delivery", outAt: "2026-11-19T18:30:00.000Z" }),
        order({ id: "c", status: "cancelled" }),
      ]),
    );
    expect(totals(rows)).toEqual({
      orders: 3,
      delivered: 1,
      cancelled: 1,
      open: 1,
      late: 1,
      onTimeRate: 0.5,
      avgPrepMinutes: 20,
      avgDelayMinutes: 0,
      avgDeliveryMinutes: 20,
    });
  });

  it("has no rates without orders", () => {
    expect(totals([])).toMatchObject({ orders: 0, onTimeRate: null, avgPrepMinutes: null });
  });
});

describe("itemStats", () => {
  it("ranks items of the given orders by quantity with their share", () => {
    const items = [
      { orderId: "a", name: "Pizza ", quantity: 1 },
      { orderId: "b", name: "Pizza", quantity: 2 },
      { orderId: "b", name: "Cola", quantity: 1 },
      { orderId: "z", name: "Cola", quantity: 9 }, // an order that is filtered out
    ];
    const rows = withFacts(data([order({ id: "a", businessDay: "2026-11-02" }), order({ id: "b" }), order({ id: "c" })], items));
    expect(itemStats(rows, items)).toEqual([
      { name: "Pizza", quantity: 3, orders: 2, share: 0.75, firstDay: "2026-11-02", lastDay: "2026-11-19" },
      { name: "Cola", quantity: 1, orders: 1, share: 0.25, firstDay: "2026-11-19", lastDay: "2026-11-19" },
    ]);
  });
});

describe("toCsv", () => {
  it("quotes commas, quotes and line breaks", () => {
    expect(toCsv([["Name", "Note"], ["Roma, Cairo", 'say "hi"'], ["x", null], [1, "a\nb"]])).toBe(
      'Name,Note\r\n"Roma, Cairo","say ""hi"""\r\nx,\r\n1,"a\nb"',
    );
  });
});
