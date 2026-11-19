import type { AdminRestaurant, PlatformStats } from "@dawry/shared";
import { getTranslations } from "next-intl/server";
import { AdminRestaurants } from "@/components/admin/admin-restaurants";
import { requireKind, serverGet } from "@/lib/api/server";

const STAT_KEYS = [
  "restaurants",
  "activeRestaurants",
  "ordersToday",
  "ordersLast30Days",
  "customers",
] as const;

export default async function AdminPage() {
  await requireKind("admin");
  const [t, stats, restaurants] = await Promise.all([
    getTranslations("admin"),
    serverGet<PlatformStats>("/api/admin/stats"),
    serverGet<AdminRestaurant[]>("/api/admin/restaurants"),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      {stats ? (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {STAT_KEYS.map((key) => (
            <div key={key} className="bg-card flex flex-col gap-1 rounded-xl border p-4">
              <dt className="text-muted-foreground text-sm">{t(`stats.${key}`)}</dt>
              <dd className="text-2xl font-bold tabular-nums">{stats[key]}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <AdminRestaurants initial={restaurants ?? []} />
    </main>
  );
}
