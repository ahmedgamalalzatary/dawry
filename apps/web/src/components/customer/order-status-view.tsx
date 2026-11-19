"use client";

import type { OrderStatus, PublicOrder } from "@dawry/shared";
import { Bike, Check, ChefHat, PackageCheck, Phone, TriangleAlert, XCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { etaDisplay, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { RestaurantAvatar } from "./restaurant-avatar";

const STEPS: { status: OrderStatus; icon: typeof ChefHat }[] = [
  { status: "preparing", icon: ChefHat },
  { status: "out_for_delivery", icon: Bike },
  { status: "delivered", icon: PackageCheck },
];

const TICKET_TONE: Record<OrderStatus, string> = {
  preparing: "bg-brand text-brand-foreground",
  out_for_delivery: "bg-teal text-white dark:text-[#0b1322]",
  delivered: "bg-success text-white dark:text-[#0b1322]",
  cancelled: "bg-card text-foreground",
};

export function OrderStatusView({
  order,
  now,
  footer,
}: {
  order: PublicOrder;
  now: Date;
  footer?: ReactNode;
}) {
  const t = useTranslations("order");
  const tr = useTranslations("restaurant");
  const locale = useLocale();
  const eta = etaDisplay(order.etaMode, order.etaAt, now);
  const tone = TICKET_TONE[order.status];

  return (
    <article className="flex flex-col gap-6">
      <header className="flex items-center gap-3">
        <RestaurantAvatar name={order.restaurant.name} logoUrl={order.restaurant.logoUrl} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-semibold">{order.restaurant.name}</span>
          {footer}
        </div>
      </header>

      {/* The ticket */}
      <div className="ticket-shadow ticket-print">
        <div className={cn("ticket-top rounded-t-3xl px-6 pt-5 pb-7", tone)}>
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-base font-semibold">{t("invoice", { number: order.invoiceNumber })}</h1>
            <span className="rounded-full bg-black/10 px-3 py-1 text-xs font-semibold dark:bg-black/15">
              {t(`status.${order.status}`)}
            </span>
          </div>
          <TicketHero order={order} />
        </div>
        <div className={cn("ticket-bottom rounded-b-3xl px-6 pb-6", tone)}>
          <div className="perforation mx-1 mb-5" />
          <TicketFoot order={order} eta={eta} locale={locale} />
        </div>
      </div>

      {order.status !== "cancelled" ? <StepTracker current={order.status} /> : null}

      {/* The receipt */}
      <section className="bg-card flex flex-col rounded-2xl border">
        <h2 className="px-5 pt-4 pb-2 text-sm font-semibold">{t("items")}</h2>
        <ul className="flex flex-col px-5 pb-3">
          {order.items.map((item, index) => (
            <li key={index} className="flex items-baseline gap-3 py-2">
              <span className="font-medium">{item.name}</span>
              <span aria-hidden className="border-border mb-1 flex-1 border-b border-dotted" />
              <span className="text-muted-foreground tabular-nums">× {item.quantity}</span>
            </li>
          ))}
        </ul>
        {order.fields.length > 0 ? (
          <dl className="bg-muted/60 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-b-2xl border-t border-dashed px-5 py-4 text-sm">
            {order.fields.map((field, index) => (
              <div key={index} className="contents">
                <dt className="text-muted-foreground">{field.label}</dt>
                <dd className="font-medium">{field.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </section>

      {order.restaurant.phone ? (
        <a
          href={`tel:${order.restaurant.phone}`}
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}
        >
          <Phone />
          {tr("call")}
        </a>
      ) : null}
    </article>
  );
}

/** The big thing on the ticket: your place in line, or what happened. */
function TicketHero({ order }: { order: PublicOrder }) {
  const t = useTranslations("order");

  if (order.status === "preparing") {
    return (
      <div className="flex flex-col items-center pt-6 pb-1 text-center">
        <p className="sr-only">{t("ahead", { count: order.ordersAhead })}</p>
        {order.ordersAhead === 0 ? (
          <p aria-hidden className="py-4 text-5xl leading-none font-bold tracking-tight">
            {t("next")}
          </p>
        ) : (
          <>
            <p aria-hidden className="text-[7rem] leading-[0.95] font-bold tracking-tighter tabular-nums">
              {order.ordersAhead}
            </p>
            <p aria-hidden className="text-lg font-medium">
              {t("aheadUnit", { count: order.ordersAhead })}
            </p>
          </>
        )}
      </div>
    );
  }

  const Icon =
    order.status === "out_for_delivery" ? Bike : order.status === "delivered" ? PackageCheck : XCircle;
  return (
    <div className="flex justify-center pt-7 pb-2">
      <span
        className={cn(
          "flex size-24 items-center justify-center rounded-full",
          order.status === "cancelled" ? "bg-muted text-muted-foreground" : "bg-black/10",
        )}
      >
        <Icon aria-hidden className="size-12" strokeWidth={1.6} />
      </span>
    </div>
  );
}

function TicketFoot({
  order,
  eta,
  locale,
}: {
  order: PublicOrder;
  eta: ReturnType<typeof etaDisplay>;
  locale: string;
}) {
  const t = useTranslations("order");

  if (order.status !== "preparing") {
    const message =
      order.status === "out_for_delivery"
        ? t("outMessage")
        : order.status === "delivered"
          ? t("deliveredMessage")
          : t("cancelledMessage");
    return <p className="text-center text-lg leading-snug font-semibold text-balance">{message}</p>;
  }

  // Late: a 0:00 countdown says nothing useful, show the expected time instead.
  const showClock = order.late || eta.kind === "clock";
  const sentence = showClock
    ? t("eta.at", { time: formatTime(order.etaAt, locale) })
    : eta.kind === "countdown"
      ? t("eta.countdown", { remaining: eta.remaining })
      : t("eta.minutes", { minutes: eta.minutes });

  return (
    <div className="flex flex-col gap-4">
      <p className="sr-only">{sentence}</p>
      <div aria-hidden className="flex items-end justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-sm font-medium opacity-75">
            {showClock ? t("expectedAt") : eta.kind === "countdown" ? t("readyIn") : t("about")}
          </span>
          {/* Countdowns read left-to-right; an Arabic clock time keeps its own order ("11:22 م"). */}
          <span className="text-4xl leading-tight font-bold tabular-nums" dir={showClock ? undefined : "ltr"}>
            {showClock
              ? formatTime(order.etaAt, locale)
              : eta.kind === "countdown"
                ? eta.remaining
                : eta.kind === "minutes"
                  ? eta.minutes
                  : null}
          </span>
        </div>
        {eta.kind === "countdown" && !order.late ? (
          <span className="pb-1.5 text-sm font-medium opacity-75">
            {t("eta.at", { time: formatTime(eta.clock, locale) })}
          </span>
        ) : eta.kind === "minutes" && !order.late ? (
          <span className="pb-1.5 text-sm font-medium opacity-75">{t("minutesUnit")}</span>
        ) : null}
      </div>
      {order.late ? (
        <p
          role="alert"
          className="bg-chili flex items-start gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white dark:text-[#0b1322]"
        >
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          {t("late")}
        </p>
      ) : null}
    </div>
  );
}

function StepTracker({ current }: { current: OrderStatus }) {
  const t = useTranslations("order");
  const currentIndex = STEPS.findIndex((s) => s.status === current);

  return (
    <ol aria-label="Status" className="grid grid-cols-3">
      {STEPS.map(({ status, icon: Icon }, index) => {
        const done = index < currentIndex || (index === currentIndex && status === "delivered");
        const active = index === currentIndex && !done;
        return (
          <li
            key={status}
            aria-current={status === current ? "step" : undefined}
            className="relative flex flex-col items-center gap-2 text-center"
          >
            {index > 0 ? (
              <span
                aria-hidden
                className={cn(
                  "absolute top-5 end-1/2 h-0.5 w-full -translate-y-1/2",
                  index <= currentIndex ? "bg-foreground" : "bg-border",
                )}
              />
            ) : null}
            <span
              className={cn(
                "relative flex size-10 items-center justify-center rounded-full border-2 transition-colors",
                done && "border-foreground bg-foreground text-background",
                active && "border-brand-strong bg-brand text-brand-foreground ring-brand/25 ring-4",
                !done && !active && "border-border bg-card text-muted-foreground",
              )}
            >
              {done ? <Check aria-hidden className="size-5" /> : <Icon aria-hidden className="size-5" />}
            </span>
            <span
              className={cn(
                "text-xs font-medium",
                index <= currentIndex ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {t(`status.${status}`)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
