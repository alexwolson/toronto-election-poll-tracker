import { describe, expect, it } from "vitest";
import { formatDate, formatSharePct } from "./format";

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
