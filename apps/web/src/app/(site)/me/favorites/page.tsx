import type { PublicRestaurant } from "@dawry/shared";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FavoriteList } from "@/components/customer/favorite-list";
import { requireKind, serverGet } from "@/lib/api/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("me"))("nav.favorites") };
}

export default async function MeFavoritesPage() {
  await requireKind("customer");
  const favorites = await serverGet<PublicRestaurant[]>("/api/me/favorites");
  return <FavoriteList initial={favorites ?? []} />;
}
