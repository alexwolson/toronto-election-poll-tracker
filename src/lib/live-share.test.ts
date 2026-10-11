import { describe, expect, it } from "vitest";
import { shareText } from "./live-share";

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
