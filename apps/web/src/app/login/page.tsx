import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getMe } from "@/lib/api/server";
import { homeFor } from "@/lib/routes";

export default async function LoginPage() {
  const me = await getMe();
  if (me) redirect(homeFor(me));
  const t = await getTranslations("auth");

  return (
    <AuthShell title={t("loginTitle")} footer={{ href: "/signup", label: t("noAccount") }}>
      <LoginForm />
    </AuthShell>
  );
}
