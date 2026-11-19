import { Ban, ExternalLink } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { RestaurantAvatar } from "@/components/customer/restaurant-avatar";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { buttonVariants } from "@/components/ui/button";
import { requireKind } from "@/lib/api/server";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const me = await requireKind("owner", "staff");
  const t = await getTranslations("dashboard");
  const restaurant = me.restaurant;
  const owner = me.kind === "owner";

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-6 pb-16">
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <RestaurantAvatar name={restaurant?.name ?? "?"} logoUrl={null} />
            <div className="flex min-w-0 flex-col">
              <h1 className="truncate text-2xl font-bold tracking-tight">{restaurant?.name}</h1>
              <span className="text-muted-foreground text-sm">{owner ? t("roleOwner") : t("roleStaff")}</span>
            </div>
          </div>
          {restaurant?.slug ? (
            <Link
              href={`/r/${restaurant.slug}`}
              target="_blank"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <ExternalLink aria-hidden />
              {t("customerPage")}
            </Link>
          ) : null}
        </div>
        <DashboardNav owner={owner} />
      </div>
      {restaurant?.active === false ? (
        <div
          role="alert"
          className="bg-destructive-soft text-destructive flex items-center gap-3 rounded-2xl p-5 font-medium"
        >
          <Ban aria-hidden className="size-6 shrink-0" />
          {t("suspended")}
        </div>
      ) : (
        children
      )}
    </main>
  );
}
