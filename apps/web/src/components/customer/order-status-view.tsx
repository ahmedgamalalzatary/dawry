"use client";

import type { OrderStatus, PublicOrder } from "@dawry/shared";
import { Bike, BookmarkCheck, Check, PackageCheck, Phone, TriangleAlert, XCircle } from "lucide-react";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { Flap } from "@/components/ui/flap";
import { etaDisplay, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FavoriteButton } from "./favorite-button";
import { RestaurantAvatar } from "./restaurant-avatar";

const STEPS: OrderStatus[] = ["preparing", "out_for_delivery", "delivered"];

/**
 * The customer's order as a departure: the board at the top answers "how long,
 * and how many before me"; the concourse below holds the timetable and the receipt.
 */
export function OrderStatusView({
  order,
  now,
  live = false,
  saved = false,
  favorite = null,
}: {
  order: PublicOrder;
  now: Date;
  live?: boolean;
  saved?: boolean;
  favorite?: boolean | null;
}) {
  const t = useTranslations("order");
  const tr = useTranslations("restaurant");

  return (
    <article className="flex flex-1 flex-col">
      {/* The board */}
      <section className="bg-board text-board-foreground">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 pt-5 pb-7 sm:px-6 sm:pt-8 sm:pb-9">
          <div className="flex items-center gap-3">
            <RestaurantAvatar
              name={order.restaurant.name}
              logoUrl={order.restaurant.logoUrl}
              className="bg-board-raised text-board-foreground size-9 rounded-lg text-sm"
            />
            <span className="min-w-0 flex-1 truncate font-medium">{order.restaurant.name}</span>
            {live ? (
              <span className="flex items-center gap-2 text-xs text-[#4cc898]">
                <span className="live-dot" aria-hidden />
                {t("live")}
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-heading text-board-muted text-sm font-medium">
              {t("invoice", { number: order.invoiceNumber })}
            </h1>
            {favorite !== null ? <FavoriteButton slug={order.restaurant.slug} initial={favorite} /> : null}
          </div>

          {order.status === "preparing" ? <Departure order={order} now={now} /> : <Arrival status={order.status} />}
        </div>
      </section>

      {/* The concourse */}
      <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-4 py-7 sm:px-6">
        {order.status !== "cancelled" ? <Timeline current={order.status} /> : null}

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">{t("items")}</h2>
          <ul className="bg-surface divide-y rounded-xl border">
            {order.items.map((item, index) => (
              <li key={index} className="flex items-baseline justify-between gap-4 px-4 py-3">
                <span className="font-medium">{item.name}</span>
                <span className="figure text-muted-foreground shrink-0" dir="ltr">
                  × {item.quantity}
                </span>
              </li>
            ))}
          </ul>
          {order.fields.length > 0 ? (
            <dl className="text-sm">
              {order.fields.map((field, index) => (
                <div key={index} className="flex justify-between gap-4 border-b border-dashed py-2.5 last:border-b-0">
                  <dt className="text-muted-foreground">{field.label}</dt>
                  <dd className="font-medium">{field.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </section>

        <div className="flex flex-col gap-3">
          {order.restaurant.phone ? (
            <a
              href={`tel:${order.restaurant.phone}`}
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}
            >
              <Phone />
              {tr("call")}
            </a>
          ) : null}
          {saved ? (
            <p className="text-muted-foreground flex items-center justify-center gap-1.5 text-xs">
              <BookmarkCheck aria-hidden className="size-3.5" />
              {t("saved")}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

/** While preparing: two board columns, the time and the line ahead. */
function Departure({ order, now }: { order: PublicOrder; now: Date }) {
  const t = useTranslations("order");
  const locale = useLocale();
  const timeZone = useTimeZone();
  const eta = etaDisplay(order.etaMode, order.etaAt, now);

  // Late: a 0:00 countdown says nothing useful, show the expected time instead.
  const showClock = order.late || eta.kind === "clock";
  const clock = formatTime(order.etaAt, locale, timeZone);
  const sentence = showClock
    ? t("eta.at", { time: clock })
    : eta.kind === "countdown"
      ? t("eta.countdown", { remaining: eta.remaining })
      : t("eta.minutes", { minutes: eta.minutes });

  return (
    <div className="flex flex-col gap-4">
      <p className="sr-only">{sentence}</p>
      <p className="sr-only">{t("ahead", { count: order.ordersAhead })}</p>

      <div aria-hidden className="border-board-line grid grid-cols-[1.4fr_1fr] overflow-hidden rounded-xl border">
        <div className="border-board-line flex flex-col gap-1 border-e p-4 sm:p-5">
          <span className="text-board-muted text-xs font-medium">
            {showClock ? t("expectedAt") : eta.kind === "countdown" ? t("readyIn") : t("about")}
          </span>
          {/* Countdowns read left-to-right; an Arabic clock time keeps its own order ("8:45 م"). */}
          <span
            className={cn(
              "figure text-[2.75rem] leading-none font-semibold tracking-tight sm:text-6xl",
              order.late && "text-[#ff7b6e]",
            )}
            dir={showClock ? undefined : "ltr"}
          >
            {showClock ? (
              <ClockFigure clock={clock} />
            ) : eta.kind === "countdown" ? (
              eta.remaining
            ) : eta.kind === "minutes" ? (
              <>
                <Flap value={eta.minutes} />
                <span className="text-board-muted ms-1.5 text-base font-normal">{t("minutesUnit")}</span>
              </>
            ) : null}
          </span>
          {eta.kind === "countdown" && !order.late ? (
            <span className="text-board-muted mt-1 text-xs">{t("eta.at", { time: clock })}</span>
          ) : null}
        </div>
        <div className="flex flex-col gap-1 p-4 sm:p-5">
          <span className="text-board-muted text-xs font-medium">{t("aheadLabel")}</span>
          {order.ordersAhead === 0 ? (
            <span className="font-heading pt-1 text-2xl leading-tight font-semibold text-[#4cc898] sm:text-3xl">
              {t("next")}
            </span>
          ) : (
            <span className="text-[2.75rem] leading-none font-semibold sm:text-6xl">
              <Flap value={order.ordersAhead} />
            </span>
          )}
        </div>
      </div>

      {order.late ? (
        <p role="alert" className="flex items-start gap-2.5 rounded-lg bg-[#ff7b6e]/12 px-4 py-3 text-sm text-[#ffb3aa]">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-[#ff7b6e]" />
          {t("late")}
        </p>
      ) : null}
    </div>
  );
}

/** "8:45 م" as a board figure: the digits large, the AM/PM marker small beside them. */
function ClockFigure({ clock }: { clock: string }) {
  const [digits, ...marker] = clock.split(" ");
  return (
    <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
      <Flap value={clock}>{digits}</Flap>
      {marker.length > 0 ? <span className="text-board-muted text-lg font-normal">{marker.join(" ")}</span> : null}
    </span>
  );
}

/** After preparing: one signal and one sentence. */
function Arrival({ status }: { status: Exclude<OrderStatus, "preparing"> }) {
  const t = useTranslations("order");
  const view = {
    out_for_delivery: { icon: Bike, tone: "text-[#b49cff]", message: t("outMessage") },
    delivered: { icon: PackageCheck, tone: "text-[#4cc898]", message: t("deliveredMessage") },
    cancelled: { icon: XCircle, tone: "text-board-muted", message: t("cancelledMessage") },
  }[status];
  const Icon = view.icon;
  return (
    <div className="border-board-line flex items-center gap-4 rounded-xl border p-5">
      <Icon aria-hidden className={cn("size-10 shrink-0", view.tone)} strokeWidth={1.5} />
      <div className="flex flex-col gap-1">
        <span className={cn("font-heading text-xl font-semibold", view.tone)}>{t(`status.${status}`)}</span>
        <p className="text-board-foreground/85 text-sm">{view.message}</p>
      </div>
    </div>
  );
}

/** The route as a line of stops; the current stop is marked. */
function Timeline({ current }: { current: OrderStatus }) {
  const t = useTranslations("order");
  const currentIndex = STEPS.indexOf(current);

  return (
    <ol aria-label="Status" className="grid grid-cols-3">
      {STEPS.map((status, index) => {
        const reached = index <= currentIndex;
        const done = index < currentIndex || current === "delivered";
        return (
          <li
            key={status}
            aria-current={status === current ? "step" : undefined}
            className="relative flex flex-col gap-2.5"
          >
            <span className="flex items-center">
              <span
                className={cn(
                  "relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border-2",
                  done
                    ? "border-go bg-go text-white dark:text-[#04140e]"
                    : reached
                      ? "border-preparing bg-surface"
                      : "border-border-strong bg-surface",
                )}
              >
                {done ? (
                  <Check aria-hidden className="size-3.5" strokeWidth={3} />
                ) : reached ? (
                  <span className="bg-preparing size-2 rounded-full" />
                ) : null}
              </span>
              {index < STEPS.length - 1 ? (
                <span aria-hidden className={cn("h-0.5 flex-1", index < currentIndex ? "bg-go" : "bg-border-strong")} />
              ) : null}
            </span>
            <span className={cn("text-xs font-medium", reached ? "text-foreground" : "text-muted-foreground")}>
              {t(`status.${status}`)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
