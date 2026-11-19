import type { EtaInput, OrderStatus } from "./schemas";

export interface QueueOrder {
  id: string;
  status: OrderStatus;
  etaAt: Date;
  createdAt: Date;
}

const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  preparing: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** True when `a` is expected to finish before `b` (ETA, then entry time). */
function finishesBefore(a: QueueOrder, b: QueueOrder): boolean {
  const byEta = a.etaAt.getTime() - b.etaAt.getTime();
  if (byEta !== 0) return byEta < 0;
  return a.createdAt.getTime() < b.createdAt.getTime();
}

/**
 * Orders still in the kitchen that are expected to finish before `target`.
 * `orders` is the restaurant's orders for the day (may include `target`).
 */
export function ordersAhead(target: QueueOrder, orders: readonly QueueOrder[]): number {
  if (target.status !== "preparing") return 0;
  return orders.filter(
    (o) => o.id !== target.id && o.status === "preparing" && finishesBefore(o, target),
  ).length;
}

export function isLate(order: { status: OrderStatus; etaAt: Date }, now: Date): boolean {
  return order.status === "preparing" && now.getTime() > order.etaAt.getTime();
}

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

/** Calendar date (YYYY-MM-DD) of `date` in `timeZone`. */
export function businessDay(date: Date, timeZone: string): string {
  const { year, month, day } = zonedParts(date, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Offset of `timeZone` from UTC at `date`, in milliseconds. */
function offsetMs(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

const MINUTE = 60_000;

/** Turn the staff's ETA input into an absolute time. */
export function computeEtaAt(input: EtaInput, now: Date, timeZone: string): Date {
  if (input.mode !== "clock") return new Date(now.getTime() + input.minutes * MINUTE);

  const [hour, minute] = input.time.split(":").map(Number) as [number, number];
  const today = zonedParts(now, timeZone);
  const localGuess = Date.UTC(today.year, today.month - 1, today.day, hour, minute);
  let eta = new Date(localGuess - offsetMs(new Date(localGuess), timeZone));
  if (eta.getTime() < now.getTime()) eta = new Date(eta.getTime() + 24 * 60 * MINUTE);
  return eta;
}
