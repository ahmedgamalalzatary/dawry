import {
  businessDay,
  isLate,
  ordersAhead,
  type OrderStatus,
  type PublicOrder,
  type PublicRestaurant,
  type StaffOrder,
} from "@dawry/shared";
import type { orderFieldValue, orderItem } from "../../db/schema";
import type { OrderRow } from "./repo";

export interface Clock {
  now: () => Date;
  timeZone: string;
}

type ItemRow = typeof orderItem.$inferSelect;
type FieldRow = typeof orderFieldValue.$inferSelect;

const DAY_MS = 24 * 60 * 60 * 1000;

export function currentDays(clock: Clock) {
  const today = businessDay(clock.now(), clock.timeZone);
  const midnightUtc = Date.parse(`${today}T00:00:00Z`);
  return {
    today,
    yesterday: new Date(midnightUtc - DAY_MS).toISOString().slice(0, 10),
  };
}

export const isDuplicateKey = (error: unknown) =>
  (error as { cause?: { code?: string } })?.cause?.code === "ER_DUP_ENTRY";

const iso = (d: Date | null) => (d ? d.toISOString() : null);

const STATUS_RANK: Record<OrderStatus, number> = {
  preparing: 0,
  out_for_delivery: 1,
  delivered: 2,
  cancelled: 3,
};

/** Kitchen first (soonest ETA first), then out, delivered, cancelled. */
export const byQueueOrder = (a: StaffOrder, b: StaffOrder) =>
  STATUS_RANK[a.status] - STATUS_RANK[b.status] || a.etaAt.localeCompare(b.etaAt);

export function toStaffOrder(
  row: OrderRow,
  items: ItemRow[],
  fields: FieldRow[],
  queue: OrderRow[],
  now: Date,
): StaffOrder {
  return {
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    businessDay: row.businessDay,
    status: row.status,
    etaMode: row.etaMode,
    etaAt: row.etaAt.toISOString(),
    late: isLate(row, now),
    ordersAhead: ordersAhead(row, queue),
    items: items
      .filter((i) => i.orderId === row.id)
      .map((i) => ({ name: i.name, quantity: i.quantity, menuItemId: i.menuItemId })),
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    address: row.address,
    notes: row.notes,
    fields: fields
      .filter((f) => f.orderId === row.id)
      .map((f) => ({ fieldId: f.fieldId ?? "", label: f.label, value: f.value, public: f.public })),
    createdAt: row.createdAt.toISOString(),
    outAt: iso(row.outAt),
    deliveredAt: iso(row.deliveredAt),
    cancelledAt: iso(row.cancelledAt),
  };
}

/** The customer view: no customer data, no private fields, no ids. */
export function toPublicOrder(
  restaurant: PublicRestaurant,
  row: OrderRow,
  items: ItemRow[],
  fields: FieldRow[],
  queue: OrderRow[],
  now: Date,
): PublicOrder {
  return {
    restaurant: {
      slug: restaurant.slug,
      name: restaurant.name,
      logoUrl: restaurant.logoUrl,
      phone: restaurant.phone,
    },
    invoiceNumber: row.invoiceNumber,
    businessDay: row.businessDay,
    status: row.status,
    etaMode: row.etaMode,
    etaAt: row.etaAt.toISOString(),
    late: isLate(row, now),
    ordersAhead: ordersAhead(row, queue),
    items: items.map((i) => ({ name: i.name, quantity: i.quantity })),
    fields: fields.filter((f) => f.public).map((f) => ({ label: f.label, value: f.value })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
