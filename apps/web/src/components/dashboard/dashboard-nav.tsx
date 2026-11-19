"use client";

import { BarChart3, ClipboardList, ListPlus, Settings, UsersRound, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard", key: "orders", icon: ClipboardList, ownerOnly: false },
  { href: "/dashboard/staff", key: "staff", icon: UsersRound, ownerOnly: true },
  { href: "/dashboard/menu", key: "menu", icon: UtensilsCrossed, ownerOnly: true },
  { href: "/dashboard/fields", key: "fields", icon: ListPlus, ownerOnly: true },
  { href: "/dashboard/settings", key: "settings", icon: Settings, ownerOnly: true },
  { href: "/dashboard/reports", key: "reports", icon: BarChart3, ownerOnly: true },
] as const;

export function DashboardNav({ owner }: { owner: boolean }) {
  const t = useTranslations("dashboard.nav");
  const pathname = usePathname();
  const tabs = TABS.filter((tab) => owner || !tab.ownerOnly);

  return (
    <nav className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]">
      <ul className="bg-secondary/70 flex w-max gap-1 rounded-xl p-1">
        {tabs.map(({ href, key, icon: Icon }) => {
          const current = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "focus-visible:ring-ring/60 flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3",
                  current
                    ? "bg-card text-foreground shadow-[0_1px_2px_rgb(22_35_63/0.12),0_0_0_1px_var(--border)]"
                    : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
                )}
              >
                <Icon aria-hidden className={cn("size-4", current && "text-brand-strong")} />
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
