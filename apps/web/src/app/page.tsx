import type { PublicRestaurant } from "@dawry/shared";
import { getTranslations } from "next-intl/server";
import { RestaurantList, RestaurantSearch } from "@/components/customer/restaurant-search";
import { getMe, serverGet } from "@/lib/api/server";

export default async function Home() {
  const [t, ta, me, restaurants] = await Promise.all([
    getTranslations("home"),
    getTranslations("app"),
    getMe(),
    serverGet<PublicRestaurant[]>("/api/public/restaurants"),
  ]);
  const favorites = me ? await serverGet<PublicRestaurant[]>("/api/me/favorites") : null;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{ta("tagline")}</p>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>
      {favorites && favorites.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">{t("favorites")}</h2>
          <RestaurantList restaurants={favorites} />
        </section>
      ) : null}
      <RestaurantSearch initial={restaurants ?? []} />
    </main>
  );
}
