import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getMe } from "@/lib/api/server";
import { homeFor } from "@/lib/routes";
import { LanguageSwitch, SignOutButton } from "./header-actions";

export async function SiteHeader() {
  const [t, ta, me] = await Promise.all([getTranslations("nav"), getTranslations("app"), getMe()]);
  const panel =
    me?.kind === "admin" ? t("admin") : me?.kind === "customer" ? t("myOrders") : t("dashboard");

  return (
    <header className="border-b">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">
        <Link href="/" className="text-lg font-bold">
          {ta("name")}
        </Link>
        <div className="flex flex-wrap items-center gap-1">
          {me ? (
            <>
              <Link href={homeFor(me)} className="hover:bg-muted rounded-md px-3 py-1.5 text-sm">
                {panel}
              </Link>
              {me.kind !== "customer" ? (
                <Link href="/me" className="hover:bg-muted rounded-md px-3 py-1.5 text-sm">
                  {t("myOrders")}
                </Link>
              ) : null}
              <SignOutButton />
            </>
          ) : (
            <Link href="/login" className="hover:bg-muted rounded-md px-3 py-1.5 text-sm">
              {t("login")}
            </Link>
          )}
          <LanguageSwitch />
        </div>
      </nav>
    </header>
  );
}
