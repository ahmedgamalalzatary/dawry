import Link from "next/link";
import type { ReactNode } from "react";
import { DawryMark } from "@/components/brand/logo";

/** The frame shared by sign-in and sign-up. */
export function AuthShell({
  title,
  hint,
  footer,
  children,
}: {
  title: string;
  hint?: string;
  footer: { href: string; label: string };
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <div className="bg-card flex flex-col gap-6 rounded-3xl border p-6 shadow-[0_18px_40px_-28px_rgb(22_35_63/0.5)] sm:p-8">
        <header className="flex flex-col gap-3">
          <DawryMark className="h-8" />
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {hint ? <p className="text-muted-foreground text-sm text-pretty">{hint}</p> : null}
        </header>
        {children}
      </div>
      <Link
        href={footer.href}
        className="text-muted-foreground hover:text-foreground text-center text-sm font-medium underline decoration-brand decoration-2 underline-offset-4"
      >
        {footer.label}
      </Link>
    </main>
  );
}
