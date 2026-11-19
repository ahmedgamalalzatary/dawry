import type { AdminRestaurant, PlatformStats } from "@dawry/shared";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PageBody, PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { requireKind, serverGet } from "@/lib/api/server";

export default async function AdminOverviewPage() {
  await requireKind("admin");
  const [t, tc, stats, restaurants] = await Promise.all([
    getTranslations("admin"),
    getTranslations("common"),
    serverGet<PlatformStats>("/api/admin/stats"),
    serverGet<AdminRestaurant[]>("/api/admin/restaurants"),
  ]);
  const busiest = [...(restaurants ?? [])].sort((a, b) => b.ordersToday - a.ordersToday).slice(0, 8);
  const peak = Math.max(1, ...busiest.map((r) => r.ordersToday));

  return (
    <>
      <PageHeader title={t("nav.overview")} description={t("overviewHint")} />
      <PageBody className="flex flex-col gap-10">
        {stats ? (
          /* One ruled strip of figures, read left to right like a board row. */
          <dl className="bg-surface grid grid-cols-2 overflow-hidden rounded-xl border sm:grid-cols-3 lg:grid-cols-5">
            {(
              [
                ["ordersToday", stats.ordersToday],
                ["ordersLast30Days", stats.ordersLast30Days],
                ["activeRestaurants", `${stats.activeRestaurants}/${stats.restaurants}`],
                ["restaurants", stats.restaurants],
                ["customers", stats.customers],
              ] as const
            ).map(([key, value]) => (
              <div
                key={key}
                className="flex flex-col gap-2 border-e border-b p-5 [&:nth-child(2n)]:border-e-0 sm:[&:nth-child(2n)]:border-e sm:[&:nth-child(3n)]:border-e-0 lg:border-b-0 lg:[&:nth-child(3n)]:border-e lg:last:border-e-0"
              >
                <dt className="text-muted-foreground text-xs font-medium">{t(`stats.${key}`)}</dt>
                <dd className="figure text-3xl font-semibold" dir="ltr">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        <section className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-lg font-semibold">{t("busiestToday")}</h2>
            <Link href="/admin/restaurants" className="text-link inline-flex items-center gap-1 text-sm font-medium hover:underline">
              {t("manage")}
              <ArrowLeft aria-hidden className="size-4 ltr:rotate-180" />
            </Link>
          </div>
          {busiest.length === 0 ? (
            <p className="text-muted-foreground rounded-xl border border-dashed px-5 py-10 text-center text-sm">{t("empty")}</p>
          ) : (
            <ol className="bg-surface divide-y rounded-xl border">
              {busiest.map((r) => (
                <li
                  key={r.id}
                  className="hover:bg-subtle relative grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-5 py-3.5 transition-colors sm:grid-cols-[14rem_1fr_auto]"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Link href={`/admin/restaurants/${r.id}`} className="row-link truncate font-medium">
                      {r.name}
                    </Link>
                    {r.active ? null : <Badge variant="inactive">{tc("inactive")}</Badge>}
                  </span>
                  <span aria-hidden className="bg-muted col-span-2 h-1.5 overflow-hidden rounded-full sm:col-span-1">
                    <span className="bg-foreground/70 block h-full rounded-full" style={{ width: `${(r.ordersToday / peak) * 100}%` }} />
                  </span>
                  <span className="figure col-start-2 row-start-1 text-end font-semibold sm:col-start-3">{r.ordersToday}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </PageBody>
    </>
  );
}
