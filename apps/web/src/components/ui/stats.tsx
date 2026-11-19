import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface Stat {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "late" | "go";
}

/** A ruled strip of headline figures. Hairlines come from the 1px gap over the border colour. */
export function StatStrip({ items, className }: { items: Stat[]; className?: string }) {
  return (
    <dl
      className={cn(
        "bg-border grid grid-cols-2 gap-px overflow-hidden rounded-xl border",
        items.length >= 4 ? "lg:grid-cols-4" : "sm:grid-cols-3",
        items.length === 5 && "lg:grid-cols-5",
        items.length === 6 && "lg:grid-cols-6",
        className,
      )}
    >
      {items.map((s) => (
        <div key={s.label} className="bg-surface flex flex-col gap-1.5 p-4 sm:p-5">
          <dt className="text-muted-foreground text-xs font-medium">{s.label}</dt>
          <dd
            className={cn(
              "figure text-2xl font-semibold sm:text-[1.75rem]",
              s.tone === "late" && "text-late",
              s.tone === "go" && "text-go",
            )}
          >
            {s.value}
          </dd>
          {s.hint ? <dd className="text-muted-foreground text-xs">{s.hint}</dd> : null}
        </div>
      ))}
    </dl>
  );
}

/** A titled block of a report or detail page. */
export function Panel({
  title,
  description,
  actions,
  children,
  className,
  flush = false,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Content runs to the panel's edges (lists, tables). */
  flush?: boolean;
}) {
  return (
    <section className={cn("bg-surface flex min-w-0 flex-col overflow-hidden rounded-xl border", className)}>
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 border-b px-5 py-3.5">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-[0.9375rem] font-semibold">{title}</h2>
          {description ? <p className="text-muted-foreground text-xs">{description}</p> : null}
        </div>
        {actions}
      </header>
      <div className={cn(!flush && "p-5")}>{children}</div>
    </section>
  );
}

export interface Bar {
  key: string;
  /** Axis label (shown for every `labelEvery`-th bar). */
  label: string;
  value: number;
  /** Hover / focus readout, e.g. "20:00 · 14 orders". */
  readout: string;
  highlight?: boolean;
}

/**
 * Vertical bars for one series (orders per hour, per day, per bucket). One hue,
 * the highlighted bar in the signal colour, readouts on hover and keyboard focus.
 */
export function BarChart({
  bars,
  label,
  labelEvery = 1,
  height = 160,
}: {
  bars: Bar[];
  label: string;
  labelEvery?: number;
  height?: number;
}) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <figure aria-label={label} className="flex flex-col gap-2">
      <div className="relative" style={{ height }}>
        {/* Recessive gridlines at half and full. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 flex flex-col justify-between">
          <span className="border-border border-t border-dashed" />
          <span className="border-border border-t border-dashed" />
          <span className="border-border-strong border-t" />
        </div>
        <ul className="absolute inset-0 flex items-end gap-0.5" dir="ltr">
          {bars.map((b) => (
            <li key={b.key} className="group relative flex h-full min-w-0 flex-1 items-end">
              <span
                tabIndex={0}
                aria-label={b.readout}
                className={cn(
                  "block w-full rounded-t-[4px] outline-none transition-colors",
                  b.highlight ? "bg-go" : "bg-foreground/75 group-hover:bg-foreground dark:bg-foreground/60",
                  "focus-visible:ring-ring focus-visible:ring-2",
                )}
                style={{ height: b.value === 0 ? 2 : `${Math.max(3, (b.value / max) * 100)}%`, opacity: b.value === 0 ? 0.25 : 1 }}
              />
              <span
                role="tooltip"
                className="bg-popover text-foreground shadow-float pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 rounded-md border px-2 py-1 text-xs whitespace-nowrap opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
              >
                {b.readout}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div aria-hidden className="text-muted-foreground flex h-4 gap-0.5 text-[0.6875rem]" dir="ltr">
        {bars.map((b, i) => (
          <span key={b.key} className="relative min-w-0 flex-1">
            {i % labelEvery === 0 ? (
              <span className="figure absolute start-1/2 -translate-x-1/2 whitespace-nowrap">{b.label}</span>
            ) : null}
          </span>
        ))}
      </div>
    </figure>
  );
}

export interface RankRow {
  key: string;
  label: ReactNode;
  value: number;
  /** Shown after the bar, e.g. "12 orders". */
  detail?: ReactNode;
  href?: string;
}

/** A ranked list with proportional bars (top items, busiest restaurants). */
export function RankList({ rows, empty }: { rows: RankRow[]; empty: string }) {
  if (rows.length === 0) return <p className="text-muted-foreground px-5 py-10 text-center text-sm">{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ol className="divide-y">
      {rows.map((r, i) => (
        <li key={r.key} className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-5 py-3">
          <span className="figure text-muted-foreground text-xs">{i + 1}</span>
          <span className="min-w-0 truncate text-sm font-medium">{r.label}</span>
          <span className="figure text-end text-sm font-semibold">{r.value}</span>
          <span aria-hidden className="bg-muted col-start-2 h-1.5 overflow-hidden rounded-full">
            <span className="bg-foreground/70 block h-full rounded-full" style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <span className="text-muted-foreground col-start-3 text-end text-xs">{r.detail}</span>
        </li>
      ))}
    </ol>
  );
}

/** A two-column fact list: label on the start side, value on the end. */
export function Facts({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="divide-y">
      {rows.map((r) => (
        <div key={r.label} className="flex items-baseline justify-between gap-4 px-5 py-3 text-sm">
          <dt className="text-muted-foreground shrink-0">{r.label}</dt>
          <dd className="min-w-0 text-end font-medium break-words">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}
