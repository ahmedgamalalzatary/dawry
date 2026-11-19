"use client";

import {
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  ArrowUpDown,
  RotateCcw,
  Search,
  SearchX,
  SlidersHorizontal,
  X,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";
import type { Sorting } from "@/lib/list";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger,
} from "./menu";

/** One row above a list: search first, then filters and sorting. Wraps on phones. */
export function Toolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap items-center gap-2", className)}>{children}</div>;
}

/** A search box that reports its value after a short pause. */
export function SearchField({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  const t = useTranslations("list");
  const [draft, setDraft] = useState(value);
  const [synced, setSynced] = useState(value);

  // Follow outside changes (clear filters, back navigation).
  if (value !== synced) {
    setSynced(value);
    setDraft(value);
  }
  useEffect(() => {
    if (draft === value) return;
    const timer = setTimeout(() => onChange(draft), 200);
    return () => clearTimeout(timer);
  }, [draft, value, onChange]);

  return (
    <div className={cn("relative min-w-0 flex-1", className)}>
      <Search aria-hidden className="text-muted-foreground pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2" />
      <input
        type="search"
        aria-label={placeholder}
        placeholder={placeholder}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onChange(draft);
          if (e.key === "Escape") {
            setDraft("");
            onChange("");
          }
        }}
        className="border-input bg-surface placeholder:text-muted-foreground/70 hover:border-border-strong focus-visible:border-ring focus-visible:ring-ring/20 h-10 w-full rounded-lg border ps-10 pe-9 text-base outline-none transition-[border-color,box-shadow] focus-visible:ring-3 md:text-sm [&::-webkit-search-cancel-button]:hidden"
      />
      {draft ? (
        <button
          type="button"
          aria-label={t("clearSearch")}
          onClick={() => {
            setDraft("");
            onChange("");
          }}
          className="text-muted-foreground hover:text-foreground hover:bg-muted absolute end-1.5 top-1/2 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

// ---- Filters: one button, a submenu per dimension, chips for what is on ---------

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface FilterBase {
  key: string;
  label: string;
  icon: LucideIcon;
  value: string;
  /** The "everything" value; a filter is on when its value differs from it. */
  fallback: string;
  onChange: (value: string) => void;
}

export type FilterDef =
  | (FilterBase & {
      options: FilterOption[];
      date?: undefined;
      /** Extra controls under the choices (e.g. a custom date range). */
      footer?: ReactNode;
      /** What the chip and hint say, when not simply the chosen option's label. */
      display?: string;
    })
  | (FilterBase & {
      options?: undefined;
      /** A single day (YYYY-MM-DD) picked from shortcuts or a date field. */
      date: { max?: string; display: (day: string) => string; shortcuts?: FilterOption[] };
    });

const isOn = (f: FilterDef) => f.value !== f.fallback;
const valueLabel = (f: FilterDef) =>
  f.date
    ? (f.date.shortcuts?.find((o) => o.value === f.value)?.label ?? f.date.display(f.value))
    : (f.display ?? f.options.find((o) => o.value === f.value)?.label ?? f.value);

/** The filter button: a badge counting filters that are on, a submenu each, reset. */
export function FilterMenu({ filters, onReset }: { filters: FilterDef[]; onReset: () => void }) {
  const t = useTranslations("list");
  const on = filters.filter(isOn).length;
  return (
    <Menu>
      <MenuTrigger
        render={
          <button
            type="button"
            className={cn(
              "border-input bg-surface hover:border-border-strong data-popup-open:border-ring data-popup-open:ring-ring/20 flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-[border-color,box-shadow] data-popup-open:ring-3",
              on > 0 && "border-foreground/50",
            )}
          />
        }
      >
        <SlidersHorizontal aria-hidden className="size-4" />
        <span className="max-sm:sr-only">{t("filter")}</span>
        {on > 0 ? (
          <span className="figure bg-foreground text-background flex size-5 items-center justify-center rounded-full text-[0.6875rem] font-semibold">
            <span className="sr-only">{t("activeCount")} </span>
            {on}
          </span>
        ) : null}
      </MenuTrigger>
      <MenuContent align="end" className="min-w-64">
        {filters.map((f) => (
          <MenuSub key={f.key}>
            <MenuSubTrigger hint={valueLabel(f)}>
              <f.icon aria-hidden />
              {f.label}
            </MenuSubTrigger>
            <MenuSubContent>
              {f.date ? (
                <DateChoice filter={f} />
              ) : (
                <MenuRadioGroup value={f.value} onValueChange={(v: string) => f.onChange(v)}>
                  {f.options.map((o) => (
                    <MenuRadioItem key={o.value} value={o.value} closeOnClick>
                      <span className="truncate">{o.label}</span>
                      {o.count !== undefined ? (
                        <span className="figure text-muted-foreground ms-auto ps-3 text-xs">{o.count}</span>
                      ) : null}
                    </MenuRadioItem>
                  ))}
                </MenuRadioGroup>
              )}
              {f.options && f.footer ? f.footer : null}
            </MenuSubContent>
          </MenuSub>
        ))}
        <MenuSeparator />
        <MenuItem onClick={onReset} disabled={on === 0}>
          <RotateCcw />
          {t("reset")}
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

function DateChoice({ filter }: { filter: Extract<FilterDef, { date: object }> }) {
  const t = useTranslations("list");
  return (
    <div className="flex w-60 flex-col">
      {filter.date.shortcuts ? (
        <MenuRadioGroup value={filter.value} onValueChange={(v: string) => filter.onChange(v)}>
          {filter.date.shortcuts.map((o) => (
            <MenuRadioItem key={o.value} value={o.value} closeOnClick>
              {o.label}
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
      ) : null}
      <label className="mt-1 flex flex-col gap-1.5 border-t px-1.5 pt-2.5 pb-1.5 text-xs font-medium">
        <span className="text-muted-foreground">{t("pickDay")}</span>
        <input
          type="date"
          value={filter.value}
          max={filter.date.max}
          onChange={(e) => filter.onChange(e.target.value || filter.fallback)}
          // Typing stays in the field instead of the menu's type-to-select.
          onKeyDown={(e) => e.stopPropagation()}
          dir="ltr"
          className="figure border-input bg-surface focus-visible:border-ring focus-visible:ring-ring/20 h-10 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-3"
        />
      </label>
    </div>
  );
}

/** The filters that are on, each removable, under the toolbar. */
export function ActiveFilters({ filters, onReset }: { filters: FilterDef[]; onReset: () => void }) {
  const t = useTranslations("list");
  const on = filters.filter(isOn);
  if (on.length === 0) return null;
  return (
    <ul aria-label={t("activeFilters")} className="flex flex-wrap items-center gap-2">
      {on.map((f) => (
        <li key={f.key} className="bg-muted flex h-8 items-center gap-1.5 rounded-full ps-3 pe-1 text-sm">
          <span className="text-muted-foreground">{f.label}:</span>
          <span className="font-medium">{valueLabel(f)}</span>
          <button
            type="button"
            onClick={() => f.onChange(f.fallback)}
            aria-label={t("removeFilter", { name: f.label })}
            className="text-muted-foreground hover:text-foreground hover:bg-background flex size-6 cursor-pointer items-center justify-center rounded-full transition-colors"
          >
            <X className="size-3.5" />
          </button>
        </li>
      ))}
      {on.length > 1 ? (
        <li>
          <button
            type="button"
            onClick={onReset}
            className="text-muted-foreground hover:text-foreground cursor-pointer px-2 text-sm underline-offset-4 hover:underline"
          >
            {t("clearAll")}
          </button>
        </li>
      ) : null}
    </ul>
  );
}

/**
 * The standard list header: a wide search, the filter button, the count at the far
 * end, and the chips of active filters underneath.
 */
export function ListToolbar({
  search,
  filters = [],
  onReset,
  count,
  children,
}: {
  search: ReactNode;
  filters?: FilterDef[];
  /** Turns every filter off. */
  onReset: () => void;
  count?: ReactNode;
  /** Extra controls after the filter button. */
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center sm:max-w-xl">{search}</div>
        {filters.length > 0 ? <FilterMenu filters={filters} onReset={onReset} /> : null}
        {children}
        {count ? <div className="ms-auto shrink-0 ps-2">{count}</div> : null}
      </div>
      <ActiveFilters filters={filters} onReset={onReset} />
    </div>
  );
}

/**
 * A clickable column head with three states: neutral (both arrows, the list's
 * default order), ascending, descending; a fourth click returns to neutral.
 */
export function SortHeader({
  label,
  column,
  sorting,
  className,
}: {
  label: string;
  column: string;
  sorting: Sorting;
  className?: string;
}) {
  const t = useTranslations("list");
  const active = sorting.active && sorting.column === column;
  const Arrow = !active ? ArrowUpDown : sorting.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={() => sorting.toggle(column)}
      className={cn(
        "group/sort -mx-2 inline-flex h-7 max-w-fit cursor-pointer items-center gap-1 rounded-md px-2 text-xs font-medium whitespace-nowrap transition-colors",
        active ? "bg-muted text-foreground" : "hover:text-foreground hover:bg-muted/70",
        className,
      )}
    >
      {label}
      <Arrow
        aria-hidden
        className={cn("size-3.5 shrink-0 print:hidden", !active && "opacity-45 group-hover/sort:opacity-80")}
      />
      <span className="sr-only">{active ? (sorting.dir === "asc" ? t("sortedAsc") : t("sortedDesc")) : t("sortHint")}</span>
    </button>
  );
}

export interface Choice<T extends string> {
  value: T;
  label: string;
  count?: number;
}

/** A short set of exclusive choices as a segmented control (real radios underneath). */
export function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: Choice<T>[];
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("bg-muted flex h-10 shrink-0 items-center gap-0.5 overflow-x-auto rounded-lg p-1 [scrollbar-width:none]", className)}
    >
      {options.map((o) => (
        <label
          key={o.value}
          className={cn(
            "has-focus-visible:outline-ring flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-3 text-[0.8125rem] font-medium whitespace-nowrap transition-colors has-focus-visible:outline-2",
            value === o.value ? "bg-surface text-foreground shadow-raise" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <input
            type="radio"
            name={label}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            className="sr-only"
          />
          {o.label}
          {o.count !== undefined ? <span className="figure text-muted-foreground text-xs">{o.count}</span> : null}
        </label>
      ))}
    </div>
  );
}

/** Sorting as a native select, for small report tables without column heads. */
export function SortSelect<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Choice<T>[];
}) {
  const t = useTranslations("list");
  return (
    <label className="border-input bg-surface hover:border-border-strong focus-within:border-ring focus-within:ring-ring/20 relative flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-lg border ps-3 pe-2 text-sm transition-[border-color,box-shadow] focus-within:ring-3">
      <ArrowDownUp aria-hidden className="text-muted-foreground size-4" />
      <span className="sr-only">{t("sortBy")}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="cursor-pointer appearance-none bg-transparent pe-1 font-medium outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** When search or filters hide every row. */
export function NoMatches({ onClear }: { onClear?: () => void }) {
  const t = useTranslations("list");
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <SearchX aria-hidden className="text-muted-foreground size-7" />
      <p className="font-medium">{t("noMatches")}</p>
      {onClear ? (
        <Button variant="outline" size="sm" onClick={onClear}>
          {t("clearFilters")}
        </Button>
      ) : null}
    </div>
  );
}

/** "26 orders", or "3 of 26" while filtered; sits at the end of the toolbar. */
export function ResultCount({ shown, total, noun }: { shown: number; total: number; noun?: (n: number) => string }) {
  const t = useTranslations("list");
  return (
    <p aria-live="polite" className="figure text-muted-foreground text-sm whitespace-nowrap">
      {shown === total
        ? noun
          ? noun(total)
          : t("count", { total })
        : t("countFiltered", { shown, total })}
    </p>
  );
}
