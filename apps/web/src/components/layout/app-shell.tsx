"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import {
  ArrowRight,
  BarChart3,
  ClipboardList,
  Eye,
  LayoutGrid,
  ListPlus,
  Menu as MenuIcon,
  Settings,
  Store,
  UsersRound,
  UtensilsCrossed,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { DawryLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LanguageSwitch, SignOutButton, ThemeToggle } from "./header-actions";

const ICONS = {
  orders: ClipboardList,
  staff: UsersRound,
  menu: UtensilsCrossed,
  fields: ListPlus,
  settings: Settings,
  reports: BarChart3,
  overview: LayoutGrid,
  restaurants: Store,
} as const;

export interface ShellNavItem {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
}

export interface ShellProps {
  appName: string;
  /** The place this panel manages (restaurant name, or "Platform"). */
  context: { title: string; subtitle: string; initial: string };
  nav: ShellNavItem[];
  /** An outbound link under the nav (the restaurant's public page). */
  external?: { href: string; label: string };
  user: { name: string; detail: string };
  signOutTo: string;
  children: ReactNode;
}

/**
 * The working shell: an ink "board" sidebar at the inline start, the concourse
 * on the other side. On phones and tablets the board folds into a drawer behind
 * a top bar.
 */
export function AppShell(props: ShellProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const current = [...props.nav]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  return (
    <div className="flex min-h-dvh flex-1">
      {/* Desktop board */}
      <aside className="bg-board text-board-foreground sticky top-0 hidden h-dvh w-64 shrink-0 flex-col lg:flex print:hidden">
        <BoardContent {...props} currentHref={current?.href} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Phone/tablet top bar */}
        <header className="bg-board text-board-foreground sticky top-0 z-30 flex h-14 items-center gap-2 px-2 lg:hidden print:hidden">
          <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
            <DialogPrimitive.Trigger
              render={<Button variant="board" size="icon" aria-label={t("openMenu")} />}
            >
              <MenuIcon />
            </DialogPrimitive.Trigger>
            <DialogPrimitive.Portal>
              <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-[#0c0b0a]/60 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0" />
              <DialogPrimitive.Popup className="bg-board text-board-foreground fixed inset-y-0 start-0 z-50 flex w-[min(20rem,86vw)] flex-col outline-none transition-transform duration-300 ease-(--ease-out-expo) data-ending-style:-translate-x-full data-starting-style:-translate-x-full rtl:data-ending-style:translate-x-full rtl:data-starting-style:translate-x-full">
                <DialogPrimitive.Title className="sr-only">{props.appName}</DialogPrimitive.Title>
                <DialogPrimitive.Close
                  render={
                    <Button variant="board" size="icon-sm" aria-label={t("closeMenu")} className="absolute top-4 end-3" />
                  }
                >
                  <X />
                </DialogPrimitive.Close>
                <BoardContent {...props} currentHref={current?.href} onNavigate={() => setOpen(false)} />
              </DialogPrimitive.Popup>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>
          <span className="font-heading min-w-0 flex-1 truncate font-semibold">{current?.label ?? props.context.title}</span>
        </header>

        <main className="flex min-w-0 flex-1 flex-col">{props.children}</main>
      </div>
    </div>
  );
}

function BoardContent({
  appName,
  context,
  nav,
  external,
  user,
  signOutTo,
  currentHref,
  onNavigate,
}: ShellProps & { currentHref?: string; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <DawryLogo name={appName} onBoard />
      </div>

      {/* Which board this is */}
      <div className="mx-3 mb-4 flex items-center gap-3 rounded-xl px-2 py-2">
        <span
          aria-hidden
          className="bg-board-raised font-heading flex size-9 shrink-0 items-center justify-center rounded-lg text-base font-semibold"
        >
          {context.initial}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold">{context.title}</span>
          <span className="text-board-muted truncate text-xs">{context.subtitle}</span>
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3">
        <ul className="flex flex-col gap-0.5">
          {nav.map((item) => {
            const Icon = ICONS[item.icon];
            const active = item.href === currentHref;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                    active
                      ? "bg-board-raised text-board-foreground"
                      : "text-board-muted hover:bg-board-raised/60 hover:text-board-foreground",
                  )}
                >
                  <Icon aria-hidden className={cn("size-[1.125rem]", active && "text-[#4cc898]")} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
        {external ? (
          <Link
            href={external.href}
            onClick={onNavigate}
            className="text-board-muted hover:text-board-foreground hover:bg-board-raised/60 mt-4 flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors"
          >
            <Eye aria-hidden className="size-[1.125rem]" />
            {external.label}
          </Link>
        ) : null}
      </nav>

      {/* Who is signed in, then the two display preferences side by side. */}
      <div className="border-board-line flex flex-col gap-3 border-t px-3 pt-4 pb-3">
        <div className="flex items-center gap-3 px-2">
          <span
            aria-hidden
            className="bg-board-raised font-heading flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
          >
            {user.name.slice(0, 1)}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-sm font-medium">{user.name}</span>
            <span className="figure text-board-muted truncate text-xs" dir="ltr">
              {user.detail}
            </span>
          </span>
          <SignOutButton tone="board" compact redirectTo={signOutTo} />
        </div>
        <div className="border-board-line grid grid-cols-[auto_1fr] items-center overflow-hidden rounded-lg border">
          <ThemeToggle tone="board" className="border-board-line h-9 w-11 rounded-none border-e" />
          <LanguageSwitch tone="board" className="h-9 justify-center rounded-none" />
        </div>
      </div>
    </div>
  );
}

/** The title row at the top of every panel page. */
export function PageHeader({
  title,
  description,
  actions,
  back,
  meta,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** The list this page was opened from. */
  back?: { href: string; label: string };
  /** Badges next to the title. */
  meta?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="border-b">
      <div className={cn("mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 pt-6 sm:px-8 sm:pt-8", children ? "pb-0" : "pb-5")}>
        {back ? (
          <Link
            href={back.href}
            className="text-muted-foreground hover:text-foreground -mb-2 inline-flex items-center gap-1.5 self-start text-sm font-medium"
          >
            <ArrowRight aria-hidden className="size-4 ltr:rotate-180" />
            {back.label}
          </Link>
        ) : null}
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-[1.75rem]">{title}</h1>
              {meta}
            </div>
            {description ? <p className="text-muted-foreground max-w-2xl text-sm">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
        {children}
      </div>
    </div>
  );
}

/** The page body under a PageHeader. */
export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 sm:py-8", className)}>{children}</div>;
}
