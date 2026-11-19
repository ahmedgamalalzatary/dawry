import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/signup-form";
import { getMe } from "@/lib/api/server";
import { homeFor } from "@/lib/routes";

export default async function SignUpPage() {
  const me = await getMe();
  if (me) redirect(homeFor(me));
  const t = await getTranslations("auth");

  return (
    <AuthShell
      title={t("signupTitle")}
      hint={t("signupHint")}
      footer={{ href: "/login", label: t("haveAccount") }}
    >
      <SignUpForm />
    </AuthShell>
  );
}
