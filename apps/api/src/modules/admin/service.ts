import { randomUUID } from "node:crypto";
import {
  businessDay,
  createStaffSchema,
  type AdminRestaurant,
  type AdminRestaurantDetail,
  type createRestaurantSchema,
  type PlatformReport,
  type PlatformStats,
  type ReportRange,
} from "@dawry/shared";
import type { z } from "zod";
import type { Auth } from "../../auth";
import type { Db } from "../../db/client";
import { conflict, notFound } from "../../http/errors";
import { createAccount, deleteUser, setPassword } from "../accounts/service";
import { isDuplicateKey, type Clock } from "../orders/helpers";
import {
  byDay,
  byEtaMode,
  byHour,
  byWeekday,
  groupBy,
  topItems,
  totalsOf,
} from "../reports/helpers";
import * as reportRepo from "../reports/repo";
import { rangeOf, report } from "../reports/service";
import * as repo from "./repo";

const slugTaken = () => conflict("This restaurant link is already taken");

export async function createRestaurant(
  auth: Auth,
  db: Db,
  input: z.output<typeof createRestaurantSchema>,
) {
  if (await repo.slugExists(db, input.slug)) throw slugTaken();

  const ownerId = await createAccount(auth, db, {
    name: input.ownerName,
    username: input.ownerPhone,
    password: input.ownerPassword,
  });

  const id = randomUUID();
  try {
    await repo.insertRestaurant(db, { id, name: input.name, slug: input.slug, ownerId });
  } catch (error) {
    await deleteUser(db, ownerId); // no orphan owner accounts
    if (isDuplicateKey(error)) throw slugTaken();
    throw error;
  }
  return { id, name: input.name, slug: input.slug, active: true };
}

export async function listRestaurants(db: Db, clock: Clock): Promise<AdminRestaurant[]> {
  const today = businessDay(clock.now(), clock.timeZone);
  const [restaurants, members, todayCounts] = await Promise.all([
    repo.listRestaurants(db),
    repo.listMembers(db),
    repo.orderCountsForDay(db, today),
  ]);

  return restaurants.map((r) => {
    const owner = members.find((m) => m.organizationId === r.id && m.role === "owner");
    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      active: r.active,
      owner: owner ? { id: owner.userId, name: owner.name, phone: owner.username ?? "" } : null,
      staffCount: members.filter((m) => m.organizationId === r.id && m.role === "member").length,
      ordersToday: todayCounts.find((c) => c.organizationId === r.id)?.n ?? 0,
      createdAt: r.createdAt.toISOString(),
    };
  });
}

export async function setActive(db: Db, restaurantId: string, active: boolean) {
  if (!(await repo.setActive(db, restaurantId, active))) throw notFound("Restaurant not found");
}

export async function resetPassword(auth: Auth, db: Db, userId: string, password: string) {
  if (!(await setPassword(auth, db, userId, password))) throw notFound("User not found");
}

export async function stats(db: Db, clock: Clock): Promise<PlatformStats> {
  const now = clock.now();
  const today = businessDay(now, clock.timeZone);
  const from = businessDay(new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000), clock.timeZone);
  return repo.counts(db, today, from);
}

/** Super-admin accounts are created from the CLI only (src/cli/create-admin.ts). */
export async function createSuperAdmin(
  auth: Auth,
  db: Db,
  input: { name: string; username: string; password: string },
) {
  // Same username rules as staff: contains a letter, never a phone number.
  const valid = createStaffSchema.parse(input);
  return createAccount(auth, db, { ...valid, role: "admin" });
}

export async function restaurantDetail(
  db: Db,
  restaurantId: string,
  clock: Clock,
  days: ReportRange,
): Promise<AdminRestaurantDetail> {
  const row = await repo.findRestaurant(db, restaurantId);
  if (!row) throw notFound("Restaurant not found");
  const today = businessDay(clock.now(), clock.timeZone);
  const [members, todayCounts, restaurantReport] = await Promise.all([
    repo.membersOf(db, restaurantId),
    repo.orderCountsForDay(db, today),
    report(db, restaurantId, clock, days),
  ]);
  const owner = members.find((m) => m.role === "owner");
  const staff = members.filter((m) => m.role === "member");
  return {
    restaurant: {
      id: row.id,
      name: row.name,
      slug: row.slug,
      active: row.active,
      phone: row.phone,
      logoUrl: row.logoUrl,
      owner: owner ? { id: owner.userId, name: owner.name, phone: owner.username ?? "" } : null,
      staffCount: staff.length,
      ordersToday: todayCounts.find((c) => c.organizationId === row.id)?.n ?? 0,
      createdAt: row.createdAt.toISOString(),
    },
    staff: staff
      .map((m) => ({ id: m.userId, name: m.name, username: m.username ?? "", createdAt: m.createdAt.toISOString() }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    report: restaurantReport,
  };
}

/** New customers and restaurants that joined within a period of business days. */
export function growthBetween(db: Db, period: { from: string; to: string }) {
  return repo.growth(db, new Date(`${period.from}T00:00:00Z`));
}

export async function platformReport(db: Db, clock: Clock, days: ReportRange): Promise<PlatformReport> {
  const now = clock.now();
  const range = rangeOf(clock, days);
  const [rows, restaurants, growth] = await Promise.all([
    reportRepo.ordersSince(db, null, range.from),
    repo.listRestaurants(db),
    repo.growth(db, new Date(now.getTime() - days * 24 * 60 * 60 * 1000)),
  ]);
  const items = await reportRepo.itemsOf(
    db,
    rows.map((r) => r.id),
  );
  const perRestaurant = groupBy(rows, (o) => o.organizationId);

  return {
    range,
    totals: {
      ...totalsOf(rows, now),
      ...growth,
      activeRestaurants: restaurants.filter((r) => r.active).length,
    },
    days: byDay(rows, now),
    hours: byHour(rows, clock.timeZone),
    weekdays: byWeekday(rows),
    restaurants: restaurants
      .map((r) => {
        const t = totalsOf(perRestaurant.get(r.id) ?? [], now);
        return {
          id: r.id,
          name: r.name,
          slug: r.slug,
          active: r.active,
          orders: t.orders,
          delivered: t.delivered,
          cancelled: t.cancelled,
          onTimeRate: t.onTimeRate,
          avgPrepMinutes: t.avgPrepMinutes,
        };
      })
      .sort((a, b) => b.orders - a.orders || a.name.localeCompare(b.name)),
    items: topItems(items),
    etaModes: byEtaMode(rows),
  };
}
