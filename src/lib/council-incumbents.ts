/**
 * Each 2026 council incumbent's share in their ward's last election (Alex, 2026-10-19): the 2022
 * general election, or a by-election since. Built by `scripts/council-incumbents/build.py` from
 * the canonical results; an incumbent running in another ward than the one they won has none.
 * Found by 2026 candidacy id, never by name. Facts of a past count, never a projection.
 */

import data from "@/data/council-incumbents.json";
import type { LiveCandidate, LiveRace } from "@/types/live";

interface Entry {
  ward: string;
  /** Percent, 2 dp. */
  share: number;
  year: number;
  by_election: boolean;
}

const INCUMBENTS = data.incumbents as Record<string, Entry>;

export interface LastElection {
  share: number;
  /** "in 2022" or "in the 2024 by-election". */
  when: string;
}

/** The ward a 2026 candidacy holds as its sitting councillor, if any. */
export function incumbentWard(candidacyId: string | null): string | null {
  return (candidacyId && INCUMBENTS[candidacyId]?.ward) || null;
}

export function lastElection(race: LiveRace, candidate: LiveCandidate): LastElection | null {
  if (race.level !== "council" || !candidate.candidacy_id) return null;
  const entry = INCUMBENTS[candidate.candidacy_id];
  if (!entry || entry.ward !== race.num) return null;
  return { share: entry.share, when: entry.by_election ? `in the ${entry.year} by-election` : `in ${entry.year}` };
}
