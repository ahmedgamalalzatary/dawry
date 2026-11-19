"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setLocale } from "@/i18n/actions";
import { api } from "@/lib/api/client";

export function LanguageSwitch() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      lang={locale === "ar" ? "en" : "ar"}
      onClick={() => start(() => setLocale(locale === "ar" ? "en" : "ar"))}
    >
      {t("switchTo")}
    </Button>
  );
}

export function SignOutButton() {
  const t = useTranslations("nav");
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await api("/api/auth/sign-out", { body: {} }).catch(() => undefined);
          router.replace("/");
          router.refresh();
        })
      }
    >
      {t("signOut")}
    </Button>
  );
}
