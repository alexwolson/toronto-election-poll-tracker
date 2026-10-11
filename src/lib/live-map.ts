/**
 * What the results Map shows for a ward or a race (live-projection #103): how much is
 * reported, who leads and by how much, and, on council and trustee races, whether a
 * running incumbent leads. Facts of the count, never calls: a lead is the count so far.
 * Incumbency comes from the Backend's candidacy ids; the page never matches names.
 */

import type { LiveMayoralWard, LiveProgress, LiveRace } from "@/types/live";

/** Received over total, capped at whole (the City can publish more received than total). */
export function reportedFraction(progress: LiveProgress | null): number | null {
  if (progress === null || progress.total <= 0) return null;
  return Math.min(1, progress.received / progress.total);
}

export type ReportingTier = "none" | "some" | "half" | "most" | "all";

export function reportingTier(fraction: number | null): ReportingTier {
  if (fraction === null || fraction <= 0) return "none";
  if (fraction >= 1) return "all";
  if (fraction >= 0.9) return "most";
  return fraction >= 0.5 ? "half" : "some";
}

export interface Lead {
  /** Share of polls reported, 0..1, or null when unknown. */
  reported: number | null;
  /** Votes counted for the candidates. */
  counted: number;
  /** Null until a vote is counted. */
  leader: string | null;
  runnerUp: string | null;
  /** Percent of the candidates' votes. */
  leaderShare: number | null;
  /** The leader's lead over the runner-up, in points. */
  margin: number | null;
  tied: boolean;
}

function leadOf(votes: [string, number][], reported: number | null): Lead {
  const ranked = [...votes].sort((a, b) => b[1] - a[1]);
  const counted = ranked.reduce((sum, [, v]) => sum + v, 0);
  if (counted === 0) {
    return { reported, counted, leader: null, runnerUp: null, leaderShare: null, margin: null, tied: false };
  }
  const [first, second] = ranked;
  const share = (v: number) => (100 * v) / counted;
  return {
    reported,
    counted,
    leader: first[0],
    runnerUp: second?.[0] ?? null,
    leaderShare: share(first[1]),
    margin: share(first[1]) - share(second?.[1] ?? 0),
    tied: second !== undefined && second[1] === first[1],
  };
}

export function raceLead(race: LiveRace): Lead {
  const votes = race.candidates.flatMap((c): [string, number][] => (c.votes === null ? [] : [[c.key, c.votes]]));
  return leadOf(votes, reportedFraction(race.progress));
}

export function mayorWardLead(ward: LiveMayoralWard): Lead {
  return leadOf(Object.entries(ward.votes ?? {}), reportedFraction(ward.progress));
}

export type LeadTier = "narrow" | "clear" | "wide";

/** Under 5 points, 5 to 15, and 15 or more. */
export function leadTier(margin: number): LeadTier {
  if (margin < 5) return "narrow";
  return margin < 15 ? "clear" : "wide";
}

export type IncumbentStatus =
  | "incumbent_leading"
  | "incumbent_trailing"
  | "tied"
  | "open_seat"
  | "not_known"
  | "no_results";

/**
 * Whether a running incumbent leads the race. `incumbents` are the candidacy ids of the
 * incumbents running: empty for an open seat, null when the Backend doesn't say.
 */
export function incumbentStatus(race: LiveRace, incumbents: readonly string[] | null): IncumbentStatus {
  const lead = raceLead(race);
  if (lead.leader === null) return "no_results";
  if (incumbents === null) return "not_known";
  if (incumbents.length === 0) return "open_seat";
  if (lead.tied) return "tied";
  const leader = race.candidates.find((c) => c.key === lead.leader);
  return leader?.candidacy_id && incumbents.includes(leader.candidacy_id) ? "incumbent_leading" : "incumbent_trailing";
}
