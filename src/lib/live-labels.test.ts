import { describe, expect, it } from "vitest";
import { shortLabel } from "./live-labels";

const BRADFORD = "can_b71a736235545b8f8df2a3e196126428";

describe("shortLabel (#16, #121)", () => {
  it("is the registry last name, or the full Ballot Name without one", () => {
    expect(shortLabel({ short_label: "Crisanti", full_name: "Vincent Crisanti", candidacy_id: "can_x" })).toBe("Crisanti");
    expect(shortLabel({ short_label: null, full_name: "Vincent Crisanti", candidacy_id: null })).toBe("Vincent Crisanti");
    expect(shortLabel({ short_label: "Olivia Chow", full_name: "Olivia Chow", candidacy_id: "can_c" })).toBe("Olivia Chow");
  });

  it("reads Brad Bradford in full, beside Olivia Chow, found by candidacy id", () => {
    expect(shortLabel({ short_label: "Bradford", full_name: "Brad Bradford", candidacy_id: BRADFORD })).toBe("Brad Bradford");
    // A renamed entry with his id still reads in full; another Bradford does not.
    expect(shortLabel({ short_label: "Bradford", full_name: "Bradford Brad", candidacy_id: BRADFORD })).toBe("Bradford Brad");
    expect(shortLabel({ short_label: "Bradford", full_name: "Jane Bradford", candidacy_id: "can_other" })).toBe("Bradford");
  });
});
