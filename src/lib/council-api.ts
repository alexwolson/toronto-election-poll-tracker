import type {
  Challenger,
  CouncilModel,
  Ward,
  WardResponse,
  WardsResponse,
} from "@/types/ward";

const DATA_REVISION = process.env.NEXT_PUBLIC_DATA_REVISION?.trim() || "main";
const DATA_BASE_URL =
  `https://raw.githubusercontent.com/alexwolson/toronto-election-poll-tracker-data/${DATA_REVISION}/data/processed`;

function dataUrl(file: string): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/${file}`;
  }
  return `${DATA_BASE_URL}/${file}`;
}

const EMPTY_COUNCIL_MODEL: CouncilModel = {
  assessment: {
    version: "unavailable",
    status_counts: { safe: 0, competitive: 0, open: 0 },
    total_wards: 0,
    meaning: "Council race assessment is unavailable.",
  },
  forecast: {
    status: "error",
    unavailable_reasons: ["snapshot_unavailable"],
    model_version: "unavailable",
    diagnostics: {},
    gates: {},
  },
  composition: {
    status: "unavailable",
    unavailable_reasons: ["ward_forecast_unavailable"],
    mean_incumbents_returned: null,
    interval: null,
    conditional_on_mayor: {},
  },
  mayoral_context: {
    forecast_version: "unavailable",
    forecast_status: "error",
    used_in_public_ward_odds: false,
  },
};

export const EMPTY_WARDS_RESPONSE: WardsResponse = {
  schema_version: 3,
  as_of: null,
  wards: [],
  challengers: [],
  council_model: EMPTY_COUNCIL_MODEL,
  mayoral_forecast_version: "unavailable",
  mayoral_forecast_status: "error",
  phase: { phase: 1, label: "", description: "" },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || isFiniteNumber(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isForecastStatus(value: unknown): boolean {
  return ["available", "insufficient_data", "unstable", "error"].includes(
    String(value)
  );
}

function isWardPollCandidate(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    isFiniteNumber(value.share) && value.share >= 0 && value.share <= 1 &&
    typeof value.is_incumbent === "boolean" &&
    typeof value.is_residual === "boolean" &&
    ["registered", "unregistered", "residual"].includes(String(value.registration_status))
  );
}

function isWardPoll(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    typeof value.poll_id === "string" &&
    typeof value.firm === "string" &&
    typeof value.date_conducted === "string" &&
    typeof value.date_published === "string" &&
    Number.isInteger(value.sample_size) && Number(value.sample_size) > 0 &&
    typeof value.methodology === "string" &&
    typeof value.denominator === "string" &&
    ["current_field", "different_candidate_field", "hypothetical"].includes(
      String(value.ballot_status)
    ) &&
    isFiniteNumber(value.undecided_share) && value.undecided_share >= 0 && value.undecided_share <= 1 &&
    (value.source_url === null || typeof value.source_url === "string") &&
    Array.isArray(value.candidates) && value.candidates.every(isWardPollCandidate)
  );
}

function isWardEvidence(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const prior = value.prior_result;
  const field = value.registered_field;
  const polling = value.ward_polling;
  if (!isRecord(prior) || !isRecord(field) || !isRecord(polling)) return false;

  const priorValid =
    Number.isInteger(prior.election_year) &&
    isFiniteNumber(prior.incumbent_share) &&
    isFiniteNumber(prior.electorate_share) &&
    isNullableNumber(prior.margin) &&
    (prior.runner_up === null || typeof prior.runner_up === "string") &&
    isNullableNumber(prior.runner_up_share) &&
    typeof prior.by_election === "boolean";
  const fieldValid =
    Number.isInteger(field.candidate_count) &&
    Number.isInteger(field.challenger_count) &&
    Number.isInteger(field.known_challenger_count) &&
    Number.isInteger(field.well_known_challenger_count) &&
    Number.isInteger(field.credible_challenger_count) &&
    (field.strongest_name_recognition_tier === null ||
      ["well-known", "known", "unknown"].includes(String(field.strongest_name_recognition_tier))) &&
    typeof field.returning_runner_up === "boolean";
  const pollingValid =
    ["available", "unavailable"].includes(String(polling.availability)) &&
    Number.isInteger(polling.current_field_poll_count) &&
    Number.isInteger(polling.total_poll_count) &&
    Array.isArray(polling.polls) &&
    polling.polls.every(isWardPoll) &&
    polling.total_poll_count === polling.polls.length;

  if (!priorValid || !fieldValid || !pollingValid) return false;
  if (value.mayoral_context === undefined) return true;
  if (!isRecord(value.mayoral_context)) return false;
  return (
    value.mayoral_context.status === "context_only" &&
    value.mayoral_context.used_in_ward_forecast === false &&
    isFiniteNumber(value.mayoral_context.councillor_chow_alignment) &&
    isFiniteNumber(value.mayoral_context.alignment_vs_council_average) &&
    isFiniteNumber(value.mayoral_context.ward_chow_lean)
  );
}

function isWardForecast(value: unknown): boolean {
  if (!isRecord(value) || !isForecastStatus(value.status)) return false;
  if (!isStringArray(value.unavailable_reasons) || typeof value.model_version !== "string") {
    return false;
  }
  const probability = value.incumbent_win_probability;
  if (!isNullableNumber(probability) || (probability !== null && (probability < 0 || probability > 1))) {
    return false;
  }
  const interval = value.incumbent_probability_interval;
  if (
    interval !== null &&
    (!isRecord(interval) || !isFiniteNumber(interval.low) || !isFiniteNumber(interval.high) ||
      interval.low < 0 || interval.high > 1 || interval.low > interval.high)
  ) {
    return false;
  }
  return value.status === "available"
    ? probability !== null && interval !== null
    : probability === null && interval === null && value.unavailable_reasons.length > 0;
}

function isWard(value: unknown): value is Ward {
  if (!isRecord(value)) return false;
  return (
    Number.isInteger(value.ward) && Number(value.ward) >= 1 && Number(value.ward) <= 25 &&
    typeof value.councillor_name === "string" &&
    Number.isInteger(value.election_year) &&
    typeof value.is_running === "boolean" &&
    typeof value.is_byelection_incumbent === "boolean" &&
    isFiniteNumber(value.defeatability_score) &&
    ["safe", "competitive", "open"].includes(String(value.race_class)) &&
    isStringArray(value.race_status_reasons) && value.race_status_reasons.length > 0 &&
    isWardEvidence(value.evidence) &&
    isWardForecast(value.forecast)
  );
}

function isChallenger(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    Number.isInteger(value.ward) && Number(value.ward) >= 1 && Number(value.ward) <= 25 &&
    typeof value.candidate_name === "string" &&
    ["well-known", "known", "unknown"].includes(String(value.name_recognition_tier)) &&
    typeof value.mayoral_alignment === "string" &&
    typeof value.is_endorsed_by_departing === "boolean" &&
    (value.prior_ward_vote_share === undefined || isNullableNumber(value.prior_ward_vote_share)) &&
    (value.prior_ward_election_year === undefined || isNullableNumber(value.prior_ward_election_year)) &&
    (value.is_returning_runner_up === undefined || typeof value.is_returning_runner_up === "boolean")
  );
}

function isCouncilModel(value: unknown): value is CouncilModel {
  if (!isRecord(value)) return false;
  const assessment = value.assessment;
  const forecast = value.forecast;
  const composition = value.composition;
  const mayoral = value.mayoral_context;
  if (!isRecord(assessment) || !isRecord(forecast) || !isRecord(composition) || !isRecord(mayoral)) {
    return false;
  }
  const counts = assessment.status_counts;
  return (
    typeof assessment.version === "string" &&
    isRecord(counts) &&
    Number.isInteger(counts.safe) && Number.isInteger(counts.competitive) && Number.isInteger(counts.open) &&
    Number.isInteger(assessment.total_wards) &&
    typeof assessment.meaning === "string" &&
    isForecastStatus(forecast.status) &&
    isStringArray(forecast.unavailable_reasons) &&
    typeof forecast.model_version === "string" &&
    isRecord(forecast.diagnostics) &&
    isRecord(forecast.gates) &&
    ["available", "unavailable"].includes(String(composition.status)) &&
    isStringArray(composition.unavailable_reasons) &&
    isNullableNumber(composition.mean_incumbents_returned) &&
    (composition.interval === null || isRecord(composition.interval)) &&
    isRecord(composition.conditional_on_mayor) &&
    typeof mayoral.forecast_version === "string" &&
    isForecastStatus(mayoral.forecast_status) &&
    mayoral.used_in_public_ward_odds === false
  );
}

export function parseCouncilSnapshot(value: unknown): WardsResponse {
  if (!isRecord(value) || value.schema_version !== 3) {
    throw new Error("Council snapshot is not schema version 3");
  }
  if (!Array.isArray(value.wards) || !value.wards.every(isWard)) {
    throw new Error("Council snapshot has an invalid ward collection");
  }
  const wardNumbers = value.wards.map((ward) => ward.ward);
  if (new Set(wardNumbers).size !== wardNumbers.length) {
    throw new Error("Council snapshot has duplicate wards");
  }
  if (!Array.isArray(value.challengers) || !value.challengers.every(isChallenger) || !isCouncilModel(value.council_model)) {
    throw new Error("Council snapshot is missing its model or challenger field");
  }
  const model = value.council_model;
  const actualCounts = { safe: 0, competitive: 0, open: 0 };
  value.wards.forEach((ward) => { actualCounts[ward.race_class] += 1; });
  const publishedCounts = model.assessment.status_counts;
  if (
    model.assessment.total_wards !== value.wards.length ||
    publishedCounts.safe !== actualCounts.safe ||
    publishedCounts.competitive !== actualCounts.competitive ||
    publishedCounts.open !== actualCounts.open
  ) {
    throw new Error("Council snapshot race-status counts do not match its wards");
  }
  if (
    !(value.as_of === null || typeof value.as_of === "string") ||
    typeof value.mayoral_forecast_version !== "string" ||
    !isForecastStatus(value.mayoral_forecast_status) ||
    !isRecord(value.phase) ||
    ![1, 2, 3].includes(Number(value.phase.phase)) ||
    typeof value.phase.label !== "string" ||
    typeof value.phase.description !== "string"
  ) {
    throw new Error("Council snapshot metadata is invalid");
  }
  return value as unknown as WardsResponse;
}

export async function getWards(): Promise<WardsResponse> {
  try {
    const response = await fetch(
      dataUrl("model_snapshot.json"),
      process.env.NEXT_PUBLIC_API_URL
        ? { cache: "no-store" }
        : { next: { revalidate: 3600 } }
    );
    if (!response.ok) return EMPTY_WARDS_RESPONSE;
    return parseCouncilSnapshot(await response.json());
  } catch (error) {
    console.error("Failed to fetch Council snapshot:", error);
    return EMPTY_WARDS_RESPONSE;
  }
}

export async function getWard(wardNum: number): Promise<WardResponse> {
  const snapshot = await getWards();
  if (snapshot.wards.length === 0) {
    return {
      ward: null,
      challengers: [],
      council_model: snapshot.council_model,
      error: "unavailable",
    };
  }
  const ward = snapshot.wards.find((item) => item.ward === wardNum) ?? null;
  if (!ward) {
    return {
      ward: null,
      challengers: [],
      council_model: snapshot.council_model,
      error: "not_found",
    };
  }
  const challengers = (snapshot.challengers as Challenger[]).filter(
    (candidate) => candidate.ward === wardNum
  );
  return { ward, challengers, council_model: snapshot.council_model };
}
