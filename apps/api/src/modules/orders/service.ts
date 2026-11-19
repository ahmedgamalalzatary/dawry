import { randomUUID } from "node:crypto";
import {
  canTransition,
  computeEtaAt,
  isLate,
  type CreateOrderInput,
  type OrderSummary,
  type EtaInput,
  type OrderStatus,
  type PublicOrder,
  type PublicRestaurant,
} from "@dawry/shared";
import type { Db } from "../../db/client";
import { conflict, HttpError, notFound } from "../../http/errors";
import {
  byQueueOrder,
  currentDays,
  isDuplicateKey,
  toPublicOrder,
  toStaffOrder,
  type Clock,
} from "./helpers";
import * as repo from "./repo";

const invalid = (message: string) => new HttpError("validation_failed", message);
const duplicateInvoice = () => conflict("This invoice number is already used today");

async function queueOf(db: Db, restaurantId: string, clock: Clock) {
  const { today, yesterday } = currentDays(clock);
  return repo.liveOrders(db, restaurantId, today, yesterday);
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** The live queue, or every order of one past business day (`day`). */
export async function listOrders(db: Db, restaurantId: string, clock: Clock, day?: string) {
  const { today } = currentDays(clock);
  const rows =
    day && DAY.test(day) && day !== today
      ? await repo.ordersOfDay(db, restaurantId, day)
      : await queueOf(db, restaurantId, clock);
  const { items, fields } = await repo.itemsAndFields(
    db,
    rows.map((r) => r.id),
  );
  const now = clock.now();
  return rows.map((r) => toStaffOrder(r, items, fields, rows, now)).sort(byQueueOrder);
}

async function requireOrder(db: Db, restaurantId: string, orderId: string) {
  const row = await repo.findOrder(db, restaurantId, orderId);
  if (!row) throw notFound("Order not found");
  return row;
}

export async function getOrder(db: Db, restaurantId: string, orderId: string, clock: Clock) {
  const row = await requireOrder(db, restaurantId, orderId);
  const [queue, { items, fields }] = await Promise.all([
    queueOf(db, restaurantId, clock),
    repo.itemsAndFields(db, [row.id]),
  ]);
  const createdBy = row.createdById ? await repo.userName(db, row.createdById) : null;
  return { ...toStaffOrder(row, items, fields, queue, clock.now()), createdBy };
}

/** Short lines for a history list. */
export async function summaries(db: Db, rows: repo.OrderRow[], clock: Clock): Promise<OrderSummary[]> {
  const { items } = await repo.itemsAndFields(
    db,
    rows.map((r) => r.id),
  );
  const now = clock.now();
  return rows.map((r) => ({
    id: r.id,
    invoiceNumber: r.invoiceNumber,
    businessDay: r.businessDay,
    status: r.status,
    etaAt: r.etaAt.toISOString(),
    late: isLate(r, now),
    createdAt: r.createdAt.toISOString(),
    outAt: r.outAt ? r.outAt.toISOString() : null,
    itemCount: items.filter((i) => i.orderId === r.id).reduce((n, i) => n + i.quantity, 0),
    customerName: r.customerName,
  }));
}

export async function createOrder(
  db: Db,
  restaurantId: string,
  userId: string,
  input: CreateOrderInput,
  clock: Clock,
) {
  const now = clock.now();
  const { today } = currentDays(clock);

  // Custom fields must belong to this restaurant; required active ones must be filled.
  const fieldRows = await repo.restaurantFields(db, restaurantId);
  const fieldsById = new Map(fieldRows.map((f) => [f.id, f]));
  const values = input.fields.filter((v) => v.value !== "");
  if (values.some((v) => !fieldsById.get(v.fieldId)?.active)) throw invalid("Unknown custom field");
  const missing = fieldRows.find(
    (f) => f.active && f.required && !values.some((v) => v.fieldId === f.id),
  );
  if (missing) throw invalid(`"${missing.label}" is required`);

  // Menu items must belong to this restaurant.
  const menuIds = [...new Set(input.items.flatMap((i) => (i.menuItemId ? [i.menuItemId] : [])))];
  if (menuIds.length > 0 && (await repo.countOwnMenuItems(db, restaurantId, menuIds)) !== menuIds.length) {
    throw invalid("Unknown menu item");
  }

  if (await repo.invoiceExists(db, restaurantId, today, input.invoiceNumber)) throw duplicateInvoice();

  const id = randomUUID();
  try {
    await repo.insertOrder(
      db,
      {
        id,
        organizationId: restaurantId,
        invoiceNumber: input.invoiceNumber,
        businessDay: today,
        status: "preparing",
        etaMode: input.eta.mode,
        etaAt: computeEtaAt(input.eta, now, clock.timeZone),
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        address: input.address,
        notes: input.notes,
        createdById: userId,
        createdAt: now,
        updatedAt: now,
      },
      input.items.map((item, position) => ({
        id: randomUUID(),
        orderId: id,
        menuItemId: item.menuItemId ?? null,
        name: item.name,
        quantity: item.quantity,
        position,
      })),
      values.map((v, position) => {
        const field = fieldsById.get(v.fieldId)!;
        return {
          id: randomUUID(),
          orderId: id,
          fieldId: field.id,
          label: field.label,
          public: field.public,
          value: v.value,
          position,
        };
      }),
    );
  } catch (error) {
    // Two requests racing for the same invoice number.
    if (isDuplicateKey(error)) throw duplicateInvoice();
    throw error;
  }
  return getOrder(db, restaurantId, id, clock);
}

export async function updateStatus(
  db: Db,
  restaurantId: string,
  orderId: string,
  status: OrderStatus,
  clock: Clock,
) {
  const row = await requireOrder(db, restaurantId, orderId);
  if (!canTransition(row.status, status)) {
    throw conflict(`Cannot change an order from ${row.status} to ${status}`);
  }
  const now = clock.now();
  const updated = await repo.updateOrder(db, row.id, row.status, {
    status,
    updatedAt: now,
    ...(status === "out_for_delivery" ? { outAt: now } : {}),
    ...(status === "delivered" ? { deliveredAt: now } : {}),
    ...(status === "cancelled" ? { cancelledAt: now } : {}),
  });
  if (!updated) throw conflict("Order status changed. Refresh and try again.");
  return getOrder(db, restaurantId, orderId, clock);
}

export async function updateEta(
  db: Db,
  restaurantId: string,
  orderId: string,
  eta: EtaInput,
  clock: Clock,
) {
  const row = await requireOrder(db, restaurantId, orderId);
  if (row.status !== "preparing") throw conflict("The ETA can only change while preparing");
  const now = clock.now();
  const updated = await repo.updateOrder(db, row.id, row.status, {
    etaMode: eta.mode,
    etaAt: computeEtaAt(eta, now, clock.timeZone),
    updatedAt: now,
  });
  if (!updated) throw conflict("The ETA can only change while preparing");
  return getOrder(db, restaurantId, orderId, clock);
}

/** The public view of an order: today's, or yesterday's while still active. */
export async function findPublicOrder(
  db: Db,
  restaurant: PublicRestaurant & { id: string },
  invoiceNumber: string,
  clock: Clock,
): Promise<{ id: string; order: PublicOrder } | null> {
  const queue = await queueOf(db, restaurant.id, clock);
  const { today } = currentDays(clock);
  const matches = queue.filter((o) => o.invoiceNumber === invoiceNumber);
  const row = matches.find((o) => o.businessDay === today) ?? matches[0];
  if (!row) return null;
  return { id: row.id, order: await publicOrderView(db, restaurant, row, queue, clock) };
}

export async function getSavedOrderView(
  db: Db,
  restaurant: PublicRestaurant & { id: string },
  orderId: string,
  clock: Clock,
): Promise<PublicOrder> {
  const queue = await queueOf(db, restaurant.id, clock);
  const row = queue.find((item) => item.id === orderId) ?? await requireOrder(db, restaurant.id, orderId);
  return publicOrderView(db, restaurant, row, queue, clock);
}

async function publicOrderView(
  db: Db,
  restaurant: PublicRestaurant,
  row: repo.OrderRow,
  queue: repo.OrderRow[],
  clock: Clock,
) {
  const { items, fields } = await repo.itemsAndFields(db, [row.id]);
  return toPublicOrder(restaurant, row, items, fields, queue, clock.now());
}
