"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const ARABIC_DIGITS = /[٠-٩]/g;
const MARKS = /[ً-ٰٟـ]/g; // harakat, dagger alif, tatweel

/**
 * Fold text for searching: case, Arabic letter variants (أ إ آ → ا, ة → ه, ى → ي),
 * diacritics and Eastern Arabic digits, so "احمد" finds "أحمد" and "١٢" finds "12".
 */
export function normalizeSearch(text: string): string {
  return text
    .toLowerCase()
    .replace(MARKS, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(ARABIC_DIGITS, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/\s+/g, " ")
    .trim();
}

/** True when every word of `query` appears in one of `fields`. */
export function matchesSearch(query: string, ...fields: (string | number | null | undefined)[]): boolean {
  const words = normalizeSearch(query).split(" ").filter(Boolean);
  if (words.length === 0) return true;
  const haystack = normalizeSearch(fields.filter((f) => f !== null && f !== undefined).join(" "));
  return words.every((w) => haystack.includes(w));
}

/**
 * One URL search parameter as state (filters survive opening a row and coming back).
 * The default value is kept out of the URL.
 */
export function useParam<T extends string = string>(key: string, fallback: NoInfer<T>, allowed?: readonly NoInfer<T>[]) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const raw = params.get(key);
  const value = (raw !== null && (!allowed || allowed.includes(raw as T)) ? raw : fallback) as T;

  const setValue = useCallback(
    (next: T) => {
      const updated = new URLSearchParams(window.location.search);
      if (next === fallback || next === "") updated.delete(key);
      else updated.set(key, next);
      const query = updated.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [fallback, key, pathname, router],
  );

  return [value, setValue] as const;
}

export type SortDir = "asc" | "desc";

/** A column head's next state: neutral → ascending → descending → neutral. */
export function nextSortState(
  current: { column: string; dir: SortDir } | null,
  clicked: string,
): { column: string; dir: SortDir } | null {
  if (!current || current.column !== clicked) return { column: clicked, dir: "asc" };
  return current.dir === "asc" ? { column: clicked, dir: "desc" } : null;
}

/**
 * Column sorting kept in the URL as `sort` + `dir` (like the ERP's tables).
 * With neither set the list is in its neutral order: `fallback` in `fallbackDir`.
 * Column heads cycle neutral → ascending → descending → neutral.
 */
export function useSort<C extends string>(
  columns: readonly C[],
  fallback: NoInfer<C>,
  fallbackDir: SortDir = "asc",
): Sorting<C> {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const raw = params.get("sort");
  const rawDir = params.get("dir");
  const explicit = raw !== null && columns.includes(raw as C) && (rawDir === "asc" || rawDir === "desc");
  const column = (explicit ? raw : fallback) as C;
  const dir: SortDir = explicit ? (rawDir as SortDir) : fallbackDir;

  const write = useCallback(
    (state: { column: string; dir: SortDir } | null) => {
      const updated = new URLSearchParams(window.location.search);
      if (state) {
        updated.set("sort", state.column);
        updated.set("dir", state.dir);
      } else {
        updated.delete("sort");
        updated.delete("dir");
      }
      const query = updated.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  return {
    column,
    dir,
    active: explicit,
    /** Multiply an ascending comparison by this. */
    sign: dir === "asc" ? 1 : -1,
    set: (next, nextDir) => write({ column: next, dir: nextDir }),
    toggle: (next) => write(nextSortState(explicit ? { column, dir } : null, next)),
    clear: () => write(null),
  };
}

/** Method syntax keeps any `Sorting<"a" | "b">` usable where a plain `Sorting` is expected. */
export interface Sorting<C extends string = string> {
  column: C;
  dir: SortDir;
  /** False while the list is in its neutral (default) order. */
  active: boolean;
  sign: number;
  set(next: C, dir: SortDir): void;
  toggle(next: C): void;
  clear(): void;
}
