"use client";

import type { OrderSummary } from "@dawry/shared";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { formatDay, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Short order lines (history lists); each opens the order when `hrefFor` is given. */
export function OrderSummaryList({
  orders,
  empty,
  hrefFor,
}: {
  orders: OrderSummary[];
  empty: string;
  hrefFor?: (order: OrderSummary) => string;
}) {
  const t = useTranslations("orderPage");
  const to = useTranslations("order");
  const td = useTranslations("dashboard");
  const locale = useLocale();
  const timeZone = useTimeZone();

  if (orders.length === 0) return <p className="text-muted-foreground px-5 py-10 text-center text-sm">{empty}</p>;

  return (
    <ul className="divide-y">
      {orders.map((o) => {
        const finished = o.status === "delivered" || o.status === "cancelled";
        const invoice = (
          <span className="figure text-lg font-semibold" dir="ltr">
            <span className="text-muted-foreground me-0.5 text-sm font-normal">#</span>
            {o.invoiceNumber}
          </span>
        );
        return (
          <li
            key={o.id}
            className={cn(
              "relative grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-x-4 px-5 py-3",
              hrefFor && "hover:bg-subtle transition-colors",
            )}
          >
            {hrefFor ? (
              <Link
                href={hrefFor(o)}
                aria-label={td("invoiceLabel", { number: o.invoiceNumber })}
                className={cn("row-link", finished && "text-muted-foreground")}
              >
                {invoice}
              </Link>
            ) : (
              invoice
            )}
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-sm">
                {formatDay(o.businessDay, locale)} · <span className="figure">{formatTime(o.createdAt, locale, timeZone)}</span>
              </span>
              <span className="text-muted-foreground truncate text-xs">
                {t("itemCount", { n: o.itemCount })}
                {o.customerName ? ` · ${o.customerName}` : ""}
              </span>
            </span>
            <span className="flex items-center gap-2">
              <Badge variant={o.late ? "late" : o.status}>{o.late ? td("late") : to(`status.${o.status}`)}</Badge>
              {hrefFor ? <ChevronLeft aria-hidden className="text-muted-foreground size-4 ltr:rotate-180 max-sm:hidden" /> : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
