import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { SignUpForm } from "@/components/auth/signup-form";
import { getMe } from "@/lib/api/server";
import { homeFor } from "@/lib/routes";

export default async function SignUpPage() {
  const me = await getMe();
  if (me) redirect(homeFor(me));
  const t = await getTranslations("auth");

  return (
    <main className="mx-auto flex w-full max-w-sm flex-col gap-6 px-4 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">{t("signupTitle")}</h1>
        <p className="text-muted-foreground text-sm">{t("signupHint")}</p>
      </div>
      <SignUpForm />
      <Link href="/login" className="text-primary text-center text-sm underline">
        {t("haveAccount")}
      </Link>
    </main>
  );
}
