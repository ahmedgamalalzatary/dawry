"use client";

import { History, Star, Ticket } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/me", key: "active", icon: Ticket },
  { href: "/me/history", key: "history", icon: History },
  { href: "/me/favorites", key: "favorites", icon: Star },
] as const;

/** The customer's account sections, as underline tabs on the header rule. */
export function CustomerNav({ counts }: { counts: Record<(typeof LINKS)[number]["key"], number> }) {
  const t = useTranslations("me.nav");
  const pathname = usePathname();
  return (
    <nav aria-label={t("label")} className="-mx-4 -mb-px flex overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
      {LINKS.map(({ href, key, icon: Icon }) => {
        const current = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "group relative flex h-12 shrink-0 items-center gap-2 px-3.5 text-sm font-medium whitespace-nowrap transition-colors first:ps-0 sm:px-4 sm:first:ps-0",
              current ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon aria-hidden className="size-4" />
            {t(key)}
            <span
              className={cn(
                "figure min-w-6 rounded-md px-1.5 py-0.5 text-center text-xs font-semibold",
                current ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
              )}
            >
              {counts[key]}
            </span>
            <span
              aria-hidden
              className={cn(
                "bg-foreground absolute inset-x-3.5 bottom-0 h-0.5 rounded-full group-first:start-0 sm:inset-x-4",
                current ? "opacity-100" : "opacity-0",
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}
