import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getMe } from "@/lib/api/server";
import { homeFor, LOGIN } from "@/lib/routes";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("auth"))("loginTitle") };
}

export default async function LoginPage() {
  const me = await getMe();
  if (me) redirect(homeFor(me));
  const t = await getTranslations("auth");

  return (
    <AuthShell
      portal={t("portals.customer")}
      title={t("loginTitle")}
      hint={t("customerHint")}
      links={[
        { href: "/signup", label: t("noAccount") },
        { href: LOGIN.staff, label: t("toRestaurant") },
      ]}
    >
      <LoginForm portal="customer" />
    </AuthShell>
  );
}
