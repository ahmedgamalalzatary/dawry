"use client";

import { isLate, type StaffOrder } from "@dawry/shared";
import { Eye, MapPin, Phone, StickyNote, UserRound } from "lucide-react";
import Link from "next/link";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { PageBody, PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Flap } from "@/components/ui/flap";
import { Facts, Panel } from "@/components/ui/stats";
import { formatCountdown, formatTime } from "@/lib/format";
import { useLive, useNow } from "@/lib/live";
import { orderPath } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { OrderActions } from "./order-row";

const minutesBetween = (from: string, to: string) =>
  Math.max(0, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60_000));

export function OrderDetail({
  initial,
  slug,
  renderedAt,
  owner,
}: {
  initial: StaffOrder;
  slug: string;
  renderedAt: string;
  /** Owners can open the menu item a line came from. */
  owner: boolean;
}) {
  const t = useTranslations("orderPage");
  const td = useTranslations("dashboard");
  const to = useTranslations("order");
  const locale = useLocale();
  const timeZone = useTimeZone();
  const { data, setData } = useLive(`/api/restaurant/orders/${initial.id}`, initial, "/api/restaurant/events");
  const now = useNow(1000, renderedAt);
  const order = { ...data, late: isLate({ status: data.status, etaAt: new Date(data.etaAt) }, now) };

  const time = (iso: string) => formatTime(iso, locale, timeZone);
  const dateFormat = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone,
  });
  const preparing = order.status === "preparing";
  const msLeft = new Date(order.etaAt).getTime() - now.getTime();
  const leftAt = order.outAt ?? order.deliveredAt;

  const steps = [
    { key: "created", label: t("stepCreated"), at: order.createdAt, done: true, tone: "bg-foreground" },
    {
      key: "eta",
      label: t("stepEta"),
      at: order.etaAt,
      done: Boolean(leftAt) || order.late,
      tone: order.late || (leftAt && leftAt > order.etaAt) ? "bg-late" : "bg-preparing",
    },
    ...(order.status === "cancelled"
      ? [{ key: "cancelled", label: to("status.cancelled"), at: order.cancelledAt, done: true, tone: "bg-muted-foreground" }]
      : [
          { key: "out", label: to("status.out_for_delivery"), at: order.outAt, done: Boolean(order.outAt), tone: "bg-transit" },
          { key: "delivered", label: to("status.delivered"), at: order.deliveredAt, done: Boolean(order.deliveredAt), tone: "bg-go" },
        ]),
  ];

  return (
    <>
      <PageHeader
        back={{ href: "/dashboard", label: td("ordersTitle") }}
        title={
          <span className="figure" dir="ltr">
            #{order.invoiceNumber}
          </span>
        }
        meta={
          <span className="flex gap-1.5">
            <Badge variant={order.status}>{to(`status.${order.status}`)}</Badge>
            {order.late ? <Badge variant="late">{td("late")}</Badge> : null}
          </span>
        }
        description={
          order.createdBy
            ? t("enteredBy", { date: dateFormat.format(new Date(order.createdAt)), time: time(order.createdAt), name: order.createdBy.name })
            : t("entered", { date: dateFormat.format(new Date(order.createdAt)), time: time(order.createdAt) })
        }
        actions={
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Link href={orderPath(slug, order.invoiceNumber, order.businessDay)} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "max-sm:hidden")}>
              <Eye aria-hidden />
              {t("customerView")}
            </Link>
            <OrderActions order={order} slug={slug} onChange={setData} size="page" />
          </div>
        }
      />

      <PageBody className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {/* The departure: when it's due and where it stands. */}
          <section aria-label={t("departure")} className="bg-board text-board-foreground grid grid-cols-2 overflow-hidden rounded-xl sm:grid-cols-3">
            <div className="border-board-line flex flex-col gap-1 border-e p-5">
              <span className="text-board-muted text-xs">{t("due")}</span>
              <Flap value={time(order.etaAt)} className={cn("text-3xl font-semibold", order.late && "text-[#ff7b6e]")} />
              <span className="text-board-muted text-xs">{td(`etaMode.${order.etaMode}`)}</span>
            </div>
            <div className="border-board-line flex flex-col gap-1 p-5 sm:border-e">
              <span className="text-board-muted text-xs">
                {preparing ? (order.late ? t("lateBy") : t("remaining")) : leftAt ? t("prepTook") : t("finished")}
              </span>
              <span className={cn("figure text-3xl font-semibold", order.late && "text-[#ff7b6e]")} dir="ltr">
                {preparing
                  ? order.late
                    ? t("minutes", { n: Math.ceil(-msLeft / 60_000) })
                    : formatCountdown(msLeft)
                  : leftAt
                    ? t("minutes", { n: minutesBetween(order.createdAt, leftAt) })
                    : "—"}
              </span>
            </div>
            <div className="border-board-line col-span-2 flex flex-col gap-1 border-t p-5 sm:col-span-1 sm:border-t-0">
              <span className="text-board-muted text-xs">{to("aheadLabel")}</span>
              {preparing ? (
                <Flap value={order.ordersAhead} className="text-3xl font-semibold" />
              ) : (
                <span className="text-3xl font-semibold">—</span>
              )}
            </div>
          </section>

          <Panel title={t("items")} description={t("itemCount", { n: order.items.reduce((n, i) => n + i.quantity, 0) })} flush>
            <ul className="divide-y">
              {order.items.map((item, i) => (
                <li key={i} className="flex items-center gap-4 px-5 py-3">
                  <span className="figure bg-muted flex h-8 min-w-10 items-center justify-center rounded-md px-2 text-sm font-semibold">
                    {item.quantity}×
                  </span>
                  <span className="min-w-0 flex-1 font-medium">{item.name}</span>
                  {owner && item.menuItemId ? (
                    <Link href={`/dashboard/menu/${item.menuItemId}`} className="text-link relative text-xs font-medium hover:underline">
                      {t("menuItem")}
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          </Panel>

          {order.fields.length > 0 || order.notes ? (
            <Panel title={t("details")} flush>
              <Facts
                rows={[
                  ...order.fields.map((f) => ({
                    label: f.label,
                    value: (
                      <span className="inline-flex items-center gap-2">
                        {f.value}
                        {f.public ? null : <span className="text-muted-foreground text-xs font-normal">{t("staffOnly")}</span>}
                      </span>
                    ),
                  })),
                  ...(order.notes ? [{ label: t("notes"), value: order.notes }] : []),
                ]}
              />
            </Panel>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Panel title={t("customer")} flush>
            {order.customerName || order.customerPhone || order.address ? (
              <ul className="divide-y text-sm">
                {order.customerName ? (
                  <li className="flex items-center gap-3 px-5 py-3">
                    <UserRound aria-hidden className="text-muted-foreground size-4 shrink-0" />
                    <span className="font-medium">{order.customerName}</span>
                  </li>
                ) : null}
                {order.customerPhone ? (
                  <li className="flex items-center gap-3 px-5 py-3">
                    <Phone aria-hidden className="text-muted-foreground size-4 shrink-0" />
                    <a href={`tel:${order.customerPhone}`} className="figure text-link font-medium hover:underline" dir="ltr">
                      {order.customerPhone}
                    </a>
                  </li>
                ) : null}
                {order.address ? (
                  <li className="flex items-start gap-3 px-5 py-3">
                    <MapPin aria-hidden className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                    <span>{order.address}</span>
                  </li>
                ) : null}
              </ul>
            ) : (
              <p className="text-muted-foreground flex items-center gap-2 px-5 py-4 text-sm">
                <StickyNote aria-hidden className="size-4" />
                {t("noCustomer")}
              </p>
            )}
          </Panel>

          <Panel title={t("timeline")}>
            <ol aria-label={t("timeline")} className="flex flex-col">
              {steps.map((step, i) => (
                <li key={step.key} className="relative flex gap-3 pb-5 last:pb-0">
                  {i < steps.length - 1 ? (
                    <span aria-hidden className="bg-border absolute start-[0.3125rem] top-4 bottom-0 w-px" />
                  ) : null}
                  <span
                    aria-hidden
                    className={cn("relative mt-1.5 size-2.5 shrink-0 rounded-full", step.done ? step.tone : "border-border-strong border-2 bg-surface")}
                  />
                  <span className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
                    <span className={cn("text-sm", step.done ? "font-medium" : "text-muted-foreground")}>{step.label}</span>
                    <span className="figure text-muted-foreground text-sm" dir="ltr">
                      {step.at ? time(step.at) : "—"}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </PageBody>
    </>
  );
}
