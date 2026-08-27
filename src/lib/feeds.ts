/**
 * Typed loaders for the publication feeds (spec §Data layer). Each validates its
 * shape. Model-availability feeds retain honest fallbacks; required certified-field
 * contracts fail the build when malformed.
 *
 * Server-only (imports feed-source, which touches the filesystem).
 */

import { loadFeed, loadRequiredFeed } from "@/lib/feed-source";
import type {
  CouncilRaceCardsFeed,
  ForecastQuantityCard,
  Manifest,
  MayoralCandidatesFeed,
  MayoralForecastFeed,
  MayoralPollingFeed,
  QuantityKind,
  TrusteeRaceCardsFeed,
} from "@/types/feeds";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ── mayoral forecast ────────────────────────────────────────────────────────

function unavailableCard(quantity: QuantityKind): ForecastQuantityCard {
  return {
    quantity,
    candidate_id: null,
    tier: "",
    availability: "Forecast Unavailable",
    band: null,
    frequency_statement: null,
    probability: null,
    reason: "The forecast feed is unavailable.",
  };
}

const FORECAST_FALLBACK: MayoralForecastFeed = {
  schema_version: 2,
  election_cycle_id: "",
  evidence_tier: "",
  final_field_samples: [],
  incumbent_candidate_id: null,
  candidate_win: {},
  close_result: unavailableCard("close_result"),
  incumbent_defeat: unavailableCard("incumbent_defeat"),
  margin_distribution: null,
};

function validateForecast(value: unknown): MayoralForecastFeed | null {
  if (!isRecord(value) || value.schema_version !== 2) return null;
  if (!isRecord(value.candidate_win)) return null;
  if (!isRecord(value.close_result) || !isRecord(value.incumbent_defeat)) return null;
  return value as unknown as MayoralForecastFeed;
}

export function loadMayoralForecast(): Promise<MayoralForecastFeed> {
  return loadFeed("mayoral_forecast.json", validateForecast, FORECAST_FALLBACK);
}

// ── mayoral polling ─────────────────────────────────────────────────────────

const MAYORAL_CANDIDATES_FALLBACK: MayoralCandidatesFeed = {
  schema_version: 3,
  event_id: "",
  contest_id: "",
  election_date: "",
  ballot_certified: false,
  coverage: {
    policy: "full_verified_canadian_electoral_career",
    jurisdiction: "Canada",
    year_cutoff: null,
    cohort_id: "",
    source_release: "",
    review_date: "",
    methodology_note: "",
  },
  candidates: [],
};

export function validateMayoralCandidates(
  value: unknown,
): MayoralCandidatesFeed | null {
  if (!isRecord(value) || value.schema_version !== 3) return null;
  if (typeof value.event_id !== "string" || typeof value.contest_id !== "string") return null;
  if (typeof value.election_date !== "string") return null;
  if (typeof value.ballot_certified !== "boolean") return null;
  if (!isRecord(value.coverage)) return null;
  if (
    value.coverage.policy !== "full_verified_canadian_electoral_career" ||
    value.coverage.jurisdiction !== "Canada" ||
    value.coverage.year_cutoff !== null ||
    typeof value.coverage.cohort_id !== "string" ||
    typeof value.coverage.source_release !== "string" ||
    typeof value.coverage.review_date !== "string" ||
    typeof value.coverage.methodology_note !== "string"
  ) return null;
  if (!Array.isArray(value.candidates)) return null;
  if (!value.ballot_certified && value.candidates.length > 0) return null;
  const validCandidates = value.candidates.every(
    (candidate) =>
      isRecord(candidate) &&
      typeof candidate.candidacy_id === "string" &&
      typeof candidate.display_name === "string" &&
      (typeof candidate.person_id === "string" || candidate.person_id === null) &&
      typeof candidate.is_incumbent === "boolean" &&
      ["reviewed", "reviewed_with_limitations", "no_verified_prior_candidacy"].includes(
        String(candidate.review_status),
      ) &&
      (typeof candidate.review_limitations === "string" ||
        candidate.review_limitations === null) &&
      Array.isArray(candidate.past_elections),
  );
  return validCandidates ? (value as unknown as MayoralCandidatesFeed) : null;
}

export function loadMayoralCandidates(): Promise<MayoralCandidatesFeed> {
  return loadFeed(
    "mayoral_candidates.json",
    validateMayoralCandidates,
    MAYORAL_CANDIDATES_FALLBACK,
  );
}

