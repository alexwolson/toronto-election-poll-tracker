/**
 * Typed loaders for the five feeds (spec §Data layer). Each validates the shape
 * and falls back to a safe, honest default so a missing or malformed feed
 * degrades gracefully instead of breaking the build.
 *
 * Server-only (imports feed-source, which touches the filesystem).
 */

import { loadFeed } from "@/lib/feed-source";
import type {
  CouncilRaceCardsFeed,
  ForecastQuantityCard,
  Manifest,
  MayoralCandidatesFeed,
  MayoralForecastFeed,
  MayoralPollingFeed,
  QuantityKind,
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
  schema_version: 2,
  event_id: "",
  contest_id: "",
  election_date: "",
  ballot_certified: false,
  candidates: [],
};

export function validateMayoralCandidates(
  value: unknown,
): MayoralCandidatesFeed | null {
  if (!isRecord(value) || value.schema_version !== 2) return null;
  if (typeof value.event_id !== "string" || typeof value.contest_id !== "string") return null;
  if (typeof value.election_date !== "string") return null;
  if (typeof value.ballot_certified !== "boolean") return null;
  if (!Array.isArray(value.candidates)) return null;
  if (!value.ballot_certified && value.candidates.length > 0) return null;
  const validCandidates = value.candidates.every(
    (candidate) =>
      isRecord(candidate) &&
      typeof candidate.candidacy_id === "string" &&
      typeof candidate.display_name === "string" &&
      (typeof candidate.person_id === "string" || candidate.person_id === null) &&
      typeof candidate.is_incumbent === "boolean" &&
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
