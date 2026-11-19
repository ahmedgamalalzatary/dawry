import type { StaffOrder } from "@dawry/shared";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { OrderDetail } from "@/components/dashboard/order-detail";
import { requireKind, serverGet } from "@/lib/api/server";

export async function generateMetadata({ params }: PageProps<"/dashboard/orders/[id]">): Promise<Metadata> {
  const { id } = await params;
  const order = await serverGet<StaffOrder>(`/api/restaurant/orders/${encodeURIComponent(id)}`);
  const t = await getTranslations("dashboard");
  return { title: order ? t("invoiceLabel", { number: order.invoiceNumber }) : t("ordersTitle") };
}

export default async function OrderPage({ params }: PageProps<"/dashboard/orders/[id]">) {
  const me = await requireKind("staff", "owner");
  const { id } = await params;
  const order = await serverGet<StaffOrder>(`/api/restaurant/orders/${encodeURIComponent(id)}`);
  if (!order) notFound();
  return <OrderDetail initial={order} slug={me.restaurant?.slug ?? ""} renderedAt={new Date().toISOString()} owner={me.kind === "owner"} />;
}
