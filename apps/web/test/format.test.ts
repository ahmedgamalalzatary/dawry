import { describe, expect, it } from "vitest";
import { etaDisplay, formatCountdown, formatTime, newlyLate } from "@/lib/format";

describe("formatCountdown", () => {
  it("shows minutes and seconds", () => {
    expect(formatCountdown(125_000)).toBe("2:05");
    expect(formatCountdown(0)).toBe("0:00");
  });

  it("shows hours when needed", () => {
    expect(formatCountdown(3_725_000)).toBe("1:02:05");
  });

  it("never goes negative", () => {
    expect(formatCountdown(-5_000)).toBe("0:00");
  });
});

describe("etaDisplay", () => {
  const now = new Date("2026-11-19T18:00:00Z");
  const etaAt = "2026-11-19T18:35:30Z";

  it("countdown: remaining time plus the clock time", () => {
    expect(etaDisplay("countdown", etaAt, now)).toEqual({
      kind: "countdown",
      remaining: "35:30",
      clock: etaAt,
    });
  });

  it("clock: just the time", () => {
    expect(etaDisplay("clock", etaAt, now)).toEqual({ kind: "clock", clock: etaAt });
  });

  it("minutes: rounded-up whole minutes left", () => {
    expect(etaDisplay("minutes", etaAt, now)).toEqual({ kind: "minutes", minutes: 36 });
  });

  it("minutes: at least 1 while not late", () => {
    expect(etaDisplay("minutes", "2026-11-19T18:00:10Z", now)).toEqual({
      kind: "minutes",
      minutes: 1,
    });
  });
});

describe("newlyLate", () => {
  const order = (id: string, late: boolean) => ({ id, late, invoiceNumber: id });

  it("returns orders that are late now but were not before", () => {
    const before = [order("1", false), order("2", true), order("3", false)];
    const after = [order("1", true), order("2", true), order("3", false), order("4", true)];

    expect(newlyLate(before, after).map((o) => o.id)).toEqual(["1", "4"]);
  });

  it("returns nothing on the first load (no previous snapshot)", () => {
    expect(newlyLate(null, [order("1", true)])).toEqual([]);
  });
});

describe("formatTime", () => {
  it("uses Western digits in both languages, in the Cairo time zone", () => {
    expect(formatTime("2026-11-19T18:45:00Z", "en")).toBe("20:45");
    expect(formatTime("2026-11-19T18:45:00Z", "ar")).toMatch(/^8:45/);
  });
});
