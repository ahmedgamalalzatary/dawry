import type { PublicOrder, PublicRestaurant } from "@dawry/shared";
import type { Db } from "../../db/client";
import type { Deps } from "../../deps";
import { findPublicOrder } from "../orders/service";
import * as repo from "./repo";

export async function findRestaurant(
  db: Db,
  slug: string,
): Promise<(PublicRestaurant & { id: string }) | null> {
  const row = await repo.findActiveRestaurant(db, slug);
  if (!row) return null;
  return { ...row, logoUrl: row.logoUrl || null, phone: row.phone || null };
}

export async function searchRestaurants(db: Db, query: string): Promise<PublicRestaurant[]> {
  const rows = await repo.searchActiveRestaurants(db, query.trim().slice(0, 60));
  return rows.map((r) => ({ ...r, logoUrl: r.logoUrl || null, phone: r.phone || null }));
}

/** Look up an order; a logged-in viewer gets it saved to their account. */
export async function lookupOrder(
  deps: Deps,
  slug: string,
  invoiceNumber: string,
  viewerId: string | null,
): Promise<PublicOrder | null> {
  const restaurant = await findRestaurant(deps.db, slug);
  if (!restaurant) return null;
  const found = await findPublicOrder(deps.db, restaurant, invoiceNumber, deps);
  if (!found) return null;
  if (viewerId) await repo.saveOrderFor(deps.db, viewerId, found.id);
  return found.order;
}
