import type { SavedOrder } from "@dawry/shared";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MyOrders } from "@/components/customer/my-orders";
import { requireKind, serverGet } from "@/lib/api/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("me"))("nav.history") };
}

export default async function MeHistoryPage() {
  await requireKind("customer");
  const orders = await serverGet<SavedOrder[]>("/api/me/orders");
  return <MyOrders initial={orders ?? []} renderedAt={new Date().toISOString()} scope="history" />;
}
