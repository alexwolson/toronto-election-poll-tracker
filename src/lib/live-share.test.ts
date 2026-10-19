import { describe, expect, it } from "vitest";
import { shareText, votesTotal, wardShare, rangeText } from "./live-share";

describe("shareText: a candidate's share, never '0.0%' (Alex, 2026-10-11)", () => {
  it("shows one decimal from 0.1% up", () => {
    expect(shareText(36.24)).toBe("36.2%");
    expect(shareText(0.05)).toBe("0.1%");
  });

  it("shows '<0.1%' for a share that would round to 0.0% but has votes", () => {
    expect(shareText(0.04)).toBe("<0.1%");
    expect(shareText(0.0002)).toBe("<0.1%");
    // The payload rounds shares: a handful of votes can arrive as 0.
    expect(shareText(0, 3)).toBe("<0.1%");
  });

  it("shows '0%' only for no votes at all", () => {
    expect(shareText(0, 0)).toBe("0%");
    expect(shareText(0)).toBe("0%");
  });

  it("shows a dash when there is no share", () => {
    expect(shareText(null)).toBe("–");
    expect(shareText(undefined)).toBe("–");
  });
});

describe("wardShare: a candidate's percent of a ward's counted votes", () => {
  it("is their votes over every candidate's", () => {
    expect(wardShare({ a: 600, b: 400 }, "a")).toBe(60);
    expect(wardShare({ a: 600, b: 400 }, "c")).toBe(0);
  });

  it("is null until a vote is counted", () => {
    expect(wardShare(null, "a")).toBeNull();
    expect(wardShare({ a: 0, b: 0 }, "a")).toBeNull();
  });
});

describe("votesTotal: every candidate's counted votes in a ward", () => {
  it("sums them, and is 0 with none", () => {
    expect(votesTotal({ a: 600, b: 400 })).toBe(1000);
    expect(votesTotal(null)).toBe(0);
  });
});

describe("rangeText (#120)", () => {
  it("reads a range under 1% as 'under 1%'", () => {
    expect(rangeText(0, 0.4)).toBe("under 1%");
    expect(rangeText(0.1, 0.49)).toBe("under 1%");
  });

  it("reads a range whose ends round alike as one figure", () => {
    expect(rangeText(2.6, 3.4)).toBe("about 3%");
    expect(rangeText(49.6, 50.4)).toBe("about 50%");
    // Ends that round apart stay a range, even when narrow.
    expect(rangeText(0.4, 0.6)).toBe("0–1%");
  });

  it("keeps a range that rounds to two figures", () => {
    expect(rangeText(0, 1.2)).toBe("0–1%");
    expect(rangeText(28.12, 41.91)).toBe("28–42%");
  });
});
