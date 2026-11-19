import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireKind } from "@/lib/api/server";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const me = await requireKind("owner", "staff");
  const t = await getTranslations("dashboard");
  const tabs = [
    { href: "/dashboard", label: t("nav.orders") },
    ...(me.kind === "owner"
      ? [
          { href: "/dashboard/staff", label: t("nav.staff") },
          { href: "/dashboard/menu", label: t("nav.menu") },
          { href: "/dashboard/fields", label: t("nav.fields") },
          { href: "/dashboard/settings", label: t("nav.settings") },
          { href: "/dashboard/reports", label: t("nav.reports") },
        ]
      : []),
  ];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{me.restaurant?.name}</h1>
        <nav className="flex flex-wrap gap-1">
          {tabs.map((tab) => (
            <Link key={tab.href} href={tab.href} className="hover:bg-muted rounded-md px-3 py-1.5 text-sm">
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
      {me.restaurant?.active === false ? (
        <p className="bg-destructive/10 text-destructive rounded-lg p-4">{t("suspended")}</p>
      ) : (
        children
      )}
    </main>
  );
}
