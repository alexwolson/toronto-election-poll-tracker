/**
 * Chow's 2023 benchmark for the results page (live-projection #108): her share of each City
 * ward's vote in the certified 2023 by-election, all voting channels, beside her live share
 * there. Early returns from her weakest 2023 wards can read like an upset; the benchmark shows
 * which wards those are. Facts of two counts, never a projection. Built by
 * `scripts/chow-2023/build.py`; she is found by candidacy id, never by name.
 */

import data from "@/data/chow-2023.json";
import { votesTotal, wardShare } from "@/lib/live-share";
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

/** For each counted ward, Chow's change there since 2023 less her change across all the wards
 *  counted (#110): the ward's lean now against its lean in 2023, in points. Never a raw
 *  2026-minus-2023 difference, which a citywide shift would push one way everywhere; weighed by
 *  votes counted, each weighted by its votes counted, the figures average to zero. Keyed by
 *  ward number; a ward with no votes counted is absent. */
export function chowVs2023(race: LiveRace | null): Record<string, number> {
  const chow = chowCandidate(race);
  const counted: { num: string; total: number; live: number; share2023: number }[] = [];
  for (const ward of race?.wards ?? []) {
    const ward2023 = CHOW_2023.wards[ward.num];
    const total = votesTotal(ward.votes);
    if (!chow || !ward2023 || total <= 0) continue;
    counted.push({ num: ward.num, total, live: wardShare(ward.votes, chow.key)!, share2023: ward2023.share });
  }
  const weight = counted.reduce((a, w) => a + w.total, 0);
  const shift = counted.reduce((a, w) => a + w.total * (w.live - w.share2023), 0) / weight;
  return Object.fromEntries(counted.map((w) => [w.num, w.live - w.share2023 - shift]));
}