// ── trustee races ──────────────────────────────────────────────────────────

const TRUSTEE_BOARD_CONTRACT = {
  tdsb: {
    representedBody: "toronto_district_school_board",
    boundaryRegime: "tdsb-trustee-wards-2026",
    wards: Array.from({ length: 12 }, (_, index) => String(index + 1)),
  },
  tcdsb: {
    representedBody: "toronto_catholic_district_school_board",
    boundaryRegime: "tcdsb-trustee-wards-2026",
    wards: Array.from({ length: 12 }, (_, index) => String(index + 1)),
  },
  viamonde: {
    representedBody: "conseil_scolaire_viamonde",
    boundaryRegime: "viamonde-trustee-wards-2026",
    wards: ["2", "3", "4"],
  },
  monavenir: {
    representedBody: "conseil_scolaire_catholique_monavenir",
    boundaryRegime: "monavenir-trustee-wards-2026",
    wards: ["3", "4"],
  },
} as const;

const TRUSTEE_BOARD_ORDER = ["tdsb", "tcdsb", "viamonde", "monavenir"] as const;

function validPastElection(value: unknown): boolean {
  if (
    !isRecord(value) ||
    typeof value.year !== "number" ||
    !Number.isInteger(value.year) ||
    typeof value.election_date !== "string" ||
    value.election_date < "2003-01-01" ||
    value.election_date >= "2026-10-26" ||
    Number(value.election_date.slice(0, 4)) !== value.year ||
    typeof value.office_type !== "string" ||
    typeof value.represented_body !== "string" ||
    (typeof value.district_name !== "string" && value.district_name !== null) ||
    (typeof value.party_name !== "string" && value.party_name !== null) ||
    (value.result !== "won" && value.result !== "lost") ||
    (value.vote_share !== null &&
      (typeof value.vote_share !== "number" || value.vote_share < 0 || value.vote_share > 1)) ||
    (value.rank !== null &&
      (typeof value.rank !== "number" || !Number.isInteger(value.rank) || value.rank < 1)) ||
    (value.field_size !== null &&
      (typeof value.field_size !== "number" ||
        !Number.isInteger(value.field_size) ||
        value.field_size < 1))
  ) return false;
  return value.rank === null || value.field_size === null || value.rank <= value.field_size;
}

const TDSB_CONTEXT_PRIORITY = {
  open: 0,
  two_incumbents: 1,
  one_incumbent: 2,
  acclaimed: 3,
} as const;

const CONTINUOUS_CONTEXT_PRIORITY = {
  open: 0,
  won_without_majority: 1,
  contested_incumbent: 2,
  acclaimed: 3,
} as const;

function validTrusteeRaceContext(value: unknown, boardId: string): boolean {
  if (!isRecord(value) || !Number.isInteger(value.sort_priority)) return false;
  const priorities: Readonly<Record<string, number>> =
    boardId === "tdsb" ? TDSB_CONTEXT_PRIORITY : CONTINUOUS_CONTEXT_PRIORITY;
  const method =
    boardId === "tdsb" ? "tdsb_field_structure" : "continuous_ward_vote_share";
  const category = String(value.category);
  if (
    value.method !== method ||
    !(category in priorities) ||
    value.sort_priority !== priorities[category]
  ) return false;
  if (category !== "won_without_majority") return value.signal === null;
  if (!isRecord(value.signal)) return false;
  return (
    value.signal.key === "prior_win_under_50" &&
    typeof value.signal.subject_person_id === "string" &&
    value.signal.subject_person_id.length > 0 &&
    typeof value.signal.subject_name === "string" &&
    value.signal.subject_name.length > 0 &&
    Number.isInteger(value.signal.election_year) &&
    Number(value.signal.election_year) >= 2003 &&
    Number(value.signal.election_year) < 2026 &&
    typeof value.signal.vote_share === "number" &&
    Number.isFinite(value.signal.vote_share) &&
    value.signal.vote_share >= 0 &&
    value.signal.vote_share < 0.5
  );
}

