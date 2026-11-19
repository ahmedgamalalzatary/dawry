import type { EtaMode } from "@dawry/shared";

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

/** "20:45" style time in the viewer's locale. */
export function formatTime(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
