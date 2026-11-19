"use client";

import { isLate, type OrderStatus, type SavedOrder } from "@dawry/shared";
import { Clock, Ticket, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatTime } from "@/lib/format";
import { useLive, useNow } from "@/lib/live";
import { orderPath } from "@/lib/routes";
import { cn } from "@/lib/utils";

const ACTIVE = new Set<OrderStatus>(["preparing", "out_for_delivery"]);

const STUB_TONE: Record<OrderStatus, string> = {
  preparing: "bg-brand text-brand-foreground",
  out_for_delivery: "bg-teal text-white dark:text-[#0b1322]",
  delivered: "bg-secondary text-secondary-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

export function MyOrders({ initial, renderedAt }: { initial: SavedOrder[]; renderedAt: string }) {
  const t = useTranslations("me");
  const th = useTranslations("home");
  const { data } = useLive("/api/me/orders", initial, "/api/me/events");
  const now = useNow(15_000, renderedAt);

  if (data.length === 0) {
    return (
      <div className="bg-card flex flex-col items-center gap-4 rounded-3xl border border-dashed px-6 py-12 text-center">
        <span className="bg-brand-soft text-foreground flex size-14 items-center justify-center rounded-full">
          <Ticket aria-hidden className="size-7" />
        </span>
        <p className="text-muted-foreground max-w-xs text-sm text-pretty">{t("empty")}</p>
        <Link href="/" className={buttonVariants({ variant: "brand" })}>
          {th("title")}
        </Link>
      </div>
    );
  }

  const active = data.filter((o) => ACTIVE.has(o.status));
  const past = data.filter((o) => !ACTIVE.has(o.status));

  return (
    <div className="flex flex-col gap-8">
      {active.length > 0 ? (
        <OrderGroup title={t("active")} count={active.length} orders={active} now={now} />
      ) : null}
      {past.length > 0 ? (
        <OrderGroup title={t("past")} count={past.length} orders={past} now={now} />
      ) : null}
    </div>
  );
}

function OrderGroup({
  title,
  count,
  orders,
  now,
}: {
  title: string;
  count: number;
  orders: SavedOrder[];
  now: Date;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        {title}
        <span className="bg-secondary text-muted-foreground rounded-full px-2 py-0.5 text-xs tabular-nums">
          {count}
        </span>
      </h2>
      <ul className="flex flex-col gap-3">
        {orders.map((o) => (
          <OrderStub key={`${o.slug}/${o.businessDay}/${o.invoiceNumber}`} order={o} now={now} />
        ))}
      </ul>
    </section>
  );
}

function OrderStub({ order, now }: { order: SavedOrder; now: Date }) {
  const to = useTranslations("order");
  const locale = useLocale();
  const late = isLate({ status: order.status, etaAt: new Date(order.etaAt) }, now);
  const finished = !ACTIVE.has(order.status);

  return (
    <li className="ticket-shadow">
      <Link
        href={orderPath(order.slug, order.invoiceNumber)}
        className={cn(
          "ticket-h group focus-visible:ring-ring/60 flex min-h-22 rounded-2xl outline-none focus-visible:ring-3",
          finished && "opacity-80 hover:opacity-100",
        )}
      >
        <span
          className={cn(
            "flex w-[5.5rem] shrink-0 flex-col items-center justify-center gap-0.5 rounded-s-2xl px-2",
            STUB_TONE[order.status],
          )}
        >
          <span className="text-[0.65rem] font-semibold opacity-70">#</span>
          <span className="max-w-full truncate text-2xl leading-none font-bold tabular-nums" dir="ltr">
            {order.invoiceNumber}
          </span>
        </span>
        <span className="bg-card group-hover:bg-muted/40 flex min-w-0 flex-1 items-center gap-3 rounded-e-2xl border-s-2 border-dashed border-black/10 px-4 py-3 transition-colors">
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="truncate font-semibold">{order.restaurantName}</span>
            {order.status === "preparing" ? (
              <span
                className={cn(
                  "flex items-center gap-1.5 text-sm",
                  late ? "text-chili font-medium" : "text-muted-foreground",
                )}
              >
                {late ? (
                  <TriangleAlert aria-hidden className="size-3.5" />
                ) : (
                  <Clock aria-hidden className="size-3.5" />
                )}
                {late ? to("late") : to("eta.at", { time: formatTime(order.etaAt, locale) })}
              </span>
            ) : (
              <span className="text-muted-foreground text-sm tabular-nums" dir="ltr">
                {order.businessDay}
              </span>
            )}
          </span>
          <Badge variant={order.status}>{to(`status.${order.status}`)}</Badge>
        </span>
      </Link>
    </li>
  );
}
