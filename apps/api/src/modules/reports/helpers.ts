import type {
  EtaMode,
  OrderStatus,
  ReportDay,
  ReportItem,
  ReportPerson,
  ReportTotals,
  RestaurantReport,
} from "@dawry/shared";

const MINUTE = 60_000;

/** One order as the reports see it. */
export interface ReportOrder {
  id: string;
  organizationId: string;
  businessDay: string;
  status: OrderStatus;
  etaMode: EtaMode;
  createdAt: Date;
  etaAt: Date;
  outAt: Date | null;
  deliveredAt: Date | null;
  cancelledAt: Date | null;
  createdById: string | null;
}

export interface ReportItemRow {
  orderId: string;
  name: string;
  quantity: number;
}

const average = (values: number[]) =>
  values.length === 0 ? null : Math.round(values.reduce((a, b) => a + b, 0) / values.length);

/** When the order left the kitchen: out, or delivered straight from preparing. */
const leftAt = (o: ReportOrder) => (o.status === "cancelled" ? null : (o.outAt ?? o.deliveredAt));

/** Late when it left after its ETA, or is still in the kitchen past it. */
export function wasLate(o: ReportOrder, now: Date) {
  const left = leftAt(o);
  if (left) return left.getTime() > o.etaAt.getTime();
  return o.status === "preparing" && now.getTime() > o.etaAt.getTime();
}

export function totalsOf(rows: ReportOrder[], now: Date): ReportTotals {
  const left = rows.flatMap((o) => {
    const at = leftAt(o);
    return at ? [{ o, at }] : [];
  });
  const delivered = rows.filter((o) => o.status === "delivered");
  const delivery = delivered.flatMap((o) =>
    o.outAt && o.deliveredAt ? [(o.deliveredAt.getTime() - o.outAt.getTime()) / MINUTE] : [],
  );
  const onTime = left.filter(({ o, at }) => at.getTime() <= o.etaAt.getTime()).length;

  return {
    orders: rows.length,
    delivered: delivered.length,
    cancelled: rows.filter((o) => o.status === "cancelled").length,
    open: rows.filter((o) => o.status === "preparing" || o.status === "out_for_delivery").length,
    late: rows.filter((o) => wasLate(o, now)).length,
    onTimeRate: left.length === 0 ? null : onTime / left.length,
    avgPrepMinutes: average(left.map(({ o, at }) => (at.getTime() - o.createdAt.getTime()) / MINUTE)),
    avgDelayMinutes: average(left.map(({ o, at }) => (at.getTime() - o.etaAt.getTime()) / MINUTE)),
    avgDeliveryMinutes: average(delivery),
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

/** Newest day first. */
export function byDay(rows: ReportOrder[], now: Date): ReportDay[] {
  return [...groupBy(rows, (o) => o.businessDay).entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([day, dayRows]) => ({ day, ...totalsOf(dayRows, now) }));
}

export function byHour(rows: ReportOrder[], timeZone: string) {
  const format = new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone });
  const counts = Array.from({ length: 24 }, () => 0);
  for (const o of rows) counts[Number(format.format(o.createdAt)) % 24]! += 1;
  return counts.map((orders, hour) => ({ hour, orders }));
}

export function byWeekday(rows: ReportOrder[]) {
  const counts = Array.from({ length: 7 }, () => 0);
  for (const o of rows) counts[new Date(`${o.businessDay}T00:00:00Z`).getUTCDay()]! += 1;
  return counts.map((orders, weekday) => ({ weekday, orders }));
}

/** Most ordered first, by quantity, then by how many orders had it. */
export function topItems(items: ReportItemRow[], limit = 20): ReportItem[] {
  return [...groupBy(items, (i) => i.name.trim()).entries()]
    .map(([name, rows]) => ({
      name,
      quantity: rows.reduce((n, r) => n + r.quantity, 0),
      orders: new Set(rows.map((r) => r.orderId)).size,
    }))
    .sort((a, b) => b.quantity - a.quantity || b.orders - a.orders || a.name.localeCompare(b.name))
    .slice(0, limit);
}

export function personStats(rows: ReportOrder[], now: Date): Omit<ReportPerson, "id" | "name"> {
  const t = totalsOf(rows, now);
  return {
    orders: t.orders,
    delivered: t.delivered,
    cancelled: t.cancelled,
    onTimeRate: t.onTimeRate,
    avgPrepMinutes: t.avgPrepMinutes,
  };
}

/** Busiest first. Orders by removed accounts are left out. */
export function byPerson(rows: ReportOrder[], names: Map<string, string>, now: Date): ReportPerson[] {
  return [...groupBy(rows, (o) => o.createdById).entries()]
    .flatMap(([id, list]) => {
      const name = id ? names.get(id) : undefined;
      return id && name ? [{ id, name, ...personStats(list, now) }] : [];
    })
    .sort((a, b) => b.orders - a.orders || a.name.localeCompare(b.name));
}

const MODES: EtaMode[] = ["countdown", "clock", "minutes"];

export function byEtaMode(rows: ReportOrder[]) {
  return MODES.map((mode) => ({ mode, orders: rows.filter((o) => o.etaMode === mode).length }));
}

const BUCKETS: [number, number | null][] = [
  [0, 10],
  [10, 20],
  [20, 30],
  [30, 45],
  [45, 60],
  [60, null],
];

export function prepBuckets(rows: ReportOrder[]) {
  const minutes = rows.flatMap((o) => {
    const at = leftAt(o);
    return at ? [(at.getTime() - o.createdAt.getTime()) / MINUTE] : [];
  });
  return BUCKETS.map(([from, to]) => ({
    from,
    to,
    orders: minutes.filter((m) => m >= from && (to === null || m < to)).length,
  }));
}

export function buildReport(input: {
  rows: ReportOrder[];
  items: ReportItemRow[];
  names: Map<string, string>;
  range: RestaurantReport["range"];
  timeZone: string;
  now: Date;
}): RestaurantReport {
  const { rows, now } = input;
  return {
    range: input.range,
    totals: totalsOf(rows, now),
    days: byDay(rows, now),
    hours: byHour(rows, input.timeZone),
    weekdays: byWeekday(rows),
    items: topItems(input.items),
    people: byPerson(rows, input.names, now),
    etaModes: byEtaMode(rows),
    prepBuckets: prepBuckets(rows),
  };
}
