import type { AdminRestaurant } from "@dawry/shared";
import { getTranslations } from "next-intl/server";
import { AdminRestaurants } from "@/components/admin/admin-restaurants";
import { requireKind, serverGet } from "@/lib/api/server";

export default async function AdminRestaurantsPage() {
  await requireKind("admin");
  const [t, restaurants] = await Promise.all([
    getTranslations("admin"),
    serverGet<AdminRestaurant[]>("/api/admin/restaurants"),
  ]);
  return <AdminRestaurants initial={restaurants ?? []} title={t("nav.restaurants")} description={t("restaurantsHint")} />;
}
