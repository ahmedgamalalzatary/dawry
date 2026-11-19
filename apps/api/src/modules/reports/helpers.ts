import type { RestaurantReport } from "@dawry/shared";
import type { ReportOrder } from "./repo";

const MINUTE = 60_000;

const average = (values: number[]) =>
  values.length === 0 ? null : Math.round(values.reduce((a, b) => a + b, 0) / values.length);

/** Group orders by business day, newest day first. */
export function summarise(rows: ReportOrder[]): RestaurantReport["days"] {
  const byDay = new Map<string, ReportOrder[]>();
  for (const row of rows) byDay.set(row.businessDay, [...(byDay.get(row.businessDay) ?? []), row]);

  return [...byDay.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([day, dayRows]) => {
      const out = dayRows.flatMap((r) => (r.outAt ? [{ ...r, outAt: r.outAt }] : []));
      return {
        day,
        orders: dayRows.length,
        delivered: dayRows.filter((r) => r.status === "delivered").length,
        cancelled: dayRows.filter((r) => r.status === "cancelled").length,
        avgPrepMinutes: average(out.map((r) => (r.outAt.getTime() - r.createdAt.getTime()) / MINUTE)),
        avgDelayMinutes: average(out.map((r) => (r.outAt.getTime() - r.etaAt.getTime()) / MINUTE)),
      };
    });
}
