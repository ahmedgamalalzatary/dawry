"use client";

import { Languages, LogOut, Moon, Sun } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setLocale } from "@/i18n/actions";
import { api } from "@/lib/api/client";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

type Tone = "site" | "board";

const toneClass = (tone: Tone) =>
  tone === "board"
    ? "text-board-muted hover:bg-board-raised hover:text-board-foreground"
    : "text-muted-foreground hover:text-foreground";

export function LanguageSwitch({
  tone = "site",
  compact = false,
  className,
}: {
  tone?: Tone;
  compact?: boolean;
  className?: string;
}) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const [pending, start] = useTransition();
  const next = locale === "ar" ? "en" : "ar";
  return (
    <Button
      variant="ghost"
      size={compact ? "icon-sm" : "sm"}
      disabled={pending}
      lang={next}
      aria-label={compact ? t("switchTo") : undefined}
      title={t("switchTo")}
      className={cn(toneClass(tone), className)}
      onClick={() => start(() => setLocale(next))}
    >
      <Languages />
      {compact ? null : <span>{t("switchTo")}</span>}
    </Button>
  );
}

/** Both icons are rendered; CSS shows the right one, so server and client HTML match. */
export function ThemeToggle({ tone = "site", className }: { tone?: Tone; className?: string }) {
  const t = useTranslations("nav");
  const { theme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={t("theme")}
      title={t("theme")}
      className={cn(toneClass(tone), className)}
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <Sun className="hidden dark:block" />
      <Moon className="dark:hidden" />
    </Button>
  );
}

export function SignOutButton({
  tone = "site",
  compact = false,
  redirectTo = "/",
  className,
}: {
  tone?: Tone;
  compact?: boolean;
  redirectTo?: string;
  className?: string;
}) {
  const t = useTranslations("nav");
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size={compact ? "icon-sm" : "sm"}
      disabled={pending}
      aria-label={compact ? t("signOut") : undefined}
      title={t("signOut")}
      className={cn(toneClass(tone), className)}
      onClick={() =>
        start(async () => {
          try {
            await api("/api/auth/sign-out", { body: {} });
          } catch {
            toast.error(t("signOutFailed"));
            return;
          }
          router.replace(redirectTo);
          router.refresh();
        })
      }
    >
      <LogOut className="rtl:-scale-x-100" />
      {compact ? null : <span>{t("signOut")}</span>}
    </Button>
  );
}
