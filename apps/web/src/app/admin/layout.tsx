import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/layout/app-shell";
import { requireKind } from "@/lib/api/server";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const me = await requireKind("admin");
  const [t, ta] = await Promise.all([getTranslations("admin"), getTranslations("app")]);

  return (
    <AppShell
      appName={ta("name")}
      context={{ title: t("platform"), subtitle: t("role"), initial: ta("name").slice(0, 1) }}
      nav={[
        { href: "/admin", label: t("nav.overview"), icon: "overview" },
        { href: "/admin/restaurants", label: t("nav.restaurants"), icon: "restaurants" },
        { href: "/admin/reports", label: t("nav.reports"), icon: "reports" },
      ]}
      user={{ name: me.name, detail: me.username }}
      signOutTo="/super-admin"
    >
      {children}
    </AppShell>
  );
}
