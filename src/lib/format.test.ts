import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDetailedSharePct,
  formatSharePct,
  isoDayNumber,
  percentagesToHundred,
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

describe("percentagesToHundred", () => {
  it("rounds parts of a whole so they add to exactly 100, largest remainders first", () => {
    // The published 2026-09-22 margin outcomes: plain rounding gives 67 + 8 + 26 = 101.
    expect(percentagesToHundred([0.665875, 0.075063, 0.259062])).toEqual([67, 7, 26]);
    // The uncertainty shares from the same fit already land on 100 and are left alone.
    expect(percentagesToHundred([0.085351, 0.191442, 0.723207])).toEqual([9, 19, 72]);
    expect(percentagesToHundred([0.5, 0.5])).toEqual([50, 50]);
    expect(percentagesToHundred([1 / 3, 1 / 3, 1 / 3])).toEqual([34, 33, 33]);
    expect(percentagesToHundred([0.004, 0.996])).toEqual([0, 100]);
  });
  it("keeps the input order and never moves a value by more than one point", () => {
    const input = [0.129, 0.129, 0.129, 0.129, 0.129, 0.129, 0.226];
    const out = percentagesToHundred(input);
    expect(out.reduce((a, b) => a + b, 0)).toBe(100);
    for (const [i, v] of out.entries()) expect(Math.abs(v - input[i] * 100)).toBeLessThan(1);
  });
});
