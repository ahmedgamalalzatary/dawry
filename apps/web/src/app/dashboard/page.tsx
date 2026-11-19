import { businessDay, type CustomField, type MenuItem, type StaffOrder } from "@dawry/shared";
import { getTimeZone } from "next-intl/server";
import { OrdersBoard } from "@/components/dashboard/orders-board";
import { requireKind, serverGet } from "@/lib/api/server";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export default async function OrdersPage({ searchParams }: PageProps<"/dashboard">) {
  const me = await requireKind("staff", "owner");
  const params = await searchParams;
  const timeZone = await getTimeZone();
  const renderedAt = new Date();
  const today = businessDay(renderedAt, timeZone);
  const asked = typeof params.day === "string" && DAY.test(params.day) && params.day < today ? params.day : today;

  const [orders, menu, fields] = await Promise.all([
    serverGet<StaffOrder[]>(asked === today ? "/api/restaurant/orders" : `/api/restaurant/orders?day=${asked}`),
    serverGet<MenuItem[]>("/api/restaurant/menu"),
    serverGet<CustomField[]>("/api/restaurant/fields"),
  ]);

  return (
    <OrdersBoard
      key={asked}
      initial={orders ?? []}
      menu={menu ?? []}
      fields={fields ?? []}
      slug={me.restaurant?.slug ?? ""}
      renderedAt={renderedAt.toISOString()}
      day={asked}
      today={today}
    />
  );
}
