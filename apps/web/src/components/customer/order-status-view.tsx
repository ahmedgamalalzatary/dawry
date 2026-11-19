"use client";

import type { OrderStatus, PublicOrder } from "@dawry/shared";
import { useLocale, useTranslations } from "next-intl";
import { etaDisplay, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const STEPS: OrderStatus[] = ["preparing", "out_for_delivery", "delivered"];

export function OrderStatusView({ order, now }: { order: PublicOrder; now: Date }) {
  const t = useTranslations("order");
  const tr = useTranslations("restaurant");
  const locale = useLocale();
  const preparing = order.status === "preparing";
  const eta = etaDisplay(order.etaMode, order.etaAt, now);
  const currentStep = STEPS.indexOf(order.status);

  return (
    <article className="flex flex-col gap-5">
      <header className="flex items-center gap-3">
        {order.restaurant.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- restaurant logos are external URLs
          <img
            src={order.restaurant.logoUrl}
            alt=""
            className="size-12 rounded-lg object-cover"
            referrerPolicy="no-referrer"
          />
        ) : null}
        <div className="flex flex-col">
          <span className="text-muted-foreground text-sm">{order.restaurant.name}</span>
          <h1 className="text-2xl font-semibold">{t("invoice", { number: order.invoiceNumber })}</h1>
        </div>
      </header>

      {order.status === "cancelled" ? (
        <p className="bg-destructive/10 text-destructive rounded-lg p-4">{t("cancelledMessage")}</p>
      ) : (
        <ol aria-label="Status" className="grid grid-cols-3 gap-2">
          {STEPS.map((step, index) => (
            <li
              key={step}
              aria-current={step === order.status ? "step" : undefined}
              className={cn(
                "rounded-lg border p-2 text-center text-sm",
                index <= currentStep && "border-primary bg-primary/10 font-medium",
              )}
            >
              {t(`status.${step}`)}
            </li>
          ))}
        </ol>
      )}

      {preparing ? (
        <section className="bg-card flex flex-col gap-1 rounded-xl border p-5 text-center">
          <p className="text-lg font-medium">{t("ahead", { count: order.ordersAhead })}</p>
          <p className="text-3xl font-bold tabular-nums">
            {/* Late: a 0:00 countdown says nothing useful, show the expected time instead. */}
            {order.late || eta.kind === "clock"
              ? t("eta.at", { time: formatTime(order.etaAt, locale) })
              : eta.kind === "countdown"
                ? t("eta.countdown", { remaining: eta.remaining })
                : t("eta.minutes", { minutes: eta.minutes })}
          </p>
          {eta.kind === "countdown" && !order.late ? (
            <p className="text-muted-foreground text-sm">
              {t("eta.at", { time: formatTime(eta.clock, locale) })}
            </p>
          ) : null}
          {order.late ? (
            <p role="alert" className="mt-2 rounded-md bg-amber-500/15 p-2 text-amber-800 dark:text-amber-300">
              {t("late")}
            </p>
          ) : null}
        </section>
      ) : null}

      {order.status === "out_for_delivery" ? (
        <p className="rounded-lg bg-sky-500/10 p-4 text-center font-medium">{t("outMessage")}</p>
      ) : null}
      {order.status === "delivered" ? (
        <p className="rounded-lg bg-emerald-500/10 p-4 text-center font-medium">
          {t("deliveredMessage")}
        </p>
      ) : null}

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">{t("items")}</h2>
        <ul className="divide-y rounded-lg border">
          {order.items.map((item, index) => (
            <li key={index} className="flex justify-between gap-4 p-3">
              <span>{item.name}</span>
              <span className="text-muted-foreground tabular-nums">× {item.quantity}</span>
            </li>
          ))}
        </ul>
        {order.fields.length > 0 ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg border p-3 text-sm">
            {order.fields.map((field, index) => (
              <div key={index} className="contents">
                <dt className="text-muted-foreground">{field.label}</dt>
                <dd>{field.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </section>

      {order.restaurant.phone ? (
        <a href={`tel:${order.restaurant.phone}`} className="text-primary text-center underline">
          {tr("call")}
        </a>
      ) : null}
    </article>
  );
}
