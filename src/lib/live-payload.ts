/**
 * Validator for the election-night payload (`docs/payload.md` in
 * toronto-election-live-projection), pinned to one schema version. The route and,
 * later, the browser run the same check: anything that fails it is never served
 * or shown.
 *
 * Pure: safe for the route, the browser and tests.
 */

import type {
  LiveBand,
  LiveCandidate,
  LiveLevel,
  LiveMayoralWard,
  LivePayload,
  LiveProgress,
  LiveRace,
} from "@/types/live";

export const LIVE_SCHEMA_VERSION = 3;

/** A level's projection status (#45): live, or why it shows the tally. */
const PROJECTION_STATUSES = new Set([
  "live",
  "gate_failed",
  "version_mismatch",
  "gate_missing",
  "stub",
  "ungated",
  "none",
  "switched_off",
]);
const RACE_STATES = new Set([
  "before_results",
  "no_units_in",
  "counting",
  "all_units_in",
  "acclaimed",
  "no_figures",
]);
const FAULT_REASONS = new Set(["row_unreadable", "race_missing"]);

/** Race id prefix → level. The id's suffix is the race's `num`. */
const ID_LEVELS: Record<string, LiveLevel> = {
  councillor: "council",
  tdsb: "trustee",
  tcdsb: "trustee",
  viamonde: "french_trustee",
  monavenir: "french_trustee",
};

/** Projection variants each level may carry. */
const LEVEL_VARIANTS: Record<LiveLevel, ReadonlySet<string>> = {
  mayor: new Set(["count_only", "forecast_weighted"]),
  council: new Set(["count_only"]),
  trustee: new Set(["count_only"]),
  french_trustee: new Set(["count_only"]),
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/** Names pass through from the City as written, so an empty string is valid. */
function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isCount(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function isPercent(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
}

function validProgress(value: unknown): value is LiveProgress | null {
  return value === null || (isRecord(value) && isCount(value.received) && isCount(value.total));
}

/** A `{reason}` object, or null. */
function validReasonObject(value: unknown, allowed?: ReadonlySet<string>): boolean {
  return (
    value === null ||
    (isRecord(value) &&
      isNonEmptyString(value.reason) &&
      (allowed === undefined || allowed.has(value.reason)))
  );
}

function validCandidate(value: unknown): value is LiveCandidate {
  return (
    isRecord(value) &&
    typeof value.key === "string" &&
    typeof value.full_name === "string" &&
    isNullableString(value.short_label) &&
    isNullableString(value.candidacy_id) &&
    isNullableString(value.candidate_id) &&
    (value.votes === null || isCount(value.votes)) &&
    (value.share === null || isPercent(value.share))
  );
}

function validBand(value: unknown): value is LiveBand {
  return (
    isRecord(value) &&
    isPercent(value.low) &&
    isPercent(value.mid) &&
    isPercent(value.high) &&
    value.low <= value.mid &&
    value.mid <= value.high
  );
}

const VARIANT_IN_EFFECT = new Set(["forecast_weighted", "count_only"]);
const VARIANT_OFF_REASONS = new Set([
  "low_ess",
  "forecast_missing",
  "forecast_corrupt",
  "forecast_unmatched",
]);

/** The mayor's marker of which band is in effect: the variant, or count-only and why. */
function validVariant(value: unknown): boolean {
  if (!isRecord(value) || typeof value.in_effect !== "string") return false;
  if (!VARIANT_IN_EFFECT.has(value.in_effect)) return false;
  if (!(value.ess === null || (typeof value.ess === "number" && Number.isFinite(value.ess) && value.ess >= 0))) {
    return false;
  }
  return value.in_effect === "forecast_weighted"
    ? value.off_reason === null
    : typeof value.off_reason === "string" && VARIANT_OFF_REASONS.has(value.off_reason);
}

function validProjection(value: unknown, level: LiveLevel, keys: ReadonlySet<string>): boolean {
  if (value === null) return true;
  if (!isRecord(value) || typeof value.stub !== "boolean" || !isRecord(value.bands)) return false;
  if ("variant" in value && (level !== "mayor" || !validVariant(value.variant))) return false;
  // The band the page draws: one the race carries, or none (the approved mayor below its ESS
  // floor carries no band at all, ADR 0002). Stub projections name none.
  if ("shown" in value) {
    if (value.shown !== null && !(typeof value.shown === "string" && value.shown in value.bands)) return false;
  } else if (!value.stub) {
    return false;
  }
  const variants = Object.entries(value.bands);
  return (
    (variants.length > 0 || value.shown === null) &&
    variants.every(
      ([variant, bands]) =>
        LEVEL_VARIANTS[level].has(variant) &&
        isRecord(bands) &&
        Object.entries(bands).every(([key, band]) => keys.has(key) && validBand(band)),
    )
  );
}

/** The Possible Range (ADR 0002): the race's own candidates, each 0 <= low <= high <= 100. */
function validPossible(value: unknown, keys: ReadonlySet<string>): boolean {
  if (value === null) return true;
  if (!isRecord(value)) return false;
  return Object.entries(value).every(
    ([key, range]) =>
      keys.has(key) &&
      isRecord(range) &&
      isPercent(range.low) &&
      isPercent(range.high) &&
      range.low <= range.high,
  );
}

function validWard(value: unknown, keys: readonly string[]): value is LiveMayoralWard {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.num) ||
    !isNullableString(value.name) ||
    !validProgress(value.progress) ||
    !(value.votes_counted === null || isCount(value.votes_counted))
  ) return false;
  if (value.votes === null) return true;
  if (!isRecord(value.votes)) return false;
  const voteKeys = Object.keys(value.votes);
  return (
    voteKeys.length === keys.length &&
    voteKeys.every((key, i) => key === keys[i] && isCount((value.votes as Record<string, unknown>)[key]))
  );
}

