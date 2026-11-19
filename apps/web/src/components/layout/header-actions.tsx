"use client";

import { Languages, LogOut, Moon, Sun } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setLocale } from "@/i18n/actions";
import { api } from "@/lib/api/client";
import { useTheme } from "@/lib/theme";

export function LanguageSwitch() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const [pending, start] = useTransition();
  const next = locale === "ar" ? "en" : "ar";
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      lang={next}
      className="text-muted-foreground hover:text-foreground"
      onClick={() => start(() => setLocale(next))}
    >
      <Languages />
      <span className="max-sm:sr-only">{t("switchTo")}</span>
    </Button>
  );
}

/** Both icons are rendered; CSS shows the right one, so server and client HTML match. */
export function ThemeToggle() {
  const t = useTranslations("nav");
  const { theme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={t("theme")}
      className="text-muted-foreground hover:text-foreground"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <Sun className="hidden dark:block" />
      <Moon className="dark:hidden" />
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
      className="text-muted-foreground hover:text-foreground"
      onClick={() =>
        start(async () => {
          await api("/api/auth/sign-out", { body: {} }).catch(() => undefined);
          router.replace("/");
          router.refresh();
        })
      }
    >
      <LogOut className="rtl:-scale-x-100" />
      <span className="max-sm:sr-only">{t("signOut")}</span>
    </Button>
  );
}
