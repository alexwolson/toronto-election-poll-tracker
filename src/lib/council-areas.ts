/**
 * The mayoral Live Tally by part of the city (live-projection #127): the 25 wards grouped into
 * the four community council areas, summed from the mayor's ward rows. Facts of the count only.
 */

import type { LiveProgress, LiveRace } from "@/types/live";
import { votesTotal } from "./live-share";

/** The City's Community Council Area Profiles page, "Wards" column (checked 2026-10-20):
 *  https://www.toronto.ca/city-government/data-research-maps/neighbourhoods-communities/community-council-area-profiles/ */
export const COUNCIL_AREAS: readonly { name: string; wards: readonly string[] }[] = [
  { name: "Etobicoke York", wards: ["1", "2", "3", "5", "7"] },
  { name: "North York", wards: ["6", "8", "15", "16", "17", "18"] },
  { name: "Toronto and East York", wards: ["4", "9", "10", "11", "12", "13", "14", "19"] },
  { name: "Scarborough", wards: ["20", "21", "22", "23", "24", "25"] },
];

export interface AreaTally {
  name: string;
  wards: readonly string[];
  /** The area's voting areas in, summed over its wards; null unless the City gives every ward's. */
  progress: LiveProgress | null;
  /** Candidate key → votes counted in the area. */
  votes: Record<string, number>;
  counted: number;
}

export function areaTallies(mayor: LiveRace | null): AreaTally[] {
  const rows = new Map((mayor?.wards ?? []).map((w) => [w.num, w]));
  return COUNCIL_AREAS.map(({ name, wards }) => {
    // A ward without progress leaves the area's unknown, rather than a total short by that ward.
    const reported = wards.map((num) => rows.get(num)?.progress ?? null);
    const progress = reported.every((p) => p !== null)
      ? { received: reported.reduce((a, p) => a + p.received, 0), total: reported.reduce((a, p) => a + p.total, 0) }
      : null;
    const votes: Record<string, number> = {};
    for (const num of wards) {
      for (const [key, n] of Object.entries(rows.get(num)?.votes ?? {})) votes[key] = (votes[key] ?? 0) + n;
    }
    return { name, wards, progress, votes, counted: votesTotal(votes) };
  });
}
