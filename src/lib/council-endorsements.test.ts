import { describe, expect, it } from "vitest";
import { endorsementSummary } from "./council-endorsements";
import type { CandidateEndorsement } from "@/types/feeds";

const e = (name: string): CandidateEndorsement => ({
  endorser_id: name,
  endorser_name: name,
  endorser_type: "organization",
  kind: null,
  announced: null,
  date_precision: "unknown",
  source_url: null,
});

describe("endorsementSummary", () => {
  it("says nothing when no endorsement is recorded", () => {
    expect(endorsementSummary([])).toBeNull();
    expect(endorsementSummary(undefined)).toBeNull();
  });

  it("names the endorsers in plain English", () => {
    expect(endorsementSummary([e("Progress Toronto")])).toBe("Endorsed by Progress Toronto");
    expect(endorsementSummary([e("Progress Toronto"), e("Toronto Star")])).toBe(
      "Endorsed by Progress Toronto and Toronto Star",
    );
    expect(endorsementSummary([e("A"), e("B"), e("C")])).toBe("Endorsed by A, B and C");
  });
});
