import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, directionOf, resolveLocale } from "@/i18n/config";
import ar from "../translation/ar";
import en from "../translation/en";

function keyPaths(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) =>
    value && typeof value === "object"
      ? keyPaths(value as Record<string, unknown>, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

describe("resolveLocale", () => {
  it("defaults to Arabic", () => {
    expect(DEFAULT_LOCALE).toBe("ar");
    expect(resolveLocale(undefined)).toBe("ar");
  });

  it("accepts the supported locales", () => {
    expect(resolveLocale("en")).toBe("en");
    expect(resolveLocale("ar")).toBe("ar");
  });

  it("falls back to the default for anything else", () => {
    expect(resolveLocale("fr")).toBe("ar");
    expect(resolveLocale("")).toBe("ar");
  });
});

describe("directionOf", () => {
  it("is rtl for Arabic and ltr for English", () => {
    expect(directionOf("ar")).toBe("rtl");
    expect(directionOf("en")).toBe("ltr");
  });
});

describe("messages", () => {
  it("have the same keys in Arabic and English", () => {
    expect(keyPaths(ar).sort()).toEqual(keyPaths(en).sort());
  });
});