function validPriorResult(value: unknown): boolean {
  if (
    !isRecord(value) ||
    typeof value.year !== "number" ||
    !Number.isInteger(value.year) ||
    value.year < 2003 ||
    value.year >= 2026 ||
    typeof value.winner_name !== "string" ||
    typeof value.winner_share !== "number" ||
    value.winner_share < 0 ||
    value.winner_share > 1 ||
    typeof value.winner_votes !== "number" ||
    !Number.isInteger(value.winner_votes) ||
    value.winner_votes < 0 ||
    (typeof value.runner_up_name !== "string" && value.runner_up_name !== null) ||
    (value.runner_up_share !== null &&
      (typeof value.runner_up_share !== "number" ||
        value.runner_up_share < 0 ||
        value.runner_up_share > 1)) ||
    (value.margin_votes !== null &&
      (typeof value.margin_votes !== "number" ||
        !Number.isInteger(value.margin_votes) ||
        value.margin_votes < 0)) ||
    (value.margin_share !== null &&
      (typeof value.margin_share !== "number" || value.margin_share < 0 || value.margin_share > 1)) ||
    typeof value.field_size !== "number" ||
    !Number.isInteger(value.field_size) ||
    value.field_size < 1
  ) return false;
  const hasRunner = value.runner_up_name !== null;
  return (
    hasRunner === (value.runner_up_share !== null) &&
    hasRunner === (value.margin_votes !== null) &&
    hasRunner === (value.margin_share !== null) &&
    (!hasRunner || value.field_size >= 2)
  );
}

export function validateTrusteeRaceCards(value: unknown): TrusteeRaceCardsFeed | null {
  if (!isRecord(value) || value.schema_version !== 1) return null;
  if (
    typeof value.event_id !== "string" ||
    value.election_date !== "2026-10-26" ||
    value.ballot_certified !== true ||
    !isRecord(value.coverage) ||
    value.coverage.policy !== "verified_toronto_electoral_history_since_2003" ||
    value.coverage.jurisdiction !== "Toronto" ||
    value.coverage.year_cutoff !== 2003 ||
    typeof value.coverage.cohort_id !== "string" ||
    !Number.isInteger(value.coverage.cohort_size) ||
    typeof value.coverage.source_release !== "string" ||
    typeof value.coverage.review_date !== "string" ||
    typeof value.coverage.methodology_note !== "string" ||
    !Array.isArray(value.boards) ||
    value.boards.length !== TRUSTEE_BOARD_ORDER.length
  ) return null;

  const contestIds = new Set<string>();
  const candidacyIds = new Set<string>();
  let candidateCount = 0;
  for (const [index, boardId] of TRUSTEE_BOARD_ORDER.entries()) {
    const board = value.boards[index];
    const contract = TRUSTEE_BOARD_CONTRACT[boardId];
    if (
      !isRecord(board) ||
      board.board_id !== boardId ||
      board.represented_body !== contract.representedBody ||
      board.boundary_regime !== contract.boundaryRegime ||
      typeof board.display_name !== "string" ||
      typeof board.short_name !== "string" ||
      !Number.isInteger(board.candidate_count) ||
      !Array.isArray(board.wards) ||
      board.wards.length !== contract.wards.length
    ) return null;

    let boardCandidateCount = 0;
    const boardCityWards = new Set<number>();
    const expectedWardIds = new Set<string>(contract.wards);
    const boardWardIds = new Set<string>();
    let previousOrder: [number, number] | null = null;
    for (const ward of board.wards) {
      if (
        !isRecord(ward) ||
        typeof ward.ward_id !== "string" ||
        !expectedWardIds.has(ward.ward_id) ||
        boardWardIds.has(ward.ward_id) ||
        typeof ward.contest_id !== "string" ||
        contestIds.has(ward.contest_id) ||
        typeof ward.district_name !== "string" ||
        !Array.isArray(ward.city_wards) ||
        ward.city_wards.length === 0 ||
        !ward.city_wards.every(
          (cityWard) => Number.isInteger(cityWard) && cityWard >= 1 && cityWard <= 25,
        ) ||
        new Set(ward.city_wards).size !== ward.city_wards.length ||
        !Array.isArray(ward.candidates) ||
        ward.candidates.length === 0 ||
        !validTrusteeRaceContext(ward.race_context, boardId)
      ) return null;
      boardWardIds.add(ward.ward_id);
      contestIds.add(ward.contest_id);
      for (const cityWard of ward.city_wards) {
        if (boardCityWards.has(cityWard)) return null;
        boardCityWards.add(cityWard);
      }

      const validStatus = ward.acclaimed
        ? ward.result_status === "final" &&
          ward.outcome_method === "acclamation" &&
          ward.candidates.length === 1
        : ward.result_status === "pending" && ward.outcome_method === "pending";
      if (!validStatus) return null;
      const context = ward.race_context as { category: string; sort_priority: number };
      if ((context.category === "acclaimed") !== (ward.acclaimed === true)) return null;
      const currentOrder: [number, number] = [context.sort_priority, Number(ward.ward_id)];
      if (
        previousOrder &&
        (currentOrder[0] < previousOrder[0] ||
          (currentOrder[0] === previousOrder[0] && currentOrder[1] <= previousOrder[1]))
      ) return null;
      previousOrder = currentOrder;
      if (
        ward.comparable_prior_result !== null &&
        !validPriorResult(ward.comparable_prior_result)
      ) return null;
      if (boardId === "tdsb" && ward.comparable_prior_result !== null) return null;

      for (const candidate of ward.candidates) {
        if (
          !isRecord(candidate) ||
          typeof candidate.candidacy_id !== "string" ||
          candidacyIds.has(candidate.candidacy_id) ||
          typeof candidate.display_name !== "string" ||
          (typeof candidate.person_id !== "string" && candidate.person_id !== null) ||
          (candidate.is_incumbent !== true && candidate.is_incumbent !== null) ||
          !Array.isArray(candidate.past_elections) ||
          !candidate.past_elections.every(validPastElection) ||
          (candidate.past_elections.length > 0 && candidate.person_id === null)
        ) return null;
        const pastElections = candidate.past_elections as Array<{ election_date: string }>;
        if (
          pastElections.some(
            (election, electionIndex) =>
              electionIndex > 0 &&
              pastElections[electionIndex - 1].election_date < election.election_date,
          )
        ) return null;
        candidacyIds.add(candidate.candidacy_id);
      }
      boardCandidateCount += ward.candidates.length;
    }
    if (contract.wards.some((wardId) => !boardWardIds.has(wardId))) return null;
    if (
      boardCityWards.size !== 25 ||
      Array.from({ length: 25 }, (_, cityWard) => cityWard + 1).some(
        (cityWard) => !boardCityWards.has(cityWard),
      )
    ) return null;
    if (boardCandidateCount !== board.candidate_count) return null;
    candidateCount += boardCandidateCount;
  }
  if (contestIds.size !== 29 || candidateCount !== value.coverage.cohort_size) return null;
  return value as unknown as TrusteeRaceCardsFeed;
}

