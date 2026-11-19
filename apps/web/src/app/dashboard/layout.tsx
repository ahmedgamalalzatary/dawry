import { Ban } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { AppShell, type ShellNavItem } from "@/components/layout/app-shell";
import { requireKind } from "@/lib/api/server";

const OWNER_PAGES = ["staff", "menu", "fields", "settings", "reports"] as const;

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const me = await requireKind("staff", "owner");
  const [t, tn, ta] = await Promise.all([
    getTranslations("dashboard"),
    getTranslations("dashboard.nav"),
    getTranslations("app"),
  ]);
  const restaurant = me.restaurant;
  const owner = me.kind === "owner";
  const name = restaurant?.name ?? ta("name");

  const nav: ShellNavItem[] = [
    { href: "/dashboard", label: tn("orders"), icon: "orders" },
    ...(owner ? OWNER_PAGES.map((key) => ({ href: `/dashboard/${key}`, label: tn(key), icon: key })) : []),
  ];

  return (
    <AppShell
      appName={ta("name")}
      context={{ title: name, subtitle: owner ? t("roleOwner") : t("roleStaff"), initial: name.slice(0, 1) }}
      nav={nav}
      external={restaurant?.slug ? { href: `/r/${restaurant.slug}`, label: t("customerPage") } : undefined}
      user={{ name: me.name, detail: me.username }}
      signOutTo={owner ? "/r/admin/login" : "/r/staff/login"}
    >
      {restaurant?.active === false ? (
        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          <span className="bg-late-soft text-late flex size-14 items-center justify-center rounded-full">
            <Ban aria-hidden className="size-7" />
          </span>
          <p role="alert" className="text-lg font-medium text-balance">
            {t("suspended")}
          </p>
        </div>
      ) : (
        children
      )}
    </AppShell>
  );
}
