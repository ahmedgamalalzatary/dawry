import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getMe } from "@/lib/api/server";
import { homeFor, LOGIN } from "@/lib/routes";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("auth"))("ownerTitle") };
}

export default async function OwnerLoginPage() {
  const me = await getMe();
  if (me) redirect(homeFor(me));
  const t = await getTranslations("auth");

  return (
    <AuthShell
      portal={t("portals.owner")}
      title={t("ownerTitle")}
      hint={t("ownerHint")}
      switcher={{
        label: t("switchLabel"),
        current: LOGIN.owner,
        options: [
          { href: LOGIN.staff, label: t("asStaff") },
          { href: LOGIN.owner, label: t("asOwner") },
        ],
      }}
    >
      <LoginForm portal="owner" />
    </AuthShell>
  );
}
