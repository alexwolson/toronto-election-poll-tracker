import { describe, expect, it } from "vitest";
import { parseCouncilSnapshot } from "./council-api";

function fixture() {
  return {
    schema_version: 3,
    as_of: "2026-08-10",
    wards: [
      {
        ward: 1,
        councillor_name: "Incumbent",
        election_year: 2022,
        is_running: true,
        is_byelection_incumbent: false,
        defeatability_score: 58,
        race_class: "competitive",
        race_status_reasons: ["high_structural_vulnerability"],
        evidence: {
          prior_result: {
            election_year: 2022,
            incumbent_share: 0.4,
            electorate_share: 0.12,
            margin: 0.1,
            runner_up: "Runner-up",
            runner_up_share: 0.3,
            by_election: false,
          },
          registered_field: {
            candidate_count: 2,
            challenger_count: 1,
            known_challenger_count: 0,
            well_known_challenger_count: 0,
            credible_challenger_count: 0,
            strongest_name_recognition_tier: "unknown",
            returning_runner_up: false,
          },
          ward_polling: {
            availability: "unavailable",
            current_field_poll_count: 0,
            total_poll_count: 0,
            polls: [],
          },
        },
        forecast: {
          status: "insufficient_data",
          unavailable_reasons: ["candidate_field_not_final"],
          model_version: "incumbent_retention_v1",
          incumbent_win_probability: null,
          incumbent_probability_interval: null,
        },
      },
    ],
    challengers: [],
    council_model: {
      assessment: {
        version: "structural_assessment_v1",
        status_counts: { safe: 0, competitive: 1, open: 0 },
        total_wards: 1,
        meaning: "Assessment, not odds.",
      },
      forecast: {
        status: "insufficient_data",
        unavailable_reasons: [],
        model_version: "incumbent_retention_v1",
        diagnostics: {},
        gates: {},
      },
      composition: {
        status: "unavailable",
        unavailable_reasons: [],
        mean_incumbents_returned: null,
        interval: null,
        conditional_on_mayor: {},
      },
      mayoral_context: {
        forecast_version: "choice_set_v1",
        forecast_status: "available",
        used_in_public_ward_odds: false,
      },
    },
    mayoral_forecast_version: "choice_set_v1",
    mayoral_forecast_status: "available",
    phase: { phase: 2, label: "Registration", description: "" },
  };
}

describe("parseCouncilSnapshot", () => {
  it("accepts the strict v3 Council contract with unavailable odds", () => {
    const parsed = parseCouncilSnapshot(fixture());
    expect(parsed.wards[0].forecast.incumbent_win_probability).toBeNull();
  });

  it("rejects the legacy v2 snapshot", () => {
    expect(() => parseCouncilSnapshot({ ...fixture(), schema_version: 2 })).toThrow(
      "schema version 3"
    );
  });

  it("rejects a ward without forecast availability state", () => {
    const data = fixture();
    // @ts-expect-error deliberate malformed fixture
    delete data.wards[0].forecast;
    expect(() => parseCouncilSnapshot(data)).toThrow("invalid ward collection");
  });

  it("rejects a ward whose evidence contract is incomplete", () => {
    const data = fixture();
    // @ts-expect-error deliberate malformed fixture
    data.wards[0].evidence = {};
    expect(() => parseCouncilSnapshot(data)).toThrow("invalid ward collection");
  });

  it("rejects race-status totals that disagree with the ward records", () => {
    const data = fixture();
    data.council_model.assessment.status_counts.safe = 1;
    expect(() => parseCouncilSnapshot(data)).toThrow("counts do not match");
  });

  it("rejects an unavailable forecast that still publishes a probability", () => {
    const data = fixture();
    data.wards[0].forecast.incumbent_win_probability = 0.9;
    expect(() => parseCouncilSnapshot(data)).toThrow("invalid ward collection");
  });
});
