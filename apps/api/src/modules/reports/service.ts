import {
  businessDay,
  REPORT_MAX_DAYS,
  REPORT_RANGES,
  type ReportData,
  type ReportRange,
  type RestaurantReport,
} from "@dawry/shared";
import type { Db } from "../../db/client";
import type { Clock } from "../orders/helpers";
import { buildReport } from "./helpers";
import * as repo from "./repo";

export const DEFAULT_RANGE: ReportRange = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/** `?days=` → one of the allowed windows (30 when missing or unknown). */
export function parseRange(value: unknown): ReportRange {
  const n = Number(value);
  return (REPORT_RANGES as readonly number[]).includes(n) ? (n as ReportRange) : DEFAULT_RANGE;
}

export function rangeOf(clock: Clock, days: number): RestaurantReport["range"] {
  const now = clock.now();
  return {
    from: businessDay(new Date(now.getTime() - (days - 1) * DAY_MS), clock.timeZone),
    to: businessDay(now, clock.timeZone),
    days,
  };
}

export async function report(
  db: Db,
  restaurantId: string,
  clock: Clock,
  days: ReportRange = DEFAULT_RANGE,
): Promise<RestaurantReport> {
  const range = rangeOf(clock, days);
  const [rows, names] = await Promise.all([
    repo.ordersSince(db, restaurantId, range.from),
    repo.memberNames(db, restaurantId),
  ]);
  const items = await repo.itemsOf(
    db,
    rows.map((r) => r.id),
  );
  return buildReport({ rows, items, names, range, timeZone: clock.timeZone, now: clock.now() });
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const dayNumber = (day: string) => Date.parse(`${day}T00:00:00Z`) / DAY_MS;

/**
 * `?from=&to=` business days → a valid period: the last 30 days when missing or
 * malformed, swapped when reversed, and never longer than REPORT_MAX_DAYS.
 */
export function parsePeriod(query: { from?: unknown; to?: unknown }, clock: Clock): { from: string; to: string } {
  const from = typeof query.from === "string" && DAY.test(query.from) && !Number.isNaN(dayNumber(query.from)) ? query.from : null;
  const to = typeof query.to === "string" && DAY.test(query.to) && !Number.isNaN(dayNumber(query.to)) ? query.to : null;
  if (!from || !to) {
    const range = rangeOf(clock, DEFAULT_RANGE);
    return { from: range.from, to: range.to };
  }
  const [a, b] = from <= to ? [from, to] : [to, from];
  if (dayNumber(b) - dayNumber(a) + 1 <= REPORT_MAX_DAYS) return { from: a, to: b };
  const start = new Date((dayNumber(b) - REPORT_MAX_DAYS + 1) * DAY_MS).toISOString().slice(0, 10);
  return { from: start, to: b };
}

/** Every order of the period with its items, the people and the restaurants they belong to. */
export async function reportData(
  db: Db,
  restaurantId: string | null,
  clock: Clock,
  period: { from: string; to: string },
): Promise<ReportData> {
  const [rows, people, restaurants] = await Promise.all([
    repo.ordersBetween(db, restaurantId, period.from, period.to),
    repo.peopleOf(db, restaurantId),
    repo.restaurantsOf(db, restaurantId),
  ]);
  const items = await repo.itemsOf(
    db,
    rows.map((r) => r.id),
  );
  const hourOf = new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: clock.timeZone });
  const iso = (d: Date | null) => (d ? d.toISOString() : null);
  return {
    ...period,
    now: clock.now().toISOString(),
    restaurants: restaurants.sort((a, b) => a.name.localeCompare(b.name)),
    people: people.sort((a, b) => a.name.localeCompare(b.name)),
    orders: rows
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((o) => ({
        id: o.id,
        restaurantId: o.organizationId,
        invoiceNumber: o.invoiceNumber,
        businessDay: o.businessDay,
        hour: Number(hourOf.format(o.createdAt)) % 24,
        status: o.status,
        etaMode: o.etaMode,
        customerName: o.customerName,
        createdById: o.createdById,
        createdAt: o.createdAt.toISOString(),
        etaAt: o.etaAt.toISOString(),
        outAt: iso(o.outAt),
        deliveredAt: iso(o.deliveredAt),
        cancelledAt: iso(o.cancelledAt),
      })),
    items,
  };
}
