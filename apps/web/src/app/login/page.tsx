import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/auth/login-form";
import { getMe } from "@/lib/api/server";
import { homeFor } from "@/lib/routes";

export default async function LoginPage() {
  const me = await getMe();
  if (me) redirect(homeFor(me));
  const t = await getTranslations("auth");

  return (
    <main className="mx-auto flex w-full max-w-sm flex-col gap-6 px-4 py-12">
      <h1 className="text-2xl font-bold">{t("loginTitle")}</h1>
      <LoginForm />
      <Link href="/signup" className="text-primary text-center text-sm underline">
        {t("noAccount")}
      </Link>
    </main>
  );
}
