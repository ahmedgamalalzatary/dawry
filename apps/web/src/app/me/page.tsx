import type { PublicRestaurant, SavedOrder } from "@dawry/shared";
import { Star } from "lucide-react";
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
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-4 pt-8 pb-16">
      <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
      <MyOrders initial={orders ?? []} renderedAt={new Date().toISOString()} />
      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Star aria-hidden className="fill-brand text-brand-strong size-5" />
          {t("favorites")}
        </h2>
        {favorites && favorites.length > 0 ? (
          <RestaurantList restaurants={favorites} />
        ) : (
          <p className="text-muted-foreground rounded-2xl border border-dashed px-4 py-6 text-center text-sm">
            {t("noFavorites")}
          </p>
        )}
      </section>
    </main>
  );
}
