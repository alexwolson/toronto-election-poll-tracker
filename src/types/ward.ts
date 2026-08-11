export type RaceClass = "safe" | "competitive" | "open";
export type ForecastStatus = "available" | "insufficient_data" | "unstable" | "error";

export interface WardPollCandidate {
  id: string;
  name: string;
  share: number;
  is_incumbent: boolean;
  is_residual: boolean;
  registration_status: "registered" | "unregistered" | "residual";
}

export interface WardPollEvidence {
  poll_id: string;
  firm: string;
  date_conducted: string;
  date_published: string;
  sample_size: number;
  methodology: string;
  denominator: string;
  ballot_status: "current_field" | "different_candidate_field" | "hypothetical";
  undecided_share: number;
  source_url: string | null;
  candidates: WardPollCandidate[];
}

export interface WardEvidence {
  prior_result: {
    election_year: number;
    incumbent_share: number;
    electorate_share: number;
    margin: number | null;
    runner_up: string | null;
    runner_up_share: number | null;
    by_election: boolean;
  };
  registered_field: {
    candidate_count: number;
    challenger_count: number;
    known_challenger_count: number;
    well_known_challenger_count: number;
    credible_challenger_count: number;
    strongest_name_recognition_tier: "well-known" | "known" | "unknown" | null;
    returning_runner_up: boolean;
  };
  ward_polling: {
    availability: "available" | "unavailable";
    current_field_poll_count: number;
    total_poll_count: number;
    polls: WardPollEvidence[];
  };
  mayoral_context?: {
    status: "context_only";
    used_in_ward_forecast: false;
    councillor_chow_alignment: number;
    alignment_vs_council_average: number;
    ward_chow_lean: number;
  };
}

export interface WardForecast {
  status: ForecastStatus;
  unavailable_reasons: string[];
  model_version: string;
  incumbent_win_probability: number | null;
  incumbent_probability_interval: { low: number; high: number } | null;
}

export interface Ward {
  ward: number;
  councillor_name: string;
  election_year: number;
  is_running: boolean;
  is_byelection_incumbent: boolean;
  defeatability_score: number;
  race_class: RaceClass;
  race_status_reasons: string[];
  evidence: WardEvidence;
  forecast: WardForecast;
  /** @deprecated Test-fixture compatibility only; absent from schema v3 snapshots. */
  win_probability?: number;
  /** @deprecated Test-fixture compatibility only; use evidence.mayoral_context. */
  coattail_detail?: {
    alignment: number;
    alignment_delta: number;
    ward_lean: number;
  };
  vote_share?: number;
  electorate_share?: number;
  notes?: string | null;
  pop_growth_pct?: number;
}

export interface Challenger {
  ward: number;
  candidate_name: string;
  name_recognition_tier: "well-known" | "known" | "unknown";
  fundraising_tier?: "high" | "low" | null;
  mayoral_alignment: string;
  is_endorsed_by_departing: boolean;
  prior_ward_vote_share?: number | null;
  prior_ward_election_year?: number | null;
  is_returning_runner_up?: boolean;
  notes?: string;
}

export interface PhaseInfo {
  phase: 1 | 2 | 3;
  label: string;
  description: string;
}

export interface WardsResponse {
  schema_version: 3;
  as_of: string | null;
  wards: Ward[];
  challengers: Challenger[];
  council_model: CouncilModel;
  mayoral_forecast_version: string;
  mayoral_forecast_status: ForecastStatus;
  phase: PhaseInfo;
}

export interface CouncilModel {
  assessment: {
    version: string;
    status_counts: Record<RaceClass, number>;
    total_wards: number;
    meaning: string;
  };
  forecast: {
    status: ForecastStatus;
    unavailable_reasons: string[];
    model_version: string;
    diagnostics: Record<string, number | boolean | unknown[]>;
    gates: Record<string, boolean>;
  };
  composition: {
    status: "available" | "unavailable";
    unavailable_reasons: string[];
    mean_incumbents_returned: number | null;
    interval: { low: number; high: number } | null;
    conditional_on_mayor: Record<string, unknown>;
  };
  mayoral_context: {
    forecast_version: string;
    forecast_status: ForecastStatus;
    used_in_public_ward_odds: false;
  };
}

export interface WardResponse {
  ward: Ward | null;
  challengers: Challenger[];
  council_model: CouncilModel;
  error?: "not_found" | "unavailable";
}
