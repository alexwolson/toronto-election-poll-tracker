import { describe, expect, it } from "vitest";
import { parsePollingSnapshot } from "./mayoral-api";

function v2Fixture() {
  const evidence = {
    availability: "available",
    denominator: "poll_reported_vote_intention",
    candidates: { chow: 0.47, bradford: 0.37, alexander: 0.1 },
    residual: { id: "residual", label: "Other / undecided", share: 0.06 },
    poll_count: 2,
    firm_count: 2,
    latest_date: "2026-08-07",
    series: [],
  };
  return {
    schema_version: 2,
    mayoral_race: {
      as_of: "2026-08-07",
      target_field: ["chow", "bradford", "alexander"],
      current_field: evidence,
      head_to_head: evidence,
      challenger_lane: {},
      approval: {},
      historical_context: {},
      forecast: {},
    },
    poll_history: [],
  };
}

describe("parsePollingSnapshot", () => {
  it("accepts the coordinated v2 contract", () => {
    expect(parsePollingSnapshot(v2Fixture())?.schema_version).toBe(2);
  });

  it("rejects legacy and partially deployed snapshots", () => {
    expect(parsePollingSnapshot({ ...v2Fixture(), schema_version: 1 })).toBeNull();
    const missingRace = v2Fixture();
    // @ts-expect-error deliberate malformed deployment fixture
    delete missingRace.mayoral_race.current_field;
    expect(parsePollingSnapshot(missingRace)).toBeNull();
  });
});

