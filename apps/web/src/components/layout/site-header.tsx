import { LayoutDashboard, LogIn, ShieldCheck, Ticket } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { DawryLogo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { getMe } from "@/lib/api/server";
import { homeFor } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { LanguageSwitch, SignOutButton, ThemeToggle } from "./header-actions";

const navLink = cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-muted-foreground hover:text-foreground");

export async function SiteHeader() {
  const [t, ta, me] = await Promise.all([getTranslations("nav"), getTranslations("app"), getMe()]);
  const panel =
    me?.kind === "admin" ? t("admin") : me?.kind === "customer" ? t("myOrders") : t("dashboard");
  const PanelIcon = me?.kind === "admin" ? ShieldCheck : me?.kind === "customer" ? Ticket : LayoutDashboard;

  return (
    <header className="bg-background/85 sticky top-0 z-40 border-b backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4">
        <Link
          href="/"
          aria-label={ta("name")}
          className="focus-visible:ring-ring/60 -mx-1 rounded-md px-1 outline-none focus-visible:ring-3"
        >
          <DawryLogo name={ta("name")} />
        </Link>
        <div className="flex items-center gap-1">
          {me ? (
            <>
              <Link href={homeFor(me)} className={navLink}>
                <PanelIcon />
                <span className="max-sm:sr-only">{panel}</span>
              </Link>
              {me.kind !== "customer" ? (
                <Link href="/me" className={navLink}>
                  <Ticket />
                  <span className="max-sm:sr-only">{t("myOrders")}</span>
                </Link>
              ) : null}
            </>
          ) : null}
          <ThemeToggle />
          <LanguageSwitch />
          {me ? (
            <SignOutButton />
          ) : (
            <Link href="/login" className={cn(buttonVariants({ size: "sm" }), "ms-1")}>
              <LogIn className="rtl:-scale-x-100" />
              {t("login")}
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
