import type { PublicRestaurant } from "@dawry/shared";
import { getTranslations } from "next-intl/server";
import { RestaurantSearch } from "@/components/customer/restaurant-search";
import { getMe, serverGet } from "@/lib/api/server";

const STEPS = ["pick", "invoice", "turn"] as const;

export default async function Home() {
  const [t, me, restaurants] = await Promise.all([
    getTranslations("home"),
    getMe(),
    serverGet<PublicRestaurant[]>("/api/public/restaurants"),
  ]);
  const favorites = me?.kind === "customer" ? await serverGet<PublicRestaurant[]>("/api/me/favorites") : null;

  return (
    <main className="flex flex-1 flex-col">
      {/* The board: what this is, and how it works, in one glance. */}
      <section className="bg-board text-board-foreground">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-7 px-4 pt-12 pb-20 sm:px-6 sm:pt-20 sm:pb-24">
          <h1 className="text-[2.5rem] leading-[1.1] font-semibold tracking-tight text-balance sm:text-6xl">
            {t("title")}
          </h1>
          <p className="text-board-muted max-w-lg text-base sm:text-lg">{t("subtitle")}</p>
          <ol className="border-board-line grid grid-cols-3 border-t pt-5">
            {STEPS.map((step, index) => (
              <li key={step} className="flex flex-col gap-1.5 pe-3">
                <span className="figure text-board-muted text-xs">{index + 1}</span>
                <span className="text-sm leading-snug font-medium">{t(`steps.${step}`)}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div className="mx-auto -mt-7 flex w-full max-w-2xl flex-col gap-10 px-4 pb-16 sm:px-6">
        <RestaurantSearch initial={restaurants ?? []} favorites={favorites} />
      </div>
    </main>
  );
}
