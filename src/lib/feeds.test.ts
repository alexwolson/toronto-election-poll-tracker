import candidatesFixture from "../../fixtures/mayoral_candidates.json";
import { describe, expect, it } from "vitest";
import { validateMayoralCandidates } from "./feeds";

describe("validateMayoralCandidates", () => {
  it("accepts the complete certified fixture", () => {
    const feed = validateMayoralCandidates(candidatesFixture);
    expect(feed?.schema_version).toBe(3);
    expect(feed?.ballot_certified).toBe(true);
    expect(feed?.candidates).toHaveLength(53);
    expect(
      feed?.candidates.find((candidate) => candidate.display_name === "Olivia Chow"),
    ).toMatchObject({
      display_name: "Olivia Chow",
      is_incumbent: true,
    });
  });

  it("rejects malformed candidate rows", () => {
    expect(
      validateMayoralCandidates({
        schema_version: 3,
        event_id: "toronto-2026",
        contest_id: "mayor-2026",
        election_date: "2026-10-26",
        ballot_certified: true,
        coverage: candidatesFixture.coverage,
        candidates: [{ display_name: "Missing fields" }],
      }),
    ).toBeNull();
  });

  it("rejects a provisional feed that exposes candidates", () => {
    expect(
      validateMayoralCandidates({
        schema_version: 3,
        event_id: "toronto-2026",
        contest_id: "mayor-2026",
        election_date: "2026-10-26",
        ballot_certified: false,
        coverage: candidatesFixture.coverage,
        candidates: candidatesFixture.candidates,
      }),
    ).toBeNull();
  });
});
