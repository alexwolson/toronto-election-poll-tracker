/**
 * A race's result as the reader sees it, apart from any one page's layout: the fixed reader wording
 * (#17 § On-night reader wording), which band to draw, when a level shows the count only, the one
 * winner wording at Night Close, and the mayor's record (ADR 0002). Shared by every results page.
 */

import { eliminatedKeys } from "@/lib/live-eliminated";
import { TRUSTEE_BOARD_NAV } from "@/lib/trustees";
import type { LiveBand, LivePayload, LiveRace, ProjectionStatus } from "@/types/live";

export type Levels = LivePayload["levels"];

/** The race states' fixed reader wording (#17 § On-night reader wording). */
export const WORDING = {
  citywide: "Citywide",
  acclaimed: "Acclaimed",
  acclaimedNote: "No vote is held with only one candidate.",
  before_results: "Results from 8 p.m.",
  no_units_in: "No voting areas have reported yet",
  all_units_in: "All voting areas in",
  no_progress: "Voting areas: not available",
  withdrawn: "No projection for this race right now.",
  elected: "Elected (unofficial)",
  /** Cannot win even with every outstanding vote (#90, live-projection ADR 0003), as one
   *  break above those candidates (#105). */
  eliminated: "Mathematically eliminated",
  eliminatedWhy: "can’t win even with every vote still out",
  /** The results tables' one heading over the eliminated group (Alex, 2026-10-24). */
  eliminatedBelow: "Candidates below are mathematically eliminated",
  /** The tally's key (#105). */
  keyCounted: "Share of the votes counted so far",
  /** The key carries the ranges' definitions, once per card (results audit, 2026-10-20). */
  keyEstimated: "Estimated final range: where 99 in 100 simulated finishes land",
  keyPossible: "Can’t be reached with the votes left to count",
} as const;

/** Each level's name in the gate wording (#17 § On-night reader wording, DRAFT for #54). */
const LEVEL_WORDS: Record<"mayor" | "council" | "trustee", string> = {
  mayor: "the mayor's race",
  council: "council races",
  trustee: "school board trustee races",
};

/** The ranges' legends, the mayor's record (ADR 0002) and the French-language boards' note,
 *  as Alex approved them (#54, #97). */
export const RANGE_WORDING = {
  mayorRecord:
    "In replays of past election nights, this estimate did very well in the 2014, 2018 and 2022 elections, and worse than expected in the 2023 by-election, when the early vote broke very differently from election day.",
  recordSummary: "How accurate is this estimate?",
  french: "Count and possible range only: no estimate for these boards.",
  frenchLabel: "French-language school boards",
} as const;

/** Whether a level shows the count in place of its projection: its gate failed, or the
 *  projection is paused (a version mismatch, a missing Gate Result, or a switch, #49). */
export function showsCountOnly(status: ProjectionStatus | null): boolean {
  return (
    status === "gate_failed" ||
    status === "version_mismatch" ||
    status === "gate_missing" ||
    status === "switched_off"
  );
}

export function gateNote(level: "mayor" | "council" | "trustee", status: ProjectionStatus): string | null {
  if (!showsCountOnly(status)) return null;
  const words = LEVEL_WORDS[level];
  if (status === "gate_failed") {
    return `No projection for ${words} tonight. In replays of past election nights it did not beat simply reading the count, so this page shows the count only.`;
  }
  return `Projection paused for ${words}. The count below is as the City reports it.`;
}

/** A level's projection status from the payload, or null when there is no payload level. */
export function levelStatus(levels: Levels | null, level: LiveRace["level"]): ProjectionStatus | null {
  if (!levels || level === "french_trustee") return null;
  return levels[level].projection;
}

/** Whether a counting race shows its count only, its level's projection off (#17 § On-night
 *  reader wording). */
export function countOnly(race: LiveRace, levels: Levels | null): boolean {
  return showsCountOnly(levelStatus(levels, race.level));
}

/** Why a counting race shows no Estimated Range, if a gate or a Withdrawal says so; the
 *  Withdrawal's machine reason readers never see (#43). */
export function rangeNote(race: LiveRace, levels: Levels | null): string | null {
  if (race.state !== "counting") return null;
  const level = race.level === "french_trustee" ? null : race.level;
  const status = level ? levelStatus(levels, level) : null;
  return (level && status ? gateNote(level, status) : null) ?? (race.withdrawal ? WORDING.withdrawn : null);
}

/** Every voting area in (Alex, 2026-10-24): the race reads as complete until the City's data
 *  says otherwise. Not a call: "Elected (unofficial)" still waits for Night Close. */
export function isComplete(race: LiveRace): boolean {
  return race.state === "all_units_in";
}

/** Who can't win: once every area is in, everyone but the leader (no one on a tie at the top);
 *  while counting, whoever the Possible Range rules out (#90). */
export function eliminatedOf(race: LiveRace): Set<string> {
  if (!isComplete(race)) return eliminatedKeys(race.possible);
  const [a, b] = [...race.candidates].sort((x, y) => (y.votes ?? -1) - (x.votes ?? -1));
  if (!a || a.votes === null || (b && (b.votes === null || b.votes >= a.votes))) return new Set();
  return new Set(race.candidates.filter((c) => c.key !== a.key).map((c) => c.key));
}

/** "1,203 more votes", for a complete race's one sentence. */
export const moreVotes = (n: number) => `${n.toLocaleString("en-CA")} more ${n === 1 ? "vote" : "votes"}`;

/** The race's Estimated Range per candidate: the band the payload says to draw, if any. */
export function estimated(race: LiveRace): Record<string, LiveBand> | null {
  const shown = race.projection?.shown;
  return shown ? (race.projection!.bands[shown] ?? null) : null;
}

export function raceTitle(race: LiveRace): string {
  if (race.level === "mayor") return "Mayor";
  if (race.level === "council") return race.name ? `Councillor, Ward ${race.num} ${race.name}` : `Councillor, Ward ${race.num}`;
  const board = TRUSTEE_BOARD_NAV.find(({ boardId }) => race.id.startsWith(`${boardId}-`));
  return `${board?.shortName ?? "Trustee"} Ward ${race.num}`;
}

/** The one winner wording (#17): at Night Close only, in a race with every voting area in,
 *  the leader's key, if they lead outright (#51). Candidates come by votes, descending. */
export function electedKey(race: LiveRace, closed: boolean): string | null {
  if (!closed || race.state !== "all_units_in") return null;
  const [first, second] = race.candidates;
  if (!first || first.votes === null) return null;
  if (second && (second.votes === null || second.votes >= first.votes)) return null;
  return first.key;
}

/** An acclaimed race (#117): `acclaimed` once results begin, and before them a race whose bundle
 *  lists one candidate, which the payload marks `before_results` like every race (docs/payload.md). */
export function isAcclaimed(race: LiveRace): boolean {
  return race.state === "acclaimed" || (race.state === "before_results" && race.candidates.length === 1);
}

/** Before 8 p.m. or before the race's first voting area: its tally waits, empty (#115). */
export function waiting(race: LiveRace): boolean {
  return race.state === "before_results" || race.state === "no_units_in";
}

/** The mayor's record while its Estimated Range is on screen (ADR 0002, #54): it describes the
 *  estimate, so it shows only beside one. */
export function hasRecord(race: LiveRace, levels: Levels | null): boolean {
  return race.state === "counting" && race.level === "mayor" && levels?.mayor.approved === true && estimated(race) !== null;
}
