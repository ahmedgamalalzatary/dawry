"use client";

import { isLate, type PublicOrder } from "@dawry/shared";
import { useLive, useNow } from "@/lib/live";
import { OrderStatusView } from "./order-status-view";

export function LiveOrder({
  initial,
  orderUrl,
  signedIn,
  favorite,
  renderedAt,
}: {
  initial: PublicOrder;
  orderUrl: string;
  signedIn: boolean;
  /** Whether a signed-in customer has this restaurant saved (null for others). */
  favorite: boolean | null;
  renderedAt: string;
}) {
  const slug = initial.restaurant.slug;
  const { data } = useLive(orderUrl, initial, `/api/public/r/${encodeURIComponent(slug)}/events`);
  const now = useNow(1000, renderedAt);
  // Lateness follows the ticking clock, not just the last fetch.
  const order = { ...data, late: isLate({ status: data.status, etaAt: new Date(data.etaAt) }, now) };
  const finished = order.status === "delivered" || order.status === "cancelled";

  return <OrderStatusView order={order} now={now} live={!finished} saved={signedIn} favorite={favorite} />;
}
