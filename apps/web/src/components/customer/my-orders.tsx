"use client";

import { isLate, type OrderStatus, type SavedOrder } from "@dawry/shared";
import { ChevronLeft, CircleDot, History, Store, Ticket } from "lucide-react";
import Link from "next/link";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ListToolbar, NoMatches, ResultCount, SearchField, SortHeader } from "@/components/ui/list-toolbar";
import { formatDay, formatTime } from "@/lib/format";
import { matchesSearch, useParam, useSort } from "@/lib/list";
import { useLive, useNow } from "@/lib/live";
import { orderPath } from "@/lib/routes";
import { cn } from "@/lib/utils";

const ACTIVE = new Set<OrderStatus>(["preparing", "out_for_delivery"]);
const FILTERS = ["all", "delivered", "cancelled"] as const;
type Filter = (typeof FILTERS)[number];
const SORTS = ["date", "restaurant"] as const;

/** The customer's saved orders: the ones still on their way, or the history. */
export function MyOrders({
  initial,
  renderedAt,
  scope,
}: {
  initial: SavedOrder[];
  renderedAt: string;
  scope: "active" | "history";
}) {
  const t = useTranslations("me");
  const { data } = useLive("/api/me/orders", initial, "/api/me/events");
  const now = useNow(15_000, renderedAt);
  const orders = data.filter((o) => ACTIVE.has(o.status) === (scope === "active"));

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-14 text-center">
        {scope === "active" ? (
          <Ticket aria-hidden className="text-muted-foreground size-8" />
        ) : (
          <History aria-hidden className="text-muted-foreground size-8" />
        )}
        <p className="font-medium">{scope === "active" ? t("noActive") : t("noHistory")}</p>
        <p className="text-muted-foreground max-w-xs text-sm">{t("empty")}</p>
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }), "mt-1")}>
          {t("findRestaurant")}
        </Link>
      </div>
    );
  }

  if (scope === "active") {
    return (
      <ul className="bg-surface divide-y overflow-hidden rounded-xl border">
        {orders
          .sort((a, b) => a.etaAt.localeCompare(b.etaAt))
          .map((o) => (
            <OrderLine key={`${o.slug}/${o.businessDay}/${o.invoiceNumber}`} order={o} now={now} />
          ))}
      </ul>
    );
  }
  return <History_ orders={orders} now={now} />;
}

function History_({ orders, now }: { orders: SavedOrder[]; now: Date }) {
  const t = useTranslations("me");
  const tl = useTranslations("list");
  const to = useTranslations("order");
  const [query, setQuery] = useParam("q", "");
  const [filter, setFilter] = useParam<Filter>("show", "all", FILTERS);
  const [place, setPlace] = useParam("place", "all");
  const sorting = useSort(SORTS, "date", "desc");
  const places = [...new Map(orders.map((o) => [o.slug, o.restaurantName])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const visible = orders
    .filter((o) => filter === "all" || o.status === filter)
    .filter((o) => place === "all" || o.slug === place)
    .filter((o) => matchesSearch(query, o.restaurantName, o.invoiceNumber))
    .sort(
      (a, b) =>
        sorting.sign *
        (sorting.column === "restaurant"
          ? a.restaurantName.localeCompare(b.restaurantName)
          : a.businessDay.localeCompare(b.businessDay) || a.savedAt.localeCompare(b.savedAt)),
    );
  const reset = () => {
    setQuery("");
    setFilter("all");
    setPlace("all");
  };

  return (
    <div className="flex flex-col gap-4">
      <ListToolbar
        search={<SearchField value={query} onChange={setQuery} placeholder={t("searchOrders")} />}
        filters={[
          {
            key: "show",
            label: tl("status"),
            icon: CircleDot,
            value: filter,
            fallback: "all",
            onChange: (v) => setFilter(v as Filter),
            options: [
              { value: "all", label: tl("all"), count: orders.length },
              { value: "delivered", label: to("status.delivered"), count: orders.filter((o) => o.status === "delivered").length },
              { value: "cancelled", label: to("status.cancelled"), count: orders.filter((o) => o.status === "cancelled").length },
            ],
          },
          {
            key: "place",
            label: t("restaurant"),
            icon: Store,
            value: place,
            fallback: "all",
            onChange: setPlace,
            options: [
              { value: "all", label: tl("all"), count: orders.length },
              ...places.map(([slug, name]) => ({ value: slug, label: name, count: orders.filter((o) => o.slug === slug).length })),
            ],
          },
        ]}
        onReset={reset}
        count={<ResultCount shown={visible.length} total={orders.length} />}
      />
      {visible.length === 0 ? (
        <div className="bg-surface rounded-xl border">
          <NoMatches onClear={reset} />
        </div>
      ) : (
        <div className="bg-surface overflow-hidden rounded-xl border">
          <div className="text-muted-foreground bg-subtle grid grid-cols-[4.5rem_1fr_auto] items-center gap-x-4 border-b px-4 py-2 text-xs font-medium">
            <span />
            <span className="flex items-center gap-4">
              <SortHeader label={t("sort.restaurant")} column="restaurant" sorting={sorting} />
              <SortHeader label={t("sort.date")} column="date" sorting={sorting} />
            </span>
            <span />
          </div>
          <ul className="divide-y">
            {visible.map((o) => (
              <OrderLine key={`${o.slug}/${o.businessDay}/${o.invoiceNumber}`} order={o} now={now} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** One saved order as a board row: number, place, time, state. */
function OrderLine({ order, now }: { order: SavedOrder; now: Date }) {
  const to = useTranslations("order");
  const locale = useLocale();
  const timeZone = useTimeZone();
  const late = isLate({ status: order.status, etaAt: new Date(order.etaAt) }, now);
  const finished = !ACTIVE.has(order.status);

  return (
    <li>
      <Link
        href={orderPath(order.slug, order.invoiceNumber, order.businessDay)}
        className="group hover:bg-subtle grid grid-cols-[4.5rem_1fr_auto] items-center gap-x-4 px-4 py-3.5 transition-colors focus-visible:-outline-offset-2"
      >
        <span className={cn("figure text-lg font-semibold", finished && "text-muted-foreground")} dir="ltr">
          #{order.invoiceNumber}
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate font-medium">{order.restaurantName}</span>
          <span className={cn("text-xs", late ? "text-late font-medium" : "text-muted-foreground")}>
            {order.status === "preparing"
              ? late
                ? to("lateShort")
                : to("eta.at", { time: formatTime(order.etaAt, locale, timeZone) })
              : formatDay(order.businessDay, locale)}
          </span>
        </span>
        <span className="flex items-center gap-2">
          <Badge variant={late ? "late" : order.status}>{late ? to("lateShort") : to(`status.${order.status}`)}</Badge>
          <ChevronLeft aria-hidden className="text-muted-foreground size-4 ltr:rotate-180 max-sm:hidden" />
        </span>
      </Link>
    </li>
  );
}
