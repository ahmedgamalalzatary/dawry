"use client";

import type { EtaMode, ReportData } from "@dawry/shared";
import {
  CalendarDays,
  CalendarRange,
  CircleDot,
  FileDown,
  FileSpreadsheet,
  SearchX,
  Store,
  Timer,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { useEffect, useMemo, type ReactNode } from "react";
import { PageBody, PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListToolbar, ResultCount, SearchField, type FilterDef } from "@/components/ui/list-toolbar";
import { TabRail } from "@/components/ui/tab-rail";
import { formatDay, formatPercent, formatTime } from "@/lib/format";
import { matchesSearch, useParam, useSort } from "@/lib/list";
import {
  daysBetween,
  DEFAULT_PERIOD,
  downloadCsv,
  groupBy,
  itemStats,
  PERIODS,
  totals,
  type OrderFacts,
  type Period,
  type Totals,
  withFacts,
} from "@/lib/reports";
import { cn } from "@/lib/utils";
import { ReportTable, sortRows, tableCells, type Column, type TableSpec } from "./report-table";

const RESTAURANT_VIEWS = ["orders", "daily", "staff", "items", "hours", "weekdays", "timing"] as const;
const PLATFORM_VIEWS = ["restaurants", "orders", "daily", "items", "hours", "weekdays", "timing"] as const;
type View = (typeof RESTAURANT_VIEWS)[number] | (typeof PLATFORM_VIEWS)[number];

const STATUSES = ["all", "delivered", "open", "cancelled"] as const;
const TIMELINESS = ["all", "late", "onTime"] as const;
const MODES = ["all", "countdown", "clock", "minutes"] as const;
const WEEKDAYS = ["all", "6", "0", "1", "2", "3", "4", "5"] as const; // the week starts on Saturday
const WEEK_ORDER = [6, 0, 1, 2, 3, 4, 5];
const BUCKETS: [number, number | null][] = [
  [0, 10],
  [10, 20],
  [20, 30],
  [30, 45],
  [45, 60],
  [60, null],
];
/** Per-view params that must not leak into the next view. */
const VIEW_PARAMS = ["q", "sort", "dir"];

export interface ReportViewProps {
  data: ReportData;
  scope: "restaurant" | "platform";
  /** Whose report this is: the restaurant's name, or the platform. */
  subject: string;
  /** Links rows to detail pages. */
  links?: { order?: (id: string) => string; person?: (id: string) => string; restaurant?: (id: string) => string };
}

export function ReportView({ data, scope, subject, links = {} }: ReportViewProps) {
  const t = useTranslations("rp");
  const to = useTranslations("order");
  const td = useTranslations("dashboard");
  const locale = useLocale();
  const timeZone = useTimeZone();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const views: readonly View[] = scope === "platform" ? PLATFORM_VIEWS : RESTAURANT_VIEWS;
  const [view] = useParam<View>("view", views[0]!, views);
  const [period] = useParam<Period>("period", DEFAULT_PERIOD, PERIODS);
  const [query, setQuery] = useParam("q", "");
  const [status, setStatus] = useParam("status", "all", STATUSES);
  const [timeliness, setTimeliness] = useParam("late", "all", TIMELINESS);
  const [mode, setMode] = useParam("mode", "all", MODES);
  const [weekday, setWeekday] = useParam("weekday", "all", WEEKDAYS);
  const [person, setPerson] = useParam("person", "all");
  const [place, setPlace] = useParam("place", "all");

  /** Several params in one navigation (setters called back to back would overwrite each other). */
  const setParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(window.location.search);
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  const setView = (v: View) =>
    setParams({ view: v === views[0] ? null : v, ...Object.fromEntries(VIEW_PARAMS.map((k) => [k, null])) });
  const setPeriod = (p: string) =>
    setParams(
      p === "custom"
        ? { period: "custom", from: data.from, to: data.to }
        : { period: p === DEFAULT_PERIOD ? null : p, from: null, to: null },
    );

  // ---- formatting --------------------------------------------------------------
  const fmt = useMemo(
    () => ({
      day: (d: string) => formatDay(d, locale),
      longDay: (d: string) => formatDay(d, locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
      time: (iso: string | null) => (iso ? formatTime(iso, locale, timeZone) : "—"),
      min: (n: number | null) => (n === null ? "—" : t("minutes", { n: Math.round(n) })),
      signed: (n: number | null) =>
        n === null ? "—" : Math.round(n) > 0 ? t("lateBy", { n: Math.round(n) }) : Math.round(n) < 0 ? t("earlyBy", { n: -Math.round(n) }) : "0",
      pct: formatPercent,
      hour: (h: number) => `${String(h).padStart(2, "0")}:00`,
      weekday: (w: number) =>
        new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", { weekday: "long", timeZone: "UTC" }).format(
          new Date(Date.UTC(2026, 10, 15 + w)), // 2026-11-15 is a Sunday
        ),
    }),
    [locale, timeZone, t],
  );

  // ---- data --------------------------------------------------------------------
  const facts = useMemo(() => withFacts(data), [data]);
  const personName = useMemo(() => new Map(data.people.map((p) => [p.id, p.name])), [data.people]);
  const restaurantName = useMemo(() => new Map(data.restaurants.map((r) => [r.id, r.name])), [data.restaurants]);
  const nameOf = (id: string | null) => (id && personName.get(id)) || t("removedAccount");

  const matchesFilters = (o: OrderFacts, skip?: string) =>
    (skip === "status" ||
      status === "all" ||
      (status === "open" ? o.status === "preparing" || o.status === "out_for_delivery" : o.status === status)) &&
    (skip === "late" || timeliness === "all" || (timeliness === "late" ? o.late : o.onTime === true)) &&
    (skip === "mode" || mode === "all" || o.etaMode === mode) &&
    (skip === "weekday" || weekday === "all" || o.weekday === Number(weekday)) &&
    (skip === "person" || person === "all" || (person === "none" ? !o.createdById || !personName.has(o.createdById) : o.createdById === person)) &&
    (skip === "place" || place === "all" || o.restaurantId === place);
  const filtered = facts.filter((o) => matchesFilters(o));
  const countFor = (skip: string, test: (o: OrderFacts) => boolean) =>
    facts.filter((o) => matchesFilters(o, skip) && test(o)).length;

  const periodDays = daysBetween(data.from, data.to);
  const sum = totals(filtered);
  const itemsSold = filtered.reduce((n, o) => n + o.itemCount, 0);

  // ---- filters -----------------------------------------------------------------
  const removed = facts.some((o) => !o.createdById || !personName.has(o.createdById));
  const filters: FilterDef[] = [
    {
      key: "period",
      label: t("filter.period"),
      icon: CalendarRange,
      value: period,
      fallback: DEFAULT_PERIOD,
      onChange: setPeriod,
      display: period === "custom" ? `${fmt.day(data.from)} – ${fmt.day(data.to)}` : undefined,
      options: PERIODS.map((p) => ({ value: p, label: t(`period.${p}`) })),
      footer: (
        <div className="mt-1 grid grid-cols-2 gap-2 border-t px-1.5 pt-2.5 pb-1.5" onKeyDown={(e) => e.stopPropagation()}>
          {(["from", "to"] as const).map((end) => (
            <label key={end} className="flex flex-col gap-1.5 text-xs font-medium">
              <span className="text-muted-foreground">{t(`period.${end}`)}</span>
              <input
                type="date"
                dir="ltr"
                value={data[end]}
                onChange={(e) => {
                  if (!e.target.value) return;
                  setParams({ period: "custom", from: data.from, to: data.to, [end]: e.target.value });
                }}
                className="figure border-input bg-surface focus-visible:border-ring focus-visible:ring-ring/20 h-9 w-full rounded-lg border px-2 text-sm outline-none focus-visible:ring-3"
              />
            </label>
          ))}
        </div>
      ),
    },
    scope === "platform"
      ? {
          key: "place",
          label: t("filter.restaurant"),
          icon: Store,
          value: place,
          fallback: "all",
          onChange: setPlace,
          options: [
            { value: "all", label: t("all"), count: countFor("place", () => true) },
            ...data.restaurants.map((r) => ({ value: r.id, label: r.name, count: countFor("place", (o) => o.restaurantId === r.id) })),
          ],
        }
      : {
          key: "person",
          label: t("filter.person"),
          icon: UserRound,
          value: person,
          fallback: "all",
          onChange: setPerson,
          options: [
            { value: "all", label: t("all"), count: countFor("person", () => true) },
            ...data.people.map((p) => ({ value: p.id, label: p.name, count: countFor("person", (o) => o.createdById === p.id) })),
            ...(removed
              ? [{ value: "none", label: t("removedAccount"), count: countFor("person", (o) => !o.createdById || !personName.has(o.createdById)) }]
              : []),
          ],
        },
    {
      key: "status",
      label: t("filter.status"),
      icon: CircleDot,
      value: status,
      fallback: "all",
      onChange: setStatus,
      options: STATUSES.map((s) => ({
        value: s,
        label: s === "all" ? t("all") : t(`status.${s}`),
        count: countFor("status", (o) =>
          s === "all" ? true : s === "open" ? o.status === "preparing" || o.status === "out_for_delivery" : o.status === s,
        ),
      })),
    },
    {
      key: "late",
      label: t("filter.timeliness"),
      icon: TriangleAlert,
      value: timeliness,
      fallback: "all",
      onChange: setTimeliness,
      options: TIMELINESS.map((s) => ({
        value: s,
        label: s === "all" ? t("all") : t(`timeliness.${s}`),
        count: countFor("late", (o) => (s === "all" ? true : s === "late" ? o.late : o.onTime === true)),
      })),
    },
    {
      key: "weekday",
      label: t("filter.weekday"),
      icon: CalendarDays,
      value: weekday,
      fallback: "all",
      onChange: setWeekday,
      options: WEEKDAYS.map((w) => ({
        value: w,
        label: w === "all" ? t("all") : fmt.weekday(Number(w)),
        count: countFor("weekday", (o) => w === "all" || o.weekday === Number(w)),
      })),
    },
    {
      key: "mode",
      label: t("filter.etaMode"),
      icon: Timer,
      value: mode,
      fallback: "all",
      onChange: setMode,
      options: MODES.map((m) => ({
        value: m,
        label: m === "all" ? t("all") : td(`etaMode.${m as EtaMode}`),
        count: countFor("mode", (o) => m === "all" || o.etaMode === m),
      })),
    },
  ];
  const reset = () =>
    setParams({ period: null, from: null, to: null, q: null, status: null, late: null, mode: null, weekday: null, person: null, place: null });

  // ---- the view's table ----------------------------------------------------------
  const ctx: SpecContext = { t, to, fmt, filtered, data, sum, itemsSold, periodDays, weekday, nameOf, restaurantName, links, scope };
  const spec = buildSpec(view, ctx);
  const sorting = useSort(
    spec.columns.map((c) => c.key),
    spec.columns[0]!.key,
  );
  const searchable = spec.columns.filter((c) => c.sortable !== false);
  const shown = sortRows({ ...spec, rows: spec.rows.filter((r) => matchesSearch(query, ...searchable.map((c) => (c.csv ?? c.value)(r)))) }, sorting);

  // ---- export --------------------------------------------------------------------
  const filtersOn = filters.filter((f) => f.key !== "period" && f.value !== f.fallback);
  const fileBase = `dawry-${t(`view.${view}`)}-${data.from}-${data.to}`.replace(/\s+/g, "-");
  const exportExcel = () => downloadCsv(`${fileBase}.csv`, tableCells(spec, shown, t("total")));
  const exportPdf = () => {
    const title = document.title;
    document.title = fileBase;
    window.print();
    document.title = title;
  };
  // Print light even when the screen is dark.
  useEffect(() => {
    let wasDark = false;
    const before = () => {
      wasDark = document.documentElement.classList.contains("dark");
      document.documentElement.classList.remove("dark");
    };
    const after = () => {
      if (wasDark) document.documentElement.classList.add("dark");
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);

  const printedAt = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(data.now));
  const filterList = filtersOn.length
    ? filtersOn
        .map((f) => `${f.label}: ${f.options?.find((o) => o.value === f.value)?.label ?? f.value}`)
        .join("، ")
    : t("noFilters");
  const viewSearch = t(`search.${view}`);
  void params; // re-render on any URL change

  return (
    <>
      <div className="print:hidden">
      <PageHeader
        title={t("title")}
        description={scope === "platform" ? t("platformHint") : t("restaurantHint")}
        actions={
          <div className="flex items-center gap-2 print:hidden">
            <Button variant="outline" onClick={exportExcel}>
              <FileSpreadsheet aria-hidden />
              {t("excel")}
            </Button>
            <Button onClick={exportPdf}>
              <FileDown aria-hidden />
              {t("pdf")}
            </Button>
          </div>
        }
      >
        <div className="print:hidden">
          <TabRail label={t("views")} tabs={views.map((v) => ({ value: v, label: t(`view.${v}`) }))} value={view} onChange={setView} />
        </div>
      </PageHeader>
      </div>

      <PageBody className="flex flex-col gap-5 print:gap-3 print:p-0">
        {/* What a printed copy opens with. */}
        <header className="hidden flex-col gap-1 border-b pb-3 print:flex">
          <p className="text-lg font-semibold">
            {subject} — {t(`view.${view}`)}
          </p>
          <p className="text-sm">
            {t("periodLine", { from: fmt.longDay(data.from), to: fmt.longDay(data.to), n: periodDays.length })}
          </p>
          <p className="text-muted-foreground text-xs">
            {t("filtersLine", { list: filterList })}
            {query ? ` · “${query}”` : ""} · {t("printedAt", { time: printedAt })}
          </p>
        </header>

        <div className="print:hidden">
          <ListToolbar
            search={<SearchField value={query} onChange={setQuery} placeholder={viewSearch} />}
            filters={filters}
            onReset={reset}
            count={<ResultCount shown={shown.length} total={spec.rows.length} noun={(n) => t("rowsN", { n })} />}
          />
        </div>

        <SummaryStrip
          items={[
            { label: t("sum.orders"), value: sum.orders, hint: `${(sum.orders / periodDays.length).toFixed(1)} ${t("sum.perDay")}` },
            { label: t("sum.delivered"), value: sum.delivered, hint: sum.orders ? fmt.pct(sum.delivered / sum.orders) : undefined },
            { label: t("sum.cancelled"), value: sum.cancelled, hint: sum.orders ? fmt.pct(sum.cancelled / sum.orders) : undefined },
            { label: t("sum.late"), value: sum.late, tone: sum.late > 0 ? "late" : undefined },
            { label: t("sum.onTime"), value: fmt.pct(sum.onTimeRate) },
            { label: t("sum.avgPrep"), value: fmt.min(sum.avgPrepMinutes) },
            { label: t("sum.avgDelay"), value: fmt.signed(sum.avgDelayMinutes), tone: (sum.avgDelayMinutes ?? 0) > 0 ? "late" : undefined },
            { label: t("sum.items"), value: itemsSold },
            ...(data.growth && view === "restaurants"
              ? [
                  { label: t("sum.newRestaurants"), value: data.growth.newRestaurants },
                  { label: t("sum.newCustomers"), value: data.growth.newCustomers },
                ]
              : []),
          ]}
        />

        <section aria-label={t(`view.${view}`)} className="bg-surface overflow-hidden rounded-xl border print:overflow-visible print:rounded-none">
          <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b px-5 py-3 print:px-1.5 print:py-2">
            <h2 className="text-[0.9375rem] font-semibold">{t(`view.${view}`)}</h2>
            <p className="text-muted-foreground text-xs">{t(`viewHint.${view}`)}</p>
          </header>
          {shown.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
              <SearchX aria-hidden className="text-muted-foreground size-7" />
              <p className="font-medium">{t("noRows")}</p>
              <p className="text-muted-foreground text-sm">{t("noRowsHint")}</p>
            </div>
          ) : (
            <ReportTable spec={spec} rows={shown} sorting={sorting} totalLabel={t("total")} />
          )}
        </section>

        <p className="text-muted-foreground text-xs">{t("lateJudged", { time: printedAt })}</p>
      </PageBody>
    </>
  );
}

// ---- The headline figures: one ruled strip, not cards ------------------------------

function SummaryStrip({ items }: { items: { label: string; value: ReactNode; hint?: string; tone?: "late" }[] }) {
  return (
    <dl
      className={cn(
        "bg-border grid grid-cols-2 gap-px overflow-hidden rounded-xl border print:rounded-none",
        items.length > 8 ? "sm:grid-cols-5" : "sm:grid-cols-4 xl:grid-cols-8",
      )}
    >
      {items.map((s) => (
        <div key={s.label} className="bg-surface flex min-w-0 flex-col gap-1 px-4 py-3 print:px-2 print:py-1.5">
          <dt className="text-muted-foreground text-xs whitespace-nowrap">{s.label}</dt>
          <dd className={cn("figure text-xl font-semibold print:text-base", s.tone === "late" && "text-late")}>{s.value}</dd>
          {s.hint ? <dd className="figure text-muted-foreground text-xs">{s.hint}</dd> : null}
        </div>
      ))}
    </dl>
  );
}

function ShareCell({ share }: { share: number | null }) {
  if (share === null) return <>—</>;
  return (
    <span className="inline-flex items-center justify-end gap-2">
      <span aria-hidden className="bg-muted h-1.5 w-16 overflow-hidden rounded-full print:hidden">
        <span className="bg-foreground/70 block h-full rounded-full" style={{ width: `${Math.min(100, share * 100)}%` }} />
      </span>
      <span className="w-9">{formatPercent(share)}</span>
    </span>
  );
}

// ---- One spec per view --------------------------------------------------------------

type T = ReturnType<typeof useTranslations<"rp">>;
interface SpecContext {
  t: T;
  to: ReturnType<typeof useTranslations<"order">>;
  fmt: {
    day: (d: string) => string;
    time: (iso: string | null) => string;
    min: (n: number | null) => string;
    signed: (n: number | null) => string;
    pct: (r: number | null) => string;
    hour: (h: number) => string;
    weekday: (w: number) => string;
  };
  filtered: OrderFacts[];
  data: ReportData;
  sum: Totals;
  itemsSold: number;
  periodDays: string[];
  weekday: string;
  nameOf: (id: string | null) => string;
  restaurantName: Map<string, string>;
  links: NonNullable<ReportViewProps["links"]>;
  scope: ReportViewProps["scope"];
}

const pctValue = (r: number | null) => (r === null ? null : Math.round(r * 100));
const round = (n: number | null) => (n === null ? null : Math.round(n));

/** The shared outcome + timing columns for any grouping of orders. */
function outcomeColumns<R extends { totals: Totals }>(c: SpecContext, all: Totals, keys: string[]): Column<R>[] {
  const { t, fmt } = c;
  const columns: Record<string, Column<R>> = {
    delivered: { key: "delivered", label: t("col.delivered"), numeric: true, value: (r) => r.totals.delivered, total: all.delivered },
    cancelled: {
      key: "cancelled",
      label: t("col.cancelled"),
      numeric: true,
      value: (r) => r.totals.cancelled,
      cell: (r) => <span className={cn(r.totals.cancelled > 0 && "text-late")}>{r.totals.cancelled}</span>,
      total: all.cancelled,
    },
    open: { key: "open", label: t("col.open"), numeric: true, value: (r) => r.totals.open, total: all.open },
    late: {
      key: "late",
      label: t("col.late"),
      numeric: true,
      value: (r) => r.totals.late,
      cell: (r) => <span className={cn(r.totals.late > 0 && "text-late font-semibold")}>{r.totals.late}</span>,
      total: all.late,
    },
    onTime: {
      key: "onTime",
      label: t("col.onTime"),
      numeric: true,
      value: (r) => pctValue(r.totals.onTimeRate),
      cell: (r) => fmt.pct(r.totals.onTimeRate),
      csv: (r) => fmt.pct(r.totals.onTimeRate),
      total: fmt.pct(all.onTimeRate),
    },
    avgPrep: {
      key: "avgPrep",
      label: t("col.avgPrep"),
      numeric: true,
      value: (r) => r.totals.avgPrepMinutes,
      cell: (r) => fmt.min(r.totals.avgPrepMinutes),
      csv: (r) => fmt.min(r.totals.avgPrepMinutes),
      total: fmt.min(all.avgPrepMinutes),
    },
    avgDelay: {
      key: "avgDelay",
      label: t("col.avgDelay"),
      numeric: true,
      value: (r) => r.totals.avgDelayMinutes,
      cell: (r) => (
        <span className={cn((r.totals.avgDelayMinutes ?? 0) > 0 && "text-late")}>{fmt.signed(r.totals.avgDelayMinutes)}</span>
      ),
      csv: (r) => fmt.signed(r.totals.avgDelayMinutes),
      total: fmt.signed(all.avgDelayMinutes),
    },
    avgDelivery: {
      key: "avgDelivery",
      label: t("col.avgDelivery"),
      numeric: true,
      value: (r) => r.totals.avgDeliveryMinutes,
      cell: (r) => fmt.min(r.totals.avgDeliveryMinutes),
      csv: (r) => fmt.min(r.totals.avgDeliveryMinutes),
      total: fmt.min(all.avgDeliveryMinutes),
    },
  };
  return keys.map((k) => columns[k]!);
}

function ordersColumn<R extends { totals: Totals }>(c: SpecContext): Column<R> {
  return {
    key: "orders",
    label: c.t("col.orders"),
    numeric: true,
    value: (r) => r.totals.orders,
    cell: (r) => <span className="font-semibold">{r.totals.orders}</span>,
    total: c.sum.orders,
  };
}

function shareColumn<R extends { totals: Totals }>(c: SpecContext): Column<R> {
  const share = (r: R) => (c.sum.orders ? r.totals.orders / c.sum.orders : null);
  return {
    key: "share",
    label: c.t("col.share"),
    numeric: true,
    value: (r) => pctValue(share(r)),
    cell: (r) => <ShareCell share={share(r)} />,
    csv: (r) => c.fmt.pct(share(r)),
    total: c.sum.orders ? "100%" : null,
  };
}

const itemsOf = (rows: OrderFacts[]) => rows.reduce((n, o) => n + o.itemCount, 0);

/** Each view has its own row type; the page only passes rows back to the same spec. */
type AnySpec = TableSpec<object>;

function buildSpec(view: View, c: SpecContext): AnySpec {
  switch (view) {
    case "orders":
      return ordersSpec(c) as unknown as AnySpec;
    case "daily":
      return dailySpec(c) as unknown as AnySpec;
    case "staff":
      return staffSpec(c) as unknown as AnySpec;
    case "restaurants":
      return restaurantsSpec(c) as unknown as AnySpec;
    case "items":
      return itemsSpec(c) as unknown as AnySpec;
    case "hours":
      return hoursSpec(c) as unknown as AnySpec;
    case "weekdays":
      return weekdaysSpec(c) as unknown as AnySpec;
    case "timing":
      return timingSpec(c) as unknown as AnySpec;
  }
}

function ordersSpec(c: SpecContext): TableSpec<OrderFacts> {
  const { t, to, fmt, sum } = c;
  const columns: Column<OrderFacts>[] = [
    {
      key: "invoice",
      label: t("col.invoice"),
      value: (o) => Number(o.invoiceNumber) || o.invoiceNumber,
      cell: (o) => <span dir="ltr" className="figure">#{o.invoiceNumber}</span>,
      csv: (o) => o.invoiceNumber,
    },
    ...(c.scope === "platform"
      ? [{ key: "restaurant", label: t("col.restaurant"), value: (o: OrderFacts) => c.restaurantName.get(o.restaurantId) ?? "—" }]
      : []),
    { key: "date", label: t("col.date"), value: (o) => o.businessDay, cell: (o) => fmt.day(o.businessDay) },
    { key: "enteredAt", label: t("col.enteredAt"), numeric: true, value: (o) => o.createdAt, cell: (o) => fmt.time(o.createdAt), csv: (o) => fmt.time(o.createdAt) },
    { key: "customer", label: t("col.customer"), value: (o) => o.customerName || null },
    { key: "enteredBy", label: t("col.enteredBy"), value: (o) => c.nameOf(o.createdById) },
    { key: "items", label: t("col.items"), numeric: true, value: (o) => o.itemCount, total: c.itemsSold },
    {
      key: "status",
      label: t("col.status"),
      value: (o) => to(`status.${o.status}`),
      cell: (o) => (
        <span className="flex items-center gap-1.5">
          <Badge variant={o.status}>{to(`status.${o.status}`)}</Badge>
          {o.late ? <Badge variant="late">{t("timeliness.late")}</Badge> : null}
        </span>
      ),
      csv: (o) => (o.late ? `${to(`status.${o.status}`)} (${t("timeliness.late")})` : to(`status.${o.status}`)),
    },
    { key: "eta", label: t("col.eta"), numeric: true, value: (o) => o.etaAt, cell: (o) => fmt.time(o.etaAt), csv: (o) => fmt.time(o.etaAt) },
    { key: "outAt", label: t("col.outAt"), numeric: true, value: (o) => o.outAt, cell: (o) => fmt.time(o.outAt), csv: (o) => fmt.time(o.outAt) },
    { key: "prep", label: t("col.prep"), numeric: true, value: (o) => round(o.prepMinutes), cell: (o) => fmt.min(o.prepMinutes), csv: (o) => fmt.min(o.prepMinutes), total: fmt.min(sum.avgPrepMinutes) },
    {
      key: "delay",
      label: t("col.delay"),
      numeric: true,
      value: (o) => round(o.delayMinutes),
      cell: (o) => <span className={cn((o.delayMinutes ?? 0) > 0 && "text-late font-semibold")}>{fmt.signed(o.delayMinutes)}</span>,
      csv: (o) => fmt.signed(o.delayMinutes),
      total: fmt.signed(sum.avgDelayMinutes),
    },
  ];
  return {
    columns,
    rows: c.filtered,
    rowKey: (o) => o.id,
    rowHref: c.links.order ? (o) => c.links.order!(o.id) : undefined,
    totals: true,
  };
}

interface DayRow {
  day: string;
  totals: Totals;
  items: number;
}

function dailySpec(c: SpecContext): TableSpec<DayRow> {
  const { t, fmt } = c;
  const byDay = groupBy(c.filtered, (o) => o.businessDay);
  const rows = c.periodDays
    .filter((d) => c.weekday === "all" || new Date(`${d}T00:00:00Z`).getUTCDay() === Number(c.weekday))
    .reverse()
    .map((day) => {
      const list = byDay.get(day) ?? [];
      return { day, totals: totals(list), items: itemsOf(list) };
    });
  return {
    columns: [
      { key: "date", label: t("col.date"), value: (r) => r.day, cell: (r) => <span className="font-medium">{fmt.day(r.day)}</span>, csv: (r) => r.day },
      ordersColumn(c),
      ...outcomeColumns<DayRow>(c, c.sum, ["delivered", "cancelled", "open", "late", "onTime", "avgPrep", "avgDelay", "avgDelivery"]),
      { key: "items", label: t("col.items"), numeric: true, value: (r) => r.items, total: c.itemsSold },
    ],
    rows,
    rowKey: (r) => r.day,
    muted: (r) => r.totals.orders === 0,
    totals: true,
  };
}

interface PersonRow {
  id: string;
  name: string;
  totals: Totals;
  items: number;
  lastDay: string | null;
}

function staffSpec(c: SpecContext): TableSpec<PersonRow> {
  const { t, fmt } = c;
  const known = new Set(c.data.people.map((p) => p.id));
  const byPerson = groupBy(c.filtered, (o) => (o.createdById && known.has(o.createdById) ? o.createdById : "none"));
  const make = (id: string, name: string): PersonRow => {
    const list = byPerson.get(id) ?? [];
    return { id, name, totals: totals(list), items: itemsOf(list), lastDay: list.map((o) => o.businessDay).sort().at(-1) ?? null };
  };
  const rows = [
    ...c.data.people.map((p) => make(p.id, p.name)),
    ...(byPerson.has("none") ? [make("none", t("removedAccount"))] : []),
  ].sort((a, b) => b.totals.orders - a.totals.orders || a.name.localeCompare(b.name));
  return {
    columns: [
      { key: "name", label: t("col.person"), value: (r) => r.name },
      ordersColumn(c),
      shareColumn(c),
      ...outcomeColumns<PersonRow>(c, c.sum, ["delivered", "cancelled", "late", "onTime", "avgPrep", "avgDelay"]),
      { key: "items", label: t("col.items"), numeric: true, value: (r) => r.items, total: c.itemsSold },
      { key: "lastOrder", label: t("col.lastOrder"), value: (r) => r.lastDay, cell: (r) => (r.lastDay ? fmt.day(r.lastDay) : "—") },
    ],
    rows,
    rowKey: (r) => r.id,
    rowHref: c.links.person ? (r) => (r.id === "none" ? undefined : c.links.person!(r.id)) : undefined,
    muted: (r) => r.totals.orders === 0,
    totals: true,
  };
}

interface RestaurantRow {
  id: string;
  name: string;
  active: boolean;
  staff: number;
  totals: Totals;
  items: number;
}

function restaurantsSpec(c: SpecContext): TableSpec<RestaurantRow> {
  const { t } = c;
  const byPlace = groupBy(c.filtered, (o) => o.restaurantId);
  const staff = groupBy(c.data.people, (p) => p.restaurantId);
  const rows = c.data.restaurants
    .map((r) => {
      const list = byPlace.get(r.id) ?? [];
      return { id: r.id, name: r.name, active: r.active, staff: staff.get(r.id)?.length ?? 0, totals: totals(list), items: itemsOf(list) };
    })
    .sort((a, b) => b.totals.orders - a.totals.orders || a.name.localeCompare(b.name));
  return {
    columns: [
      {
        key: "name",
        label: t("col.restaurant"),
        value: (r) => r.name,
        cell: (r) => (
          <span className="inline-flex items-center gap-2">
            {r.name}
            {r.active ? null : <Badge variant="inactive">{t("suspended")}</Badge>}
          </span>
        ),
      },
      ordersColumn(c),
      shareColumn(c),
      ...outcomeColumns<RestaurantRow>(c, c.sum, ["delivered", "cancelled", "late", "onTime", "avgPrep", "avgDelay"]),
      { key: "items", label: t("col.items"), numeric: true, value: (r) => r.items, total: c.itemsSold },
      { key: "staff", label: t("col.staff"), numeric: true, value: (r) => r.staff, total: c.data.people.length },
    ],
    rows,
    rowKey: (r) => r.id,
    rowHref: c.links.restaurant ? (r) => c.links.restaurant!(r.id) : undefined,
    muted: (r) => r.totals.orders === 0,
    totals: true,
  };
}

function itemsSpec(c: SpecContext) {
  const { t, fmt } = c;
  const stats = itemStats(c.filtered, c.data.items).map((s, i) => ({ ...s, rank: i + 1 }));
  const quantity = stats.reduce((n, s) => n + s.quantity, 0);
  const spec: TableSpec<(typeof stats)[number]> = {
    columns: [
      { key: "rank", label: t("col.rank"), numeric: true, value: (s) => s.rank, cell: (s) => <span className="text-muted-foreground">{s.rank}</span> },
      { key: "item", label: t("col.item"), value: (s) => s.name, cell: (s) => <span className="font-medium">{s.name}</span> },
      { key: "quantity", label: t("col.quantity"), numeric: true, value: (s) => s.quantity, cell: (s) => <span className="font-semibold">{s.quantity}</span>, total: quantity },
      { key: "inOrders", label: t("col.inOrders"), numeric: true, value: (s) => s.orders },
      { key: "share", label: t("col.share"), numeric: true, value: (s) => pctValue(s.share), cell: (s) => <ShareCell share={s.share} />, csv: (s) => fmt.pct(s.share), total: quantity ? "100%" : null },
      { key: "perOrder", label: t("col.perOrder"), numeric: true, value: (s) => Math.round((s.quantity / s.orders) * 10) / 10 },
      { key: "firstDay", label: t("col.firstDay"), value: (s) => s.firstDay, cell: (s) => fmt.day(s.firstDay) },
      { key: "lastDay", label: t("col.lastDay"), value: (s) => s.lastDay, cell: (s) => fmt.day(s.lastDay) },
    ],
    rows: stats,
    rowKey: (s) => s.name,
    totals: true,
  };
  return spec;
}

interface HourRow {
  hour: number;
  totals: Totals;
}

function hoursSpec(c: SpecContext): TableSpec<HourRow> {
  const { t, fmt } = c;
  const byHour = groupBy(c.filtered, (o) => o.hour);
  const rows = Array.from({ length: 24 }, (_, hour) => ({ hour, totals: totals(byHour.get(hour) ?? []) }));
  const peak = Math.max(...rows.map((r) => r.totals.orders));
  return {
    columns: [
      {
        key: "hour",
        label: t("col.hour"),
        value: (r) => r.hour,
        cell: (r) => (
          <span dir="ltr" className={cn("figure", peak > 0 && r.totals.orders === peak && "font-semibold")}>
            {t("hourRange", { from: fmt.hour(r.hour), to: fmt.hour((r.hour + 1) % 24) })}
          </span>
        ),
        csv: (r) => t("hourRange", { from: fmt.hour(r.hour), to: fmt.hour((r.hour + 1) % 24) }),
      },
      ordersColumn(c),
      shareColumn(c),
      ...outcomeColumns<HourRow>(c, c.sum, ["delivered", "cancelled", "late", "onTime", "avgPrep", "avgDelay"]),
    ],
    rows,
    rowKey: (r) => String(r.hour),
    muted: (r) => r.totals.orders === 0,
    totals: true,
  };
}

interface WeekdayRow {
  weekday: number;
  days: number;
  totals: Totals;
}

function weekdaysSpec(c: SpecContext): TableSpec<WeekdayRow> {
  const { t, fmt } = c;
  const byWeekday = groupBy(c.filtered, (o) => o.weekday);
  const dayCount = groupBy(c.periodDays, (d) => new Date(`${d}T00:00:00Z`).getUTCDay());
  const rows = WEEK_ORDER.filter((w) => c.weekday === "all" || w === Number(c.weekday)).map((weekday) => ({
    weekday,
    days: dayCount.get(weekday)?.length ?? 0,
    totals: totals(byWeekday.get(weekday) ?? []),
  }));
  const perDay = (r: WeekdayRow) => (r.days ? Math.round((r.totals.orders / r.days) * 10) / 10 : null);
  return {
    columns: [
      { key: "weekday", label: t("col.weekday"), value: (r) => WEEK_ORDER.indexOf(r.weekday), cell: (r) => <span className="font-medium">{fmt.weekday(r.weekday)}</span>, csv: (r) => fmt.weekday(r.weekday) },
      { key: "days", label: t("col.days"), numeric: true, value: (r) => r.days, total: c.periodDays.length },
      ordersColumn(c),
      { key: "perDay", label: t("col.perDay"), numeric: true, value: perDay, total: c.periodDays.length ? (c.sum.orders / c.periodDays.length).toFixed(1) : null },
      shareColumn(c),
      ...outcomeColumns<WeekdayRow>(c, c.sum, ["delivered", "cancelled", "late", "onTime", "avgPrep", "avgDelay"]),
    ],
    rows,
    rowKey: (r) => String(r.weekday),
    muted: (r) => r.totals.orders === 0,
    totals: true,
  };
}

interface BucketRow {
  from: number;
  to: number | null;
  totals: Totals;
  cumulative: number | null;
}

function timingSpec(c: SpecContext): TableSpec<BucketRow> {
  const { t, fmt } = c;
  const wentOut = c.filtered.filter((o) => o.prepMinutes !== null);
  let running = 0;
  const rows = BUCKETS.map(([from, to]) => {
    const list = wentOut.filter((o) => o.prepMinutes! >= from && (to === null || o.prepMinutes! < to));
    running += list.length;
    return { from, to, totals: totals(list), cumulative: wentOut.length ? running / wentOut.length : null };
  });
  const label = (r: BucketRow) => (r.to === null ? t("bucketOver", { from: r.from }) : t("bucketRange", { from: r.from, to: r.to }));
  const share = (r: BucketRow) => (wentOut.length ? r.totals.orders / wentOut.length : null);
  return {
    columns: [
      { key: "bucket", label: t("col.bucket"), value: (r) => r.from, cell: (r) => <span className="font-medium">{label(r)}</span>, csv: label },
      { key: "orders", label: t("col.orders"), numeric: true, value: (r) => r.totals.orders, cell: (r) => <span className="font-semibold">{r.totals.orders}</span>, total: wentOut.length },
      { key: "share", label: t("col.share"), numeric: true, value: (r) => pctValue(share(r)), cell: (r) => <ShareCell share={share(r)} />, csv: (r) => fmt.pct(share(r)), total: wentOut.length ? "100%" : null },
      { key: "cumulative", label: t("col.cumulative"), numeric: true, value: (r) => pctValue(r.cumulative), cell: (r) => fmt.pct(r.cumulative), csv: (r) => fmt.pct(r.cumulative) },
      ...outcomeColumns<BucketRow>(c, totals(wentOut), ["late", "onTime", "avgDelay"]),
    ],
    rows,
    rowKey: (r) => String(r.from),
    muted: (r) => r.totals.orders === 0,
    totals: true,
  };
}
