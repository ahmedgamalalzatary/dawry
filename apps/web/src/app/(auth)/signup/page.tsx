import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/signup-form";
import { getMe } from "@/lib/api/server";
import { homeFor } from "@/lib/routes";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("auth"))("signupTitle") };
}

export default async function SignUpPage() {
  const me = await getMe();
  if (me) redirect(homeFor(me));
  const t = await getTranslations("auth");

  return (
    <AuthShell
      portal={t("portals.customer")}
      title={t("signupTitle")}
      hint={t("signupHint")}
      links={[{ href: "/login", label: t("haveAccount") }]}
    >
      <SignUpForm />
    </AuthShell>
  );
}
