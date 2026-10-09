import { RESULTS_WARDS } from "@/lib/ward-ballot";
import type { CouncilRaceCardsFeed } from "@/types/feeds";

export interface ResultsWard {
  num: string;
  /** The ward's name from the Council feed; empty when the feed lacks it. */
  name: string;
}

/** Every City ward with its name from the Council feed, for the picker and tiles. */
export function resultsWards(council: CouncilRaceCardsFeed): ResultsWard[] {
  return RESULTS_WARDS.map((num) => ({ num, name: council.wards[num]?.ward_name?.trim() ?? "" }));
}

/** "Ward 14 Toronto-Danforth", or "Ward 14" when the name is missing. */
export function wardLabel(ward: ResultsWard): string {
  return ward.name ? `Ward ${ward.num} ${ward.name}` : `Ward ${ward.num}`;
}