/** The level and num a race id encodes, or null for an unknown id. The bundle
 *  parses each num as an integer, so it is digits as the City writes them. */
function parseRaceId(id: string): { level: LiveLevel; num: string } | null {
  if (id === "mayor") return { level: "mayor", num: "0" };
  const match = /^([a-z]+)-(\d+)$/.exec(id);
  if (!match || !(match[1] in ID_LEVELS)) return null;
  return { level: ID_LEVELS[match[1]], num: match[2] };
}

function validRace(value: unknown, payloadState: string): value is LiveRace {
  if (!isRecord(value) || !isNonEmptyString(value.id)) return false;
  const implied = parseRaceId(value.id);
  if (
    implied === null ||
    value.level !== implied.level ||
    value.num !== implied.num ||
    !isNullableString(value.name) ||
    typeof value.state !== "string" ||
    !RACE_STATES.has(value.state) ||
    // A payload before results holds only races before results, and vice versa.
    (value.state === "before_results") !== (payloadState === "before_results") ||
    !validProgress(value.progress) ||
    !Array.isArray(value.candidates) ||
    !value.candidates.every(validCandidate) ||
    !validReasonObject(value.withdrawal) ||
    !validReasonObject(value.fault, FAULT_REASONS) ||
    // A fault is exactly why a race has no figures.
    (value.fault !== null) !== (value.state === "no_figures") ||
    // Projections and Possible Ranges appear only while a race is counting.
    (value.projection !== null && value.state !== "counting") ||
    !("possible" in value) ||
    (value.possible !== null && value.state !== "counting")
  ) return false;

  const keys = value.candidates.map((candidate) => candidate.key);
  if (new Set(keys).size !== keys.length) return false;
  if (!validProjection(value.projection, implied.level, new Set(keys))) return false;
  if (!validPossible(value.possible, new Set(keys))) return false;

  if (implied.level !== "mayor") return !("wards" in value);
  return Array.isArray(value.wards) && value.wards.every((ward) => validWard(ward, keys));
}

function validLevels(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const statusOf = (level: unknown) => isRecord(level) && PROJECTION_STATUSES.has(String(level.projection));
  return (
    statusOf(value.mayor) &&
    PROJECTION_STATUSES.has(String((value.mayor as Record<string, unknown>).variant)) &&
    typeof (value.mayor as Record<string, unknown>).approved === "boolean" &&
    statusOf(value.council) &&
    statusOf(value.trustee) &&
    statusOf(value.french_trustee)
  );
}

export function validateLivePayload(value: unknown): LivePayload | null {
  if (
    !isRecord(value) ||
    value.schema_version !== LIVE_SCHEMA_VERSION ||
    !isNonEmptyString(value.model_version) ||
    !isNullableString(value.forecast_release_tag) ||
    !isRecord(value.seq) ||
    !isCount(value.seq.all_office) ||
    !isCount(value.seq.ward_by_ward) ||
    !(value.election_desc === null || typeof value.election_desc === "string") ||
    typeof value.rehearsal !== "boolean" ||
    (value.state !== "before_results" && value.state !== "results") ||
    !validLevels(value.levels) ||
    !Array.isArray(value.races) ||
    value.races.length === 0
  ) return null;

  const state = value.state;
  if (!value.races.every((race) => validRace(race, state))) return null;
  const ids = value.races.map((race) => (race as LiveRace).id);
  if (new Set(ids).size !== ids.length) return null;
  return value as unknown as LivePayload;
}
