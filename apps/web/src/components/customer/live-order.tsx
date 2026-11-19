"use client";

import { isLate, type PublicOrder } from "@dawry/shared";
import { BookmarkCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useLive, useNow } from "@/lib/live";
import { OrderStatusView } from "./order-status-view";

export function LiveOrder({
  initial,
  orderUrl,
  signedIn,
  renderedAt,
}: {
  initial: PublicOrder;
  orderUrl: string;
  signedIn: boolean;
  renderedAt: string;
}) {
  const t = useTranslations("order");
  const slug = initial.restaurant.slug;
  const { data } = useLive(
    orderUrl,
    initial,
    `/api/public/r/${encodeURIComponent(slug)}/events`,
  );
  const now = useNow(1000, renderedAt);
  // Lateness follows the ticking clock, not just the last fetch.
  const order = { ...data, late: isLate({ status: data.status, etaAt: new Date(data.etaAt) }, now) };
  const finished = order.status === "delivered" || order.status === "cancelled";

  return (
    <OrderStatusView
      order={order}
      now={now}
      footer={
        <span className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {finished ? null : (
            <span className="text-success inline-flex items-center gap-1.5 font-medium">
              <span className="live-dot" aria-hidden />
              {t("live")}
            </span>
          )}
          {signedIn ? (
            <span className="inline-flex items-center gap-1">
              <BookmarkCheck aria-hidden className="size-3.5" />
              {t("saved")}
            </span>
          ) : null}
        </span>
      }
    />
  );
}
