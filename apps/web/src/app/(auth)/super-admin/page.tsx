import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getMe } from "@/lib/api/server";
import { homeFor } from "@/lib/routes";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function SuperAdminLoginPage() {
  const me = await getMe();
  if (me) redirect(homeFor(me));
  const t = await getTranslations("auth");

  return (
    <AuthShell portal={t("portals.admin")} title={t("adminTitle")} hint={t("adminHint")}>
      <LoginForm portal="admin" />
    </AuthShell>
  );
}
