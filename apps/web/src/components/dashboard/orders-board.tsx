"use client";

import { isLate, type CustomField, type MenuItem, type OrderStatus, type StaffOrder } from "@dawry/shared";
import { ClipboardList, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { newlyLate } from "@/lib/format";
import { useLive, useNow } from "@/lib/live";
import { cn } from "@/lib/utils";
import { NewOrderForm } from "./new-order-form";
import { OrderCard } from "./order-card";

type Lane = "preparing" | "out_for_delivery" | "finished";

const LANE_OF: Record<OrderStatus, Lane> = {
  preparing: "preparing",
  out_for_delivery: "out_for_delivery",
  delivered: "finished",
  cancelled: "finished",
};

const LANE_DOT: Record<Lane, string> = {
  preparing: "bg-brand",
  out_for_delivery: "bg-teal",
  finished: "bg-muted-foreground/50",
};

export function OrdersBoard({
  initial,
  menu,
  fields,
  slug,
  renderedAt,
}: {
  initial: StaffOrder[];
  menu: MenuItem[];
  fields: CustomField[];
  slug: string;
  renderedAt: string;
}) {
  const t = useTranslations("dashboard");
  const to = useTranslations("order");
  const { data, setData, refresh } = useLive(
    "/api/restaurant/orders",
    initial,
    "/api/restaurant/events",
  );
  const now = useNow(1000, renderedAt);
  // On phones the form folds away so the orders come first.
  const [formOpen, setFormOpen] = useState(false);

  // Lateness follows the ticking clock.
  const orders = useMemo(
    () =>
      data.map((o) => ({
        ...o,
        late: isLate({ status: o.status, etaAt: new Date(o.etaAt) }, now),
      })),
    [data, now],
  );

  // One toast per order when it becomes late.
  const previous = useRef<StaffOrder[] | null>(null);
  useEffect(() => {
    for (const o of newlyLate(previous.current, orders)) {
      toast.warning(t("lateToast", { invoice: o.invoiceNumber }));
    }
    previous.current = orders;
  }, [orders, t]);

  const replace = (updated: StaffOrder) =>
    setData((current) => current.map((o) => (o.id === updated.id ? updated : o)));

  const lanes = (["preparing", "out_for_delivery", "finished"] as const).map((lane) => ({
    lane,
    orders: orders.filter((o) => LANE_OF[o.status] === lane),
  }));

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[22rem_1fr]">
      <Button
        variant="brand"
        size="lg"
        className="lg:hidden"
        aria-expanded={formOpen}
        aria-controls="new-order"
        onClick={() => setFormOpen((open) => !open)}
      >
        <Plus aria-hidden />
        {t("newOrder")}
      </Button>
      <section
        id="new-order"
        className={cn("bg-card rounded-2xl border p-5 lg:sticky lg:top-20", !formOpen && "max-lg:hidden")}
      >
        <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold">
          <span className="bg-brand text-brand-foreground flex size-7 items-center justify-center rounded-lg">
            <Plus aria-hidden className="size-4" />
          </span>
          {t("newOrder")}
        </h2>
        <NewOrderForm
          menu={menu}
          fields={fields}
          onCreated={() => {
            toast.success(t("created"));
            setFormOpen(false);
            void refresh();
          }}
        />
      </section>

      <div className="flex flex-col gap-8">
        {orders.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-16 text-center">
            <ClipboardList aria-hidden className="size-10 opacity-50" />
            <p className="text-foreground font-semibold">{t("empty")}</p>
            <p className="max-w-xs text-sm">{t("emptyHint")}</p>
          </div>
        ) : (
          lanes
            .filter(({ orders: list }) => list.length > 0)
            .map(({ lane, orders: list }) => (
              <section key={lane} aria-labelledby={`lane-${lane}`} className="flex flex-col gap-3">
                <h2 id={`lane-${lane}`} className="flex items-center gap-2 font-semibold">
                  <span aria-hidden className={cn("size-2.5 rounded-full", LANE_DOT[lane])} />
                  {lane === "finished" ? t("finished") : to(`status.${lane}`)}
                  <span className="bg-secondary text-muted-foreground rounded-full px-2 py-0.5 text-xs tabular-nums">
                    {list.length}
                  </span>
                </h2>
                <ul className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                  {list.map((order) => (
                    <OrderCard
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
              </section>
            ))
        )}
      </div>
    </div>
  );
}
