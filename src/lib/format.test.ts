import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDetailedSharePct,
  formatSharePct,
  isoDayNumber,
} from "./format";

describe("formatDate", () => {
  it("renders an ISO date without a timezone shift", () => {
    expect(formatDate("2026-08-16")).toBe("Aug 16, 2026");
    expect(formatDate("2026-01-01")).toBe("Jan 1, 2026");
    expect(formatDate("2026-12-31T12:00:00")).toBe("Dec 31, 2026");
  });

  it("passes through anything unparseable", () => {
    expect(formatDate("")).toBe("");
  });
});

describe("formatSharePct", () => {
  it("rounds a share to a whole percent", () => {
    expect(formatSharePct(0.4851)).toBe("49%");
    expect(formatSharePct(0.1)).toBe("10%");
  });
});

describe("formatDetailedSharePct", () => {
  it("keeps one decimal place for election-result context", () => {
    expect(formatDetailedSharePct(0.452114)).toBe("45.2%");
    expect(formatDetailedSharePct(0.5)).toBe("50.0%");
  });
});

describe("isoDayNumber", () => {
  it("is a monotonic day count with correct spacing", () => {
    expect(isoDayNumber("1970-01-01")).toBe(0);
    expect(isoDayNumber("1970-01-02")).toBe(1);
    expect(isoDayNumber("2026-08-16") - isoDayNumber("2026-07-29")).toBe(18);
    expect(isoDayNumber("2026-01-01")).toBeGreaterThan(isoDayNumber("2025-12-31"));
  });
});
