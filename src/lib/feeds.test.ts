import candidatesFixture from "../../fixtures/mayoral_candidates.json";
import { describe, expect, it } from "vitest";
import { validateMayoralCandidates } from "./feeds";

describe("validateMayoralCandidates", () => {
  it("accepts the complete certified fixture", () => {
    const feed = validateMayoralCandidates(candidatesFixture);
    expect(feed?.ballot_certified).toBe(true);
    expect(feed?.candidates).toHaveLength(53);
    expect(
      feed?.candidates.find((candidate) => candidate.candidate_id === "chow"),
    ).toMatchObject({
      display_name: "Olivia Chow",
      is_matched: true,
      is_incumbent: true,
    });
  });

  it("rejects malformed candidate rows", () => {
    expect(
      validateMayoralCandidates({
        schema_version: 1,
        election_cycle_id: "toronto-2026",
        ballot_certified: true,
        candidates: [{ display_name: "Missing fields" }],
      }),
    ).toBeNull();
  });

  it("rejects a provisional feed that exposes candidates", () => {
    expect(
      validateMayoralCandidates({
        schema_version: 1,
        election_cycle_id: "toronto-2026",
        ballot_certified: false,
        candidates: candidatesFixture.candidates,
      }),
    ).toBeNull();
  });
});
