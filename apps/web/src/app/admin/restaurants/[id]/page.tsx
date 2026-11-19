import { REPORT_RANGES, type AdminRestaurantDetail } from "@dawry/shared";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminRestaurantDetailView } from "@/components/admin/admin-restaurant-detail";
import { requireKind, serverGet } from "@/lib/api/server";

const load = (id: string, days: number) =>
  serverGet<AdminRestaurantDetail>(`/api/admin/restaurants/${encodeURIComponent(id)}?days=${days}`);

export async function generateMetadata({ params }: PageProps<"/admin/restaurants/[id]">): Promise<Metadata> {
  const detail = await load((await params).id, 7);
  return detail ? { title: detail.restaurant.name } : {};
}

export default async function AdminRestaurantPage({ params, searchParams }: PageProps<"/admin/restaurants/[id]">) {
  await requireKind("admin");
  const asked = Number((await searchParams).days);
  const days = (REPORT_RANGES as readonly number[]).includes(asked) ? asked : 30;
  const detail = await load((await params).id, days);
  if (!detail) notFound();
  return <AdminRestaurantDetailView detail={detail} />;
}
