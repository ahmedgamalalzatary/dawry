"use client";

import { isLate, type CustomField, type MenuItem, type OrderStatus, type StaffOrder } from "@dawry/shared";
import { CalendarDays, ClipboardList, Plus, TriangleAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { PageBody, PageHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Dialog, SheetContent } from "@/components/ui/dialog";
import { ListToolbar, NoMatches, ResultCount, SearchField, SortHeader, type FilterDef } from "@/components/ui/list-toolbar";
import { formatDay, newlyLate } from "@/lib/format";
import { matchesSearch, useParam, useSort } from "@/lib/list";
import { useLive, useNow } from "@/lib/live";
import { cn } from "@/lib/utils";
import { NewOrderForm } from "./new-order-form";
import { OrderRow, ROW_GRID } from "./order-row";

const VIEWS = ["active", "preparing", "out_for_delivery", "finished"] as const;
type View = (typeof VIEWS)[number];
const SORTS = ["eta", "created", "invoice"] as const;
type Sort = (typeof SORTS)[number];
const LATENESS = ["all", "late", "ontime"] as const;
type Lateness = (typeof LATENESS)[number];

const IN_VIEW: Record<View, (s: OrderStatus) => boolean> = {
  active: (s) => s === "preparing" || s === "out_for_delivery",
  preparing: (s) => s === "preparing",
  out_for_delivery: (s) => s === "out_for_delivery",
  finished: (s) => s === "delivered" || s === "cancelled",
};

/** The signal each tab answers to (its underline and dot). */
const VIEW_SIGNAL: Record<View, string> = {
  active: "bg-foreground",
  preparing: "bg-preparing",
  out_for_delivery: "bg-transit",
  finished: "bg-go",
};

/** Ascending comparisons; the chosen direction flips them. */
const SORTERS: Record<Sort, (a: StaffOrder, b: StaffOrder) => number> = {
  eta: (a, b) => a.etaAt.localeCompare(b.etaAt) || a.createdAt.localeCompare(b.createdAt),
  created: (a, b) => a.createdAt.localeCompare(b.createdAt),
  invoice: (a, b) => a.invoiceNumber.localeCompare(b.invoiceNumber, undefined, { numeric: true }),
};

const dayBefore = (day: string) => new Date(Date.parse(`${day}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

export function OrdersBoard({
  initial,
  menu,
  fields,
  slug,
  renderedAt,
  day,
  today,
}: {
  initial: StaffOrder[];
  menu: MenuItem[];
  fields: CustomField[];
  slug: string;
  renderedAt: string;
  /** The business day shown; `today` means the live queue. */
  day: string;
  today: string;
}) {
  const t = useTranslations("dashboard");
  const tl = useTranslations("list");
  const locale = useLocale();
  const live = day === today;
  const { data, setData, refresh } = useLive(
    live ? "/api/restaurant/orders" : `/api/restaurant/orders?day=${day}`,
    initial,
    "/api/restaurant/events",
  );
  const now = useNow(1000, renderedAt);
  const [view, setView] = useParam<View>("view", live ? "active" : "finished", VIEWS);
  const [query, setQuery] = useParam("q", "");
  const sorting = useSort(SORTS, "eta");
  const [lateness, setLateness] = useParam<Lateness>("late", "all", LATENESS);
  const [, setDay] = useParam("day", today);
  const [creating, setCreating] = useState(false);

  // Lateness follows the ticking clock.
  const orders = useMemo(
    () => data.map((o) => ({ ...o, late: isLate({ status: o.status, etaAt: new Date(o.etaAt) }, now) })),
    [data, now],
  );

  // One toast per order when it becomes late (live board only).
  const previous = useRef<StaffOrder[] | null>(null);
  useEffect(() => {
    if (live) for (const o of newlyLate(previous.current, orders)) toast.warning(t("lateToast", { invoice: o.invoiceNumber }));
    previous.current = orders;
  }, [orders, t, live]);

  const replace = (updated: StaffOrder) =>
    setData((current) => current.map((o) => (o.id === updated.id ? updated : o)));

  const counts = Object.fromEntries(VIEWS.map((v) => [v, orders.filter((o) => IN_VIEW[v](o.status)).length])) as Record<
    View,
    number
  >;
  const lateCount = orders.filter((o) => o.late).length;

  const inView = orders.filter((o) => IN_VIEW[view](o.status));
  const visible = inView
    .filter((o) => lateness === "all" || (lateness === "late") === o.late)
    .filter((o) =>
      matchesSearch(
        query,
        o.invoiceNumber,
        o.customerName,
        o.customerPhone,
        o.address,
        o.notes,
        ...o.items.map((i) => i.name),
        ...o.fields.map((f) => f.value),
      ),
    )
    .sort((a, b) => sorting.sign * SORTERS[sorting.column](a, b));
  const lateIn = inView.filter((o) => o.late).length;
  const filters: FilterDef[] = [
    {
      key: "late",
      label: t("lateness"),
      icon: TriangleAlert,
      value: lateness,
      fallback: "all",
      onChange: (v) => setLateness(v as Lateness),
      options: [
        { value: "all", label: tl("all"), count: inView.length },
        { value: "late", label: t("lateOnly"), count: lateIn },
        { value: "ontime", label: t("onTimeOnly"), count: inView.length - lateIn },
      ],
    },
    {
      key: "day",
      label: t("date"),
      icon: CalendarDays,
      value: day,
      fallback: today,
      onChange: setDay,
      date: {
        max: today,
        display: (d) => formatDay(d, locale, { weekday: "short", day: "numeric", month: "short", year: "numeric" }),
        shortcuts: [
          { value: today, label: t("today") },
          { value: dayBefore(today), label: t("yesterday") },
        ],
      },
    },
  ];
  const clearFilters = () => {
    setQuery("");
    setLateness("all");
    setDay(today);
  };

  return (
    <>
      <PageHeader
        title={t("ordersTitle")}
        description={
          !live
            ? t("archiveSummary", { total: orders.length })
            : lateCount > 0
              ? t("summaryLate", { active: counts.active, late: lateCount })
              : t("summary", { active: counts.active })
        }
        actions={
          <Button onClick={() => setCreating(true)} className="max-sm:hidden">
            <Plus aria-hidden />
            {t("newOrder")}
          </Button>
        }
      >
        {/* The status rail: one tab per state, its count and its signal underline. */}
        <div
          role="tablist"
          aria-label={t("ordersTitle")}
          className="-mx-4 -mb-px flex overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0"
        >
          {VIEWS.map((v) => {
            const selected = view === v;
            return (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setView(v)}
                className={cn(
                  "group relative flex h-12 shrink-0 cursor-pointer items-center gap-2 px-3.5 text-sm font-medium transition-colors first:ps-0 sm:px-4 sm:first:ps-0",
                  selected ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span aria-hidden className={cn("size-2 rounded-full", VIEW_SIGNAL[v], !selected && "opacity-60")} />
                {t(`views.${v}`)}
                <span
                  className={cn(
                    "figure min-w-6 rounded-md px-1.5 py-0.5 text-center text-xs font-semibold transition-colors",
                    selected ? "bg-foreground text-background" : "bg-muted text-muted-foreground group-hover:text-foreground",
                  )}
                >
                  {counts[v]}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-x-3.5 bottom-0 h-0.5 rounded-full transition-opacity group-first:start-0 sm:inset-x-4",
                    VIEW_SIGNAL[v],
                    selected ? "opacity-100" : "opacity-0",
                  )}
                />
              </button>
            );
          })}
        </div>
      </PageHeader>

      <PageBody className="flex flex-col gap-4 pb-28 sm:pb-8">
        <ListToolbar
          search={<SearchField value={query} onChange={setQuery} placeholder={t("searchOrders")} />}
          filters={filters}
          onReset={clearFilters}
          count={<ResultCount shown={visible.length} total={inView.length} noun={(n) => t("ordersN", { n })} />}
        />

        {inView.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
            <ClipboardList aria-hidden className="text-muted-foreground size-8" />
            <p className="font-medium">{!live ? t("emptyDay") : view === "finished" ? t("emptyFinished") : t("empty")}</p>
            {live && view !== "finished" ? (
              <>
                <p className="text-muted-foreground max-w-xs text-sm">{t("emptyHint")}</p>
                <Button variant="outline" onClick={() => setCreating(true)} className="mt-1">
                  <Plus aria-hidden />
                  {t("newOrder")}
                </Button>
              </>
            ) : null}
          </div>
        ) : (
          <div role="tabpanel" aria-label={t(`views.${view}`)} className="bg-surface overflow-hidden rounded-xl border">
            <div
              className={cn(
                "text-muted-foreground bg-subtle hidden items-center gap-x-4 border-b px-5 py-2 text-xs font-medium md:grid",
                ROW_GRID,
              )}
            >
              <span>
                <SortHeader label={t("cols.invoice")} column="invoice" sorting={sorting} />
              </span>
              <span>
                <SortHeader label={t("cols.eta")} column="eta" sorting={sorting} />
              </span>
              <span>{t("cols.items")}</span>
              <span className="hidden xl:block">{t("cols.customer")}</span>
              <span>{t("cols.status")}</span>
              <span className="w-[12rem] xl:w-[13rem]" />
            </div>
            {visible.length === 0 ? (
              <NoMatches onClear={clearFilters} />
            ) : (
              <ul className="divide-y">
                {visible.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    slug={slug}
                    now={now}
                    onChange={(updated) => {
                      replace(updated);
                      void refresh(); // queue positions of other orders may change
                    }}
                  />
                ))}
              </ul>
            )}
          </div>
        )}
        <span className="sr-only">{tl("rowHint")}</span>
      </PageBody>

      {/* Phones: the primary action sits in the thumb zone. */}
      <div className="bg-background/90 fixed inset-x-0 bottom-0 z-20 border-t p-3 backdrop-blur-lg sm:hidden">
        <Button size="lg" className="w-full" onClick={() => setCreating(true)}>
          <Plus aria-hidden />
          {t("newOrder")}
        </Button>
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <SheetContent title={t("newOrder")} description={t("newOrderHint")}>
          <NewOrderForm
            menu={menu}
            fields={fields}
            onCreated={() => {
              toast.success(t("created"));
              setCreating(false);
              if (live) {
                setView("active");
                void refresh();
              } else {
                setDay(today);
              }
            }}
          />
        </SheetContent>
      </Dialog>
    </>
  );
}
