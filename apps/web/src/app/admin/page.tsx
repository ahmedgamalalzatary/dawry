import type { AdminRestaurant, PlatformStats } from "@dawry/shared";
import { CalendarDays, CircleCheck, ClipboardList, Store, UsersRound } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { AdminRestaurants } from "@/components/admin/admin-restaurants";
import { requireKind, serverGet } from "@/lib/api/server";

const STATS = [
  { key: "restaurants", icon: Store },
  { key: "activeRestaurants", icon: CircleCheck },
  { key: "ordersToday", icon: ClipboardList },
  { key: "ordersLast30Days", icon: CalendarDays },
  { key: "customers", icon: UsersRound },
] as const;

export default async function AdminPage() {
  await requireKind("admin");
  const [t, stats, restaurants] = await Promise.all([
    getTranslations("admin"),
    serverGet<PlatformStats>("/api/admin/stats"),
    serverGet<AdminRestaurant[]>("/api/admin/restaurants"),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pt-6 pb-16">
      <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
      {stats ? (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {STATS.map(({ key, icon: Icon }, index) => (
            <div
              key={key}
              className={
                index === 2
                  ? "bg-brand text-brand-foreground flex flex-col gap-3 rounded-2xl p-4"
                  : "bg-card flex flex-col gap-3 rounded-2xl border p-4"
              }
            >
              <dt className="flex items-center gap-2 text-sm font-medium opacity-80">
                <Icon aria-hidden className="size-4" />
                {t(`stats.${key}`)}
              </dt>
              <dd className="text-4xl leading-none font-bold tabular-nums">{stats[key]}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <AdminRestaurants initial={restaurants ?? []} />
    </main>
  );
}
