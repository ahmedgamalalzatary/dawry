import type { PublicRestaurant, SavedOrder } from "@dawry/shared";
import { getTranslations } from "next-intl/server";
import { MyOrders } from "@/components/customer/my-orders";
import { RestaurantList } from "@/components/customer/restaurant-search";
import { requireKind, serverGet } from "@/lib/api/server";

export default async function MePage() {
  await requireKind("customer", "owner", "staff", "admin");
  const [t, orders, favorites] = await Promise.all([
    getTranslations("me"),
    serverGet<SavedOrder[]>("/api/me/orders"),
    serverGet<PublicRestaurant[]>("/api/me/favorites"),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <MyOrders initial={orders ?? []} renderedAt={new Date().toISOString()} />
      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">{t("favorites")}</h2>
        {favorites && favorites.length > 0 ? (
          <RestaurantList restaurants={favorites} />
        ) : (
          <p className="text-muted-foreground text-sm">{t("noFavorites")}</p>
        )}
      </section>
    </main>
  );
}
