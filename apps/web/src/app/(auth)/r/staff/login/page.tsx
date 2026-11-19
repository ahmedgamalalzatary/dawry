import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getMe } from "@/lib/api/server";
import { homeFor, LOGIN } from "@/lib/routes";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("auth"))("staffTitle") };
}

export default async function StaffLoginPage() {
  const me = await getMe();
  if (me) redirect(homeFor(me));
  const t = await getTranslations("auth");

  return (
    <AuthShell
      portal={t("portals.staff")}
      title={t("staffTitle")}
      hint={t("staffHint")}
      switcher={{
        label: t("switchLabel"),
        current: LOGIN.staff,
        options: [
          { href: LOGIN.staff, label: t("asStaff") },
          { href: LOGIN.owner, label: t("asOwner") },
        ],
      }}
    >
      <LoginForm portal="staff" />
    </AuthShell>
  );
}
