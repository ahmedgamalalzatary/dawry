"use client";

import { isLate, type CustomField, type MenuItem, type StaffOrder } from "@dawry/shared";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { newlyLate } from "@/lib/format";
import { useLive, useNow } from "@/lib/live";
import { NewOrderForm } from "./new-order-form";
import { OrderCard } from "./order-card";

export function OrdersBoard({
  initial,
  menu,
  fields,
  slug,
}: {
  initial: StaffOrder[];
  menu: MenuItem[];
  fields: CustomField[];
  slug: string;
}) {
  const t = useTranslations("dashboard");
  const { data, setData, refresh } = useLive(
    "/api/restaurant/orders",
    initial,
    "/api/restaurant/events",
  );
  const now = useNow();

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

  return (
    <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
      <section className="bg-card h-fit rounded-xl border p-4">
        <h2 className="mb-4 text-lg font-semibold">{t("newOrder")}</h2>
        <NewOrderForm
          menu={menu}
          fields={fields}
          onCreated={() => {
            toast.success(t("created"));
            void refresh();
          }}
        />
      </section>
      <section>
        {orders.length === 0 ? (
          <p className="text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {orders.map((order) => (
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
        )}
      </section>
    </div>
  );
}
