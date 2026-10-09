import { describe, expect, it } from "vitest";
import { RESULTS_LIVE_AT, resultsLive } from "./results-clock";

describe("the results clock", () => {
  it("goes live at 20:00 EDT on Oct 26, 2026", () => {
    expect(RESULTS_LIVE_AT).toBe(Date.parse("2026-10-26T20:00:00-04:00"));
    expect(resultsLive(Date.parse("2026-10-26T19:59:59-04:00"))).toBe(false);
    expect(resultsLive(Date.parse("2026-10-26T20:00:00-04:00"))).toBe(true);
    expect(resultsLive(Date.parse("2026-10-27T09:00:00+09:00"))).toBe(true);
  });
});
