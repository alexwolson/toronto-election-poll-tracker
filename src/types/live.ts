/**
 * TypeScript contract for the election-night payload, schema version 1.
 *
 * Mirrors `docs/payload.md` in toronto-election-live-projection: the one citywide
 * file each pipeline stores in Redis and `/live/results.json` serves. Shares are
 * percent (0..100, 2 dp), not fractions.
 */

export type LiveLevel = "mayor" | "council" | "trustee" | "french_trustee";

/** Later tickets add the gated statuses, with a schema bump. */
export type ProjectionStatus = "stub" | "none";

export type LivePayloadState = "before_results" | "results";

export type LiveRaceState =
  | "before_results"
  | "no_units_in"
  | "counting"
  | "all_units_in"
  | "acclaimed"
  | "no_figures";

/** Reporting Progress: the feed's `pollsReceived` of `polls`. Published as the
 *  City writes it, so `received` can exceed `total`. */
export interface LiveProgress {
  received: number;
  total: number;
}

export interface LiveCandidate {
  /** The Ballot Name exactly as the feed writes it; unique within the race. */
  key: string;
  full_name: string;
  short_label: string | null;
  candidacy_id: string | null;
  /** The forecast's `candidate_id`, on its leader and challenger only. */
  candidate_id: string | null;
  votes: number | null;
  share: number | null;
}

export interface LiveBand {
  low: number;
  mid: number;
  high: number;
}

export type ProjectionVariant = "count_only" | "forecast_weighted";

export interface LiveProjection {
  stub: boolean;
  /** variant → candidate key → band, in percent. */
  bands: Partial<Record<ProjectionVariant, Record<string, LiveBand>>>;
}

export interface LiveMayoralWard {
  num: string;
  name: string;
  progress: LiveProgress | null;
  votes_counted: number | null;
  /** candidate key → votes, in the race's candidate order. */
  votes: Record<string, number> | null;
}

export interface LiveRace {
  id: string;
  level: LiveLevel;
  num: string;
  name: string | null;
  state: LiveRaceState;
  progress: LiveProgress | null;
  candidates: LiveCandidate[];
  projection: LiveProjection | null;
  /** The machine reason a check withheld the projection; never shown to readers. */
  withdrawal: { reason: string } | null;
  /** Why the race has no figures; never shown to readers. */
  fault: { reason: "row_unreadable" | "race_missing" } | null;
  /** Mayor only; absent on every other race. */
  wards?: LiveMayoralWard[];
}

export interface LivePayload {
  schema_version: 1;
  model_version: string;
  forecast_release_tag: string | null;
  seq: { all_office: number; ward_by_ward: number };
  election_desc: string | null;
  rehearsal: boolean;
  state: LivePayloadState;
  levels: {
    mayor: { projection: ProjectionStatus; variant: ProjectionStatus };
    council: { projection: ProjectionStatus };
    trustee: { projection: ProjectionStatus };
    french_trustee: { projection: ProjectionStatus };
  };
  races: LiveRace[];
}

/** What `/live/results.json` serves: the stored payload unchanged, plus the newer
 *  pipeline heartbeat (epoch ms) for the staleness banner. */
export interface LiveResults {
  heartbeat: number;
  payload: LivePayload;
}
