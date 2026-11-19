import { DEFAULT_TIME_ZONE, type EtaMode } from "@dawry/shared";

const pad = (n: number) => String(n).padStart(2, "0");

/** 125000 → "2:05", 3725000 → "1:02:05". */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export type EtaView =
  | { kind: "countdown"; remaining: string; clock: string }
  | { kind: "clock"; clock: string }
  | { kind: "minutes"; minutes: number };

/** What the customer sees for each ETA mode. */
export function etaDisplay(mode: EtaMode, etaAt: string, now: Date): EtaView {
  const left = new Date(etaAt).getTime() - now.getTime();
  if (mode === "countdown") return { kind: "countdown", remaining: formatCountdown(left), clock: etaAt };
  if (mode === "clock") return { kind: "clock", clock: etaAt };
  return { kind: "minutes", minutes: Math.max(1, Math.ceil(left / 60_000)) };
}

/** Orders that became late since the previous snapshot (for one-time toasts). */
export function newlyLate<T extends { id: string; late: boolean }>(
  previous: readonly T[] | null,
  next: readonly T[],
): T[] {
  if (!previous) return [];
  const wasLate = new Set(previous.filter((o) => o.late).map((o) => o.id));
  return next.filter((o) => o.late && !wasLate.has(o.id));
}

/**
 * Clock time in the restaurant's time zone, always with Western digits so it
 * matches countdowns and invoice numbers (ar: "8:45 م", en: "20:45").
 */
export function formatTime(iso: string, locale: string, timeZone = DEFAULT_TIME_ZONE) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(new Date(iso));
}

/** 0.836 → "84%"; null → "—". */
export function formatPercent(rate: number | null) {
  return rate === null ? "—" : `${Math.round(rate * 100)}%`;
}

/** A business day ("2026-11-19") in the reader's language, e.g. "Thu 19 Nov". */
export function formatDay(day: string, locale: string, options: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB", { ...options, timeZone: "UTC" }).format(
    new Date(`${day}T00:00:00Z`),
  );
}

/** "2026-11-05" → "5/11" (Western digits, no locale marks: chart axes are left-to-right). */
export const shortDay = (day: string) => `${Number(day.slice(8, 10))}/${Number(day.slice(5, 7))}`;
