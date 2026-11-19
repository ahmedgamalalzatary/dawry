"use client";

import { isLate, type PublicOrder } from "@dawry/shared";
import { useTranslations } from "next-intl";
import { useLive, useNow } from "@/lib/live";
import { OrderStatusView } from "./order-status-view";

export function LiveOrder({ initial, signedIn }: { initial: PublicOrder; signedIn: boolean }) {
  const t = useTranslations("order");
  const slug = initial.restaurant.slug;
  const { data } = useLive(
    `/api/public/r/${encodeURIComponent(slug)}/orders/${encodeURIComponent(initial.invoiceNumber)}`,
    initial,
    `/api/public/r/${encodeURIComponent(slug)}/events`,
  );
  const now = useNow();
  // Lateness follows the ticking clock, not just the last fetch.
  const order = { ...data, late: isLate({ status: data.status, etaAt: new Date(data.etaAt) }, now) };

  return (
    <div className="flex flex-col gap-3">
      <OrderStatusView order={order} now={now} />
      <p className="text-muted-foreground text-center text-xs">
        {t("live")}
        {signedIn ? ` · ${t("saved")}` : ""}
      </p>
    </div>
  );
}
