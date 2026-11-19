import type { ReportData, ReportItemLine, ReportOrderRow } from "@dawry/shared";

// ---- Periods ----------------------------------------------------------------

export const PERIODS = ["today", "yesterday", "week", "month", "lastMonth", "last7", "last30", "last90", "custom"] as const;
export type Period = (typeof PERIODS)[number];
export const DEFAULT_PERIOD: Period = "last30";

const DAY_MS = 86_400_000;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const toTime = (day: string) => Date.parse(`${day}T00:00:00Z`);
const toDay = (time: number) => new Date(time).toISOString().slice(0, 10);
export const addDays = (day: string, n: number) => toDay(toTime(day) + n * DAY_MS);
const isDay = (v: unknown): v is string => typeof v === "string" && DAY.test(v) && !Number.isNaN(toTime(v));

/** A named period → business days from..to (inclusive), counted back from `today`. */
export function periodRange(period: Period, today: string, custom: { from?: string; to?: string } = {}) {
  switch (period) {
    case "today":
      return { from: today, to: today };
    case "yesterday":
      return { from: addDays(today, -1), to: addDays(today, -1) };
    case "week": {
      // The working week starts on Saturday (getUTCDay 6).
      const back = (new Date(toTime(today)).getUTCDay() + 1) % 7;
      return { from: addDays(today, -back), to: today };
    }
    case "month":
      return { from: `${today.slice(0, 7)}-01`, to: today };
    case "lastMonth": {
      const firstOfThis = `${today.slice(0, 7)}-01`;
      const lastOfPrev = addDays(firstOfThis, -1);
      return { from: `${lastOfPrev.slice(0, 7)}-01`, to: lastOfPrev };
    }
    case "last7":
      return { from: addDays(today, -6), to: today };
    case "last90":
      return { from: addDays(today, -89), to: today };
    case "custom":
      if (isDay(custom.from) && isDay(custom.to)) {
        return custom.from <= custom.to ? { from: custom.from, to: custom.to } : { from: custom.to, to: custom.from };
      }
      return periodRange("last30", today);
    default:
      return { from: addDays(today, -29), to: today };
  }
}

/** Every business day from..to, oldest first. */
export function daysBetween(from: string, to: string) {
  const days: string[] = [];
  for (let t = toTime(from); t <= toTime(to); t += DAY_MS) days.push(toDay(t));
  return days;
}

// ---- Per-order facts ---------------------------------------------------------

export interface OrderFacts extends ReportOrderRow {
  /** Went out after its ETA, or still preparing past it. */
  late: boolean;
  /** Whether it went out by its ETA; null when it never went out. */
  onTime: boolean | null;
  /** Entry → out. */
  prepMinutes: number | null;
  /** Out minus ETA (negative = early). */
  delayMinutes: number | null;
  /** Out → delivered. */
  deliveryMinutes: number | null;
  /** 0 = Sunday, of the business day. */
  weekday: number;
  itemCount: number;
}

const minutes = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 60_000;

export function withFacts(data: ReportData): OrderFacts[] {
  const now = Date.parse(data.now);
  const counts = new Map<string, number>();
  for (const i of data.items) counts.set(i.orderId, (counts.get(i.orderId) ?? 0) + i.quantity);
  return data.orders.map((o) => {
    const left = o.status === "cancelled" ? null : (o.outAt ?? o.deliveredAt);
    const late = left ? Date.parse(left) > Date.parse(o.etaAt) : o.status === "preparing" && now > Date.parse(o.etaAt);
    return {
      ...o,
      late,
      onTime: left ? !late : null,
      prepMinutes: left ? minutes(o.createdAt, left) : null,
      delayMinutes: left ? minutes(o.etaAt, left) : null,
      deliveryMinutes: o.status === "delivered" && o.outAt && o.deliveredAt ? minutes(o.outAt, o.deliveredAt) : null,
      weekday: new Date(toTime(o.businessDay)).getUTCDay(),
      itemCount: counts.get(o.id) ?? 0,
    };
  });
}

// ---- Aggregates --------------------------------------------------------------

export interface Totals {
  orders: number;
  delivered: number;
  cancelled: number;
  open: number;
  late: number;
  onTimeRate: number | null;
  avgPrepMinutes: number | null;
  avgDelayMinutes: number | null;
  avgDeliveryMinutes: number | null;
}

const average = (values: (number | null)[]) => {
  const xs = values.filter((v): v is number => v !== null);
  return xs.length === 0 ? null : Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
};

export function totals(rows: OrderFacts[]): Totals {
  const wentOut = rows.filter((r) => r.onTime !== null);
  return {
    orders: rows.length,
    delivered: rows.filter((r) => r.status === "delivered").length,
    cancelled: rows.filter((r) => r.status === "cancelled").length,
    open: rows.filter((r) => r.status === "preparing" || r.status === "out_for_delivery").length,
    late: rows.filter((r) => r.late).length,
    onTimeRate: wentOut.length === 0 ? null : wentOut.filter((r) => r.onTime).length / wentOut.length,
    avgPrepMinutes: average(rows.map((r) => r.prepMinutes)),
    avgDelayMinutes: average(rows.map((r) => r.delayMinutes)),
    avgDeliveryMinutes: average(rows.map((r) => r.deliveryMinutes)),
  };
}

export function groupBy<T, K>(rows: T[], key: (row: T) => K) {
  const groups = new Map<K, T[]>();
  for (const row of rows) {
    const k = key(row);
    const list = groups.get(k);
    if (list) list.push(row);
    else groups.set(k, [row]);
  }
  return groups;
}

export interface ItemStat {
  name: string;
  quantity: number;
  /** Orders that had it. */
  orders: number;
  /** Of all quantity sold in these orders (0..1). */
  share: number;
  firstDay: string;
  lastDay: string;
}

/** Items of the given orders only, most sold first. */
export function itemStats(rows: OrderFacts[], items: ReportItemLine[]): ItemStat[] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const lines = items.filter((i) => byId.has(i.orderId));
  const all = lines.reduce((n, i) => n + i.quantity, 0);
  return [...groupBy(lines, (i) => i.name.trim()).entries()]
    .map(([name, list]) => {
      const days = list.map((i) => byId.get(i.orderId)!.businessDay).sort();
      const quantity = list.reduce((n, i) => n + i.quantity, 0);
      return {
        name,
        quantity,
        orders: new Set(list.map((i) => i.orderId)).size,
        share: all ? quantity / all : 0,
        firstDay: days[0]!,
        lastDay: days[days.length - 1]!,
      };
    })
    .sort((a, b) => b.quantity - a.quantity || b.orders - a.orders || a.name.localeCompare(b.name));
}

// ---- Export ------------------------------------------------------------------

/** RFC 4180 CSV (CRLF rows); cells with commas, quotes or line breaks are quoted. */
export function toCsv(rows: (string | number | null | undefined)[][]) {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const text = cell === null || cell === undefined ? "" : String(cell);
          return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        })
        .join(","),
    )
    .join("\r\n");
}

/** Saves a CSV that Excel opens with Arabic intact (UTF-8 with a byte-order mark). */
export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const blob = new Blob(["﻿", toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** The page's `?period=&from=&to=` → business days to load. */
export function resolvePeriod(search: Record<string, string | string[] | undefined>, today: string) {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const asked = one(search.period);
  const period = (PERIODS as readonly string[]).includes(asked ?? "") ? (asked as Period) : DEFAULT_PERIOD;
  return periodRange(period, today, { from: one(search.from), to: one(search.to) });
}
