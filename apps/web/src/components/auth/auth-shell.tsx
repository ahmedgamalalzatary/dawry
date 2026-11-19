import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { DawryLogo } from "@/components/brand/logo";
import { LanguageSwitch, ThemeToggle } from "@/components/layout/header-actions";
import { cn } from "@/lib/utils";

/** An illustrative board (labelled as a sample) so the entrance shows what Dawry does. */
const SAMPLE = [
  { invoice: "124", time: { ar: "8:40 م", en: "20:40" }, state: "preparing" },
  { invoice: "125", time: { ar: "8:46 م", en: "20:46" }, state: "late" },
  { invoice: "126", time: { ar: "8:52 م", en: "20:52" }, state: "preparing" },
  { invoice: "119", time: { ar: "8:31 م", en: "20:31" }, state: "out_for_delivery" },
] as const;

const DOT = {
  preparing: "bg-[#f2b25c]",
  late: "bg-[#ff7b6e]",
  out_for_delivery: "bg-[#b49cff]",
} as const;

/** The frame for every sign-in page: the board on one side, the form on the other. */
export async function AuthShell({
  portal,
  title,
  hint,
  links = [],
  switcher,
  children,
}: {
  /** Two sibling entrances (staff / owner) as a segmented switch above the title. */
  switcher?: { label: string; current: string; options: { href: string; label: string }[] };
  /** Who this entrance is for, shown above the title. */
  portal: string;
  title: string;
  hint?: string;
  links?: { href: string; label: string }[];
  children: ReactNode;
}) {
  const [t, ta, to, locale] = await Promise.all([
    getTranslations("auth"),
    getTranslations("app"),
    getTranslations("order"),
    getLocale(),
  ]);
  const lang = locale === "ar" ? "ar" : "en";

  return (
    <div className="flex min-h-dvh flex-1 flex-col lg:flex-row">
      {/* The board */}
      <aside className="bg-board text-board-foreground relative flex flex-col lg:w-[44%] lg:max-w-2xl">
        <div className="flex items-center justify-between gap-3 px-5 py-4 sm:px-8 lg:py-7">
          <Link href="/" aria-label={ta("name")}>
            <DawryLogo name={ta("name")} onBoard />
          </Link>
          <div className="flex items-center gap-1 lg:hidden">
            <ThemeToggle tone="board" />
            <LanguageSwitch tone="board" compact />
          </div>
        </div>

        <div className="hidden flex-1 flex-col justify-center gap-10 px-8 pb-10 lg:flex xl:px-14">
          <p className="font-heading max-w-md text-4xl leading-[1.15] font-semibold tracking-tight text-balance xl:text-5xl">
            {ta("tagline")}
          </p>
          <figure className="border-board-line bg-board-raised/50 max-w-md overflow-hidden rounded-xl border">
            <div className="text-board-muted border-board-line grid grid-cols-[4.5rem_1fr_auto] gap-4 border-b px-5 py-2.5 text-xs">
              <span>{t("sampleInvoice")}</span>
              <span>{t("sampleTime")}</span>
              <span>{t("sampleState")}</span>
            </div>
            <ul className="divide-board-line divide-y">
              {SAMPLE.map((row, i) => (
                <li
                  key={row.invoice}
                  className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-4 px-5 py-3"
                >
                  <span className="figure flap text-lg font-semibold" dir="ltr" style={{ animationDelay: `${i * 90}ms` }}>
                    #{row.invoice}
                  </span>
                  <span
                    className={cn("figure flap text-lg", row.state === "late" && "text-[#ff7b6e]")}
                    style={{ animationDelay: `${i * 90 + 45}ms` }}
                  >
                    {row.time[lang]}
                  </span>
                  <span className="text-board-muted flex items-center gap-2 text-sm">
                    <span aria-hidden className={cn("size-2 rounded-full", DOT[row.state])} />
                    {row.state === "late" ? to("lateShort") : to(`status.${row.state}`)}
                  </span>
                </li>
              ))}
            </ul>
            <figcaption className="text-board-muted border-board-line border-t px-5 py-2 text-xs">
              {t("sampleCaption")}
            </figcaption>
          </figure>
        </div>
      </aside>

      {/* The form */}
      <main className="relative flex flex-1 flex-col">
        <div className="absolute end-4 top-4 hidden items-center gap-1 lg:flex">
          <ThemeToggle />
          <LanguageSwitch />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-5 py-10 sm:py-16">
          {switcher ? (
            <nav aria-label={switcher.label} className="bg-muted grid grid-cols-2 gap-1 rounded-xl p-1">
              {switcher.options.map((o) => {
                const current = o.href === switcher.current;
                return (
                  <Link
                    key={o.href}
                    href={o.href}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "flex h-10 items-center justify-center rounded-lg text-sm font-medium transition-colors",
                      current ? "bg-surface text-foreground shadow-raise" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {o.label}
                  </Link>
                );
              })}
            </nav>
          ) : null}
          <header className="flex flex-col gap-2">
            <p className="text-muted-foreground text-sm font-medium">{portal}</p>
            <h1 className="text-[1.75rem] leading-tight font-semibold tracking-tight">{title}</h1>
            {hint ? <p className="text-muted-foreground text-sm">{hint}</p> : null}
          </header>
          {children}
          {links.length > 0 ? (
            <nav className="flex flex-col gap-2 border-t pt-6 text-sm">
              {links.map((link) => (
                <Link key={link.href} href={link.href} className="text-link font-medium hover:underline">
                  {link.label}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>
      </main>
    </div>
  );
}
