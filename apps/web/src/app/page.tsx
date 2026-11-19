import type { PublicRestaurant } from "@dawry/shared";
import { getTranslations } from "next-intl/server";
import { RestaurantList, RestaurantSearch } from "@/components/customer/restaurant-search";
import { getMe, serverGet } from "@/lib/api/server";

const STEPS = ["pick", "invoice", "turn"] as const;

export default async function Home() {
  const [t, ta, me, restaurants] = await Promise.all([
    getTranslations("home"),
    getTranslations("app"),
    getMe(),
    serverGet<PublicRestaurant[]>("/api/public/restaurants"),
  ]);
  const favorites = me ? await serverGet<PublicRestaurant[]>("/api/me/favorites") : null;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 pt-8 pb-16">
      {/* The welcome is a ticket: what this is above the tear, how it works below. */}
      <section className="ticket-shadow ticket-print">
        <div className="ticket-top bg-brand text-brand-foreground rounded-t-[2rem] px-6 pt-9 pb-9 sm:px-10">
          <h1 className="text-5xl leading-[1.05] font-bold tracking-tight sm:text-6xl">{t("title")}</h1>
          <p className="mt-3 max-w-md text-lg font-medium opacity-80">{ta("tagline")}</p>
        </div>
        <div className="ticket-bottom bg-ink text-ink-foreground rounded-b-[2rem] px-6 pb-7 sm:px-10 dark:bg-[#1d2a45] dark:text-[#e7ebf3]">
          <div className="perforation mx-1 mb-6" />
          <ol className="grid gap-4 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step} className="flex items-center gap-3">
                <span className="bg-brand text-brand-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                  {index + 1}
                </span>
                <span className="text-sm font-medium">{t(`steps.${step}`)}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {favorites && favorites.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">{t("favorites")}</h2>
          <RestaurantList restaurants={favorites} />
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t("all")}</h2>
        <RestaurantSearch initial={restaurants ?? []} />
      </section>
    </main>
  );
}
