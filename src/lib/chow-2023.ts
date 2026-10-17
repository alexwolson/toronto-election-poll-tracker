/**
 * Chow's 2023 benchmark for the results page (live-projection #108): her share of each City
 * ward's vote in the certified 2023 by-election, all voting channels, beside her live share
 * there. Early returns from her weakest 2023 wards can read like an upset; the benchmark shows
 * which wards those are. Facts of two counts, never a projection. Built by
 * `scripts/chow-2023/build.py`; she is found by candidacy id, never by name.
 */

import data from "@/data/chow-2023.json";
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
  citywide: Result2023;
  wards: Record<string, Result2023>;
} = data;

export function chowCandidate(race: LiveRace | null): LiveCandidate | null {
  return race?.candidates.find((c) => c.candidacy_id === CHOW_2023.candidacy_id) ?? null;
}

/** Her live share of the ward's counted mayoral votes (null until one is counted) and her
 *  2023 share there; null when she isn't in the race or the ward has no 2023 figure. */
export function chowWard(
  race: LiveRace | null,
  ward: LiveMayoralWard,
): { live: number | null; share2023: number } | null {
  const chow = chowCandidate(race);
  const then = CHOW_2023.wards[ward.num];
  if (!chow || !then) return null;
  const total = Object.values(ward.votes ?? {}).reduce((a, b) => a + b, 0);
  const live = total > 0 ? (100 * (ward.votes?.[chow.key] ?? 0)) / total : null;
  return { live, share2023: then.share };
}
