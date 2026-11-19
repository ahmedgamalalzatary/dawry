import type { CustomField, MenuItem, StaffOrder } from "@dawry/shared";
import { OrdersBoard } from "@/components/dashboard/orders-board";
import { requireKind, serverGet } from "@/lib/api/server";

export default async function OrdersPage() {
  const me = await requireKind("owner", "staff");
  const [orders, menu, fields] = await Promise.all([
    serverGet<StaffOrder[]>("/api/restaurant/orders"),
    serverGet<MenuItem[]>("/api/restaurant/menu"),
    serverGet<CustomField[]>("/api/restaurant/fields"),
  ]);

  return (
    <OrdersBoard
      initial={orders ?? []}
      menu={menu ?? []}
      fields={fields ?? []}
      slug={me.restaurant?.slug ?? ""}
      renderedAt={new Date().toISOString()}
    />
  );
}
