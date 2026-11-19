import { businessDay, type MenuItemDetail } from "@dawry/shared";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTimeZone } from "next-intl/server";
import { MenuItemDetailView } from "@/components/dashboard/menu-item-detail";
import { requireKind, serverGet } from "@/lib/api/server";

const load = (id: string) => serverGet<MenuItemDetail>(`/api/restaurant/menu/${encodeURIComponent(id)}`);

export async function generateMetadata({ params }: PageProps<"/dashboard/menu/[id]">): Promise<Metadata> {
  const detail = await load((await params).id);
  return detail ? { title: detail.item.name } : {};
}

export default async function MenuItemPage({ params }: PageProps<"/dashboard/menu/[id]">) {
  await requireKind("owner");
  const detail = await load((await params).id);
  if (!detail) notFound();
  const today = businessDay(new Date(), await getTimeZone());
  return <MenuItemDetailView detail={detail} today={today} />;
}
