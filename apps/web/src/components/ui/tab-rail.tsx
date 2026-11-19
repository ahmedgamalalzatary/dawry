"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Underline tabs that sit on a header's bottom rule (orders board, reports).
 * Each tab may carry a count and a signal colour for its underline and dot.
 */
export function TabRail<T extends string>({
  label,
  tabs,
  value,
  onChange,
  className,
}: {
  label: string;
  tabs: { value: T; label: ReactNode; count?: number; signal?: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("-mx-4 -mb-px flex overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0", className)}
    >
      {tabs.map((tab) => {
        const selected = tab.value === value;
        const signal = tab.signal ?? "bg-foreground";
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.value)}
            className={cn(
              "group relative flex h-12 shrink-0 cursor-pointer items-center gap-2 px-3.5 text-sm font-medium whitespace-nowrap transition-colors first:ps-0 sm:px-4 sm:first:ps-0",
              selected ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.signal ? <span aria-hidden className={cn("size-2 rounded-full", signal, !selected && "opacity-60")} /> : null}
            {tab.label}
            {tab.count !== undefined ? (
              <span
                className={cn(
                  "figure min-w-6 rounded-md px-1.5 py-0.5 text-center text-xs font-semibold transition-colors",
                  selected ? "bg-foreground text-background" : "bg-muted text-muted-foreground group-hover:text-foreground",
                )}
              >
                {tab.count}
              </span>
            ) : null}
            <span
              aria-hidden
              className={cn(
                "absolute inset-x-3.5 bottom-0 h-0.5 rounded-full transition-opacity group-first:start-0 sm:inset-x-4",
                signal,
                selected ? "opacity-100" : "opacity-0",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