export function loadTrusteeRaceCards(): Promise<TrusteeRaceCardsFeed> {
  return loadRequiredFeed("trustee_race_cards.json", validateTrusteeRaceCards);
}

const POLLING_FALLBACK: MayoralPollingFeed = {
  schema_version: 2,
  candidates: [],
  polls: [],
  latest: null,
  trend: {},
};

function validatePolling(value: unknown): MayoralPollingFeed | null {
  if (!isRecord(value) || value.schema_version !== 2) return null;
  if (!Array.isArray(value.polls) || !isRecord(value.trend)) return null;
  return value as unknown as MayoralPollingFeed;
}

export function loadMayoralPolling(): Promise<MayoralPollingFeed> {
  return loadFeed("mayoral_polling.json", validatePolling, POLLING_FALLBACK);
}

// ── council race cards ──────────────────────────────────────────────────────

const COUNCIL_FALLBACK: CouncilRaceCardsFeed = {
  schema_version: 5,
  base_rate_note: "",
  wards: {},
};

function validateCouncil(value: unknown): CouncilRaceCardsFeed | null {
  if (!isRecord(value) || value.schema_version !== 5) return null;
  if (!isRecord(value.wards)) return null;
  return value as unknown as CouncilRaceCardsFeed;
}

export function loadCouncilRaceCards(): Promise<CouncilRaceCardsFeed> {
  return loadFeed("council_race_cards.json", validateCouncil, COUNCIL_FALLBACK);
}

// ── manifest ────────────────────────────────────────────────────────────────

const MANIFEST_FALLBACK: Manifest = {
  schema_version: 1,
  generated_at: "",
};

function validateManifest(value: unknown): Manifest | null {
  if (!isRecord(value) || value.schema_version !== 1) return null;
  if (typeof value.generated_at !== "string") return null;
  return value as unknown as Manifest;
}

export function loadManifest(): Promise<Manifest> {
  return loadFeed("manifest.json", validateManifest, MANIFEST_FALLBACK);
}
