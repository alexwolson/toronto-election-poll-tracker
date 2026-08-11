import { describe, expect, it } from "vitest";
import { forecastReasonLabel, wardRationale } from "./council-presentation";
import type { Ward } from "@/types/ward";

describe("Council presentation language", () => {
  it("explains failed calibration without exposing implementation tokens", () => {
    expect(forecastReasonLabel("beats_incumbent_base_rate")).toContain(
      "did not outperform"
    );
  });

  it("states that Safe is an assessment rather than a probability", () => {
    const ward = {
      race_class: "safe",
      race_status_reasons: ["no_competitive_trigger"],
    } as Ward;
    expect(wardRationale(ward)).toContain("not a guarantee");
    expect(wardRationale(ward)).toContain("not a published win probability");
  });
});
