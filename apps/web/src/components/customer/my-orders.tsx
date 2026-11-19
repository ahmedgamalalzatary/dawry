"use client";

import { isLate, type SavedOrder } from "@dawry/shared";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { formatTime } from "@/lib/format";
import { useLive, useNow } from "@/lib/live";
import { orderPath } from "@/lib/routes";

const ACTIVE = new Set(["preparing", "out_for_delivery"]);

export function MyOrders({ initial, renderedAt }: { initial: SavedOrder[]; renderedAt: string }) {
  const t = useTranslations("me");
  const to = useTranslations("order");
  const locale = useLocale();
  const { data } = useLive("/api/me/orders", initial, "/api/me/events");
  const now = useNow(15_000, renderedAt);

  if (data.length === 0) return <p className="text-muted-foreground">{t("empty")}</p>;

  const active = data.filter((o) => ACTIVE.has(o.status));
  const past = data.filter((o) => !ACTIVE.has(o.status));

  const list = (orders: SavedOrder[]) => (
    <ul className="flex flex-col gap-2">
      {orders.map((o) => (
        <li key={`${o.slug}/${o.businessDay}/${o.invoiceNumber}`}>
          <Link
            href={orderPath(o.slug, o.invoiceNumber)}
            className="hover:bg-muted flex items-center justify-between gap-3 rounded-lg border p-3"
          >
            <span className="flex flex-col">
              <span className="font-medium">{o.restaurantName}</span>
              <span className="text-muted-foreground text-sm">
                {to("invoice", { number: o.invoiceNumber })} · {o.businessDay}
              </span>
            </span>
            <span className="flex flex-col items-end gap-1">
              <Badge variant={ACTIVE.has(o.status) ? "default" : "secondary"}>
                {to(`status.${o.status}`)}
              </Badge>
              {o.status === "preparing" ? (
                <span className="text-xs">
                  {isLate({ status: o.status, etaAt: new Date(o.etaAt) }, now)
                    ? to("late")
                    : to("eta.at", { time: formatTime(o.etaAt, locale) })}
                </span>
              ) : null}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="flex flex-col gap-6">
      {active.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">{t("active")}</h2>
          {list(active)}
        </section>
      ) : null}
      {past.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">{t("past")}</h2>
          {list(past)}
        </section>
      ) : null}
    </div>
  );
}
