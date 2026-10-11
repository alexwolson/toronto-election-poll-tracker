import { describe, expect, it } from "vitest";
import { RESULTS_LIVE_AT, RESULTS_UNOFFICIAL_AT, resultsLive, resultsPhase } from "./results-clock";

describe("the results clock", () => {
  it("goes live at 20:00 EDT on Oct 26, 2026", () => {
    expect(RESULTS_LIVE_AT).toBe(Date.parse("2026-10-26T20:00:00-04:00"));
    expect(resultsLive(Date.parse("2026-10-26T19:59:59-04:00"))).toBe(false);
    expect(resultsLive(Date.parse("2026-10-26T20:00:00-04:00"))).toBe(true);
    expect(resultsLive(Date.parse("2026-10-27T09:00:00+09:00"))).toBe(true);
  });

  it("stops being live at 12:00 EDT on Tue Oct 27, after the planned Night Close (#54)", () => {
    expect(RESULTS_UNOFFICIAL_AT).toBe(Date.parse("2026-10-27T12:00:00-04:00"));
    expect(resultsPhase(Date.parse("2026-10-26T19:59:59-04:00"))).toBe("before");
    expect(resultsPhase(Date.parse("2026-10-27T11:59:59-04:00"))).toBe("live");
    expect(resultsPhase(Date.parse("2026-10-27T12:00:00-04:00"))).toBe("unofficial");
    expect(resultsLive(Date.parse("2026-10-27T12:00:00-04:00"))).toBe(false);
  });
});
