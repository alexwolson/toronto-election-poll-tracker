/**
 * Chow's 2023 benchmark for the results page (live-projection #108): her share of each City
 * ward's vote in the certified 2023 by-election, all voting channels, beside her live share
 * there. Early returns from her weakest 2023 wards can read like an upset; the benchmark shows
 * which wards those are. Facts of two counts, never a projection. Built by
 * `scripts/chow-2023/build.py`; she is found by candidacy id, never by name.
 */

import data from "@/data/chow-2023.json";
import { wardShare } from "@/lib/live-share";
import type { LiveCandidate, LiveMayoralWard, LiveRace } from "@/types/live";

interface Result2023 {
  votes: number;
  valid: number;
  /** Percent, 2 dp. */
  share: number;
}

export const CHOW_2023: {
  candidacy_id: string;
  source: string;
  source_url: string;
  licence: string;
  /** Candidates on the 2023 ballot, Chow included. */
  candidates: number;
  citywide: Result2023;
  wards: Record<string, Result2023>;
} = data;

export function chowCandidate(race: LiveRace | null): LiveCandidate | null {
  return race?.candidates.find((c) => c.candidacy_id === CHOW_2023.candidacy_id) ?? null;
}

export interface ChowWard {
  /** Her percent of the ward's counted mayoral votes; null until one is counted. */
  live: number | null;
  share2023: number;
}

/** Her live share in the ward beside her 2023 share there, which shows from before results;
 *  null only for a ward with no 2023 figure. */
export function chowWard(race: LiveRace | null, ward: Pick<LiveMayoralWard, "num" | "votes">): ChowWard | null {
  const ward2023 = CHOW_2023.wards[ward.num];
  if (!ward2023) return null;
  const chow = chowCandidate(race);
  return { live: chow ? wardShare(ward.votes, chow.key) : null, share2023: ward2023.share };
}

/** Chow's 2023 share across the wards counted so far, each weighted by its 2026 votes counted,
 *  beside her 2023 citywide share (#109): how much the wards in flatter or understate her.
 *  It allows for which wards are in, not which voting areas within them, and is never an
 *  estimate of the citywide result. Null unless the race is counting with votes counted. */
export function countedWardsBenchmark(race: LiveRace): { counted2023: number; citywide2023: number } | null {
  if (race.state !== "counting") return null;
  let weight = 0;
  let sum = 0;
  for (const ward of race.wards ?? []) {
    const ward2023 = CHOW_2023.wards[ward.num];
    const counted = Object.values(ward.votes ?? {}).reduce((a, b) => a + b, 0);
    if (!ward2023 || counted <= 0) continue;
    weight += counted;
    sum += counted * ward2023.share;
  }
  return weight > 0 ? { counted2023: sum / weight, citywide2023: CHOW_2023.citywide.share } : null;
}
