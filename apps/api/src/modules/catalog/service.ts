import { randomUUID } from "node:crypto";
import type { customFieldSchema, MenuItemDetail, menuItemSchema } from "@dawry/shared";
import type { z } from "zod";
import type { Db } from "../../db/client";
import { notFound } from "../../http/errors";
import { toField, toMenuItem } from "./helpers";
import type { Clock } from "../orders/helpers";
import { rangeOf } from "../reports/service";
import * as repo from "./repo";

type MenuInput = z.output<typeof menuItemSchema>;
type FieldInput = z.output<typeof customFieldSchema>;

export async function listMenu(db: Db, restaurantId: string) {
  return (await repo.listMenu(db, restaurantId)).map(toMenuItem);
}

export async function createMenuItem(db: Db, restaurantId: string, input: MenuInput) {
  const id = randomUUID();
  await repo.insertMenuItem(db, { id, organizationId: restaurantId, ...input });
  return { id, ...input };
}

export async function updateMenuItem(
  db: Db,
  restaurantId: string,
  id: string,
  input: Partial<MenuInput>,
) {
  const existing = await repo.findMenuItem(db, restaurantId, id);
  if (!existing) throw notFound("Menu item not found");
  if (Object.keys(input).length > 0) await repo.updateMenuItem(db, id, input);
  return toMenuItem({ ...existing, ...input });
}

export async function listFields(db: Db, restaurantId: string) {
  return (await repo.listFields(db, restaurantId)).map(toField);
}

export async function createField(db: Db, restaurantId: string, input: FieldInput) {
  const id = randomUUID();
  await repo.insertField(db, { id, organizationId: restaurantId, ...input });
  return { id, ...input };
}

export async function updateField(
  db: Db,
  restaurantId: string,
  id: string,
  input: Partial<FieldInput>,
) {
  const existing = await repo.findField(db, restaurantId, id);
  if (!existing) throw notFound("Custom field not found");
  if (Object.keys(input).length > 0) await repo.updateField(db, id, input);
  return toField({ ...existing, ...input });
}

/** A menu item and how it sold over the last 30 days (cancelled orders left out). */
export async function menuItemDetail(db: Db, restaurantId: string, id: string, clock: Clock): Promise<MenuItemDetail> {
  const row = await repo.findMenuItem(db, restaurantId, id);
  if (!row) throw notFound("Menu item not found");
  const range = rangeOf(clock, 30);
  const sales = (await repo.itemSales(db, restaurantId, id, range.from)).filter((s) => s.status !== "cancelled");
  const perDay = new Map<string, number>();
  for (const s of sales) perDay.set(s.businessDay, (perDay.get(s.businessDay) ?? 0) + s.quantity);
  const last = sales.reduce<Date | null>((latest, s) => (!latest || s.createdAt > latest ? s.createdAt : latest), null);
  return {
    item: toMenuItem(row),
    quantity: sales.reduce((n, s) => n + s.quantity, 0),
    orders: new Set(sales.map((s) => s.orderId)).size,
    lastOrderedAt: last ? last.toISOString() : null,
    days: [...perDay.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([day, quantity]) => ({ day, quantity })),
  };
}
