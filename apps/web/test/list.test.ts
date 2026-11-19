import { describe, expect, it } from "vitest";
import { matchesSearch, nextSortState, normalizeSearch } from "@/lib/list";

describe("nextSortState", () => {
  it("cycles a column head neutral → ascending → descending → neutral", () => {
    const asc = nextSortState(null, "name");
    expect(asc).toEqual({ column: "name", dir: "asc" });
    const desc = nextSortState(asc, "name");
    expect(desc).toEqual({ column: "name", dir: "desc" });
    expect(nextSortState(desc, "name")).toBeNull();
  });

  it("starts another column ascending", () => {
    expect(nextSortState({ column: "name", dir: "desc" }, "orders")).toEqual({ column: "orders", dir: "asc" });
  });
});

describe("normalizeSearch", () => {
  it("folds Arabic letter variants, diacritics and digits", () => {
    expect(normalizeSearch("أحمد")).toBe("احمد");
    expect(normalizeSearch("إيمان")).toBe("ايمان");
    expect(normalizeSearch("فطيرة")).toBe("فطيره");
    expect(normalizeSearch("مُنى")).toBe("مني");
    expect(normalizeSearch("١٢٣")).toBe("123");
    expect(normalizeSearch("  Pizza   ROMA ")).toBe("pizza roma");
  });
});

describe("matchesSearch", () => {
  it("matches every word across the given fields", () => {
    expect(matchesSearch("احمد 0100", "أحمد علي", "01001234567")).toBe(true);
    expect(matchesSearch("احمد 0111", "أحمد علي", "01001234567")).toBe(false);
  });

  it("matches everything for an empty query and skips empty fields", () => {
    expect(matchesSearch("  ", "x")).toBe(true);
    expect(matchesSearch("12", null, undefined, 125)).toBe(true);
  });
});
