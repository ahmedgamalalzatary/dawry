import { LayoutDashboard, ShieldCheck, Ticket } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { DawryLogo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { getMe } from "@/lib/api/server";
import { homeFor } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { LanguageSwitch, SignOutButton, ThemeToggle } from "./header-actions";

const navLink = cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-muted-foreground hover:text-foreground");

/** The public header: customers and guests. Staff and admins get a single way back to their panel. */
export async function SiteHeader() {
  const [t, ta, me] = await Promise.all([getTranslations("nav"), getTranslations("app"), getMe()]);
  const customer = me?.kind === "customer";

  return (
    <header className="bg-background/80 sticky top-0 z-40 border-b backdrop-blur-lg">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" aria-label={ta("name")} className="-mx-1 rounded-lg px-1">
          <DawryLogo name={ta("name")} />
        </Link>
        <div className="flex items-center gap-1">
          {customer ? (
            <Link href="/me" className={navLink}>
              <Ticket />
              <span className="max-sm:sr-only">{t("myOrders")}</span>
            </Link>
          ) : me ? (
            <Link href={homeFor(me)} className={navLink}>
              {me.kind === "admin" ? <ShieldCheck /> : <LayoutDashboard />}
              <span className="max-sm:sr-only">{me.kind === "admin" ? t("admin") : t("dashboard")}</span>
            </Link>
          ) : null}
          <ThemeToggle />
          <LanguageSwitch compact />
          {me ? (
            <SignOutButton compact />
          ) : (
            <Link href="/login" className={cn(buttonVariants({ size: "sm" }), "ms-1")}>
              {t("login")}
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
