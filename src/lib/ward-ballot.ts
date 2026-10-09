/**
 * The Ward Ballot (#17 § Results pages and site changes; #13): the races on one
 * City ward's ballot. The City ward alone fixes it, because each City ward lies
 * in exactly one area on each board, per the trustee feed's `city_wards`.
 */

import { TRUSTEE_BOARD_NAV } from "@/lib/trustees";
import type { TrusteeRaceCardsFeed } from "@/types/feeds";

/** The 25 City wards, as `/results/1/` to `/results/25/` spell them. */
export const RESULTS_WARDS: readonly string[] = Array.from({ length: 25 }, (_, i) => String(i + 1));

export function isResultsWard(value: string): boolean {
  return RESULTS_WARDS.includes(value);
}

/** Payload race ids on the ward's ballot: its councillor, then each board's area
 *  in the site's board order (TDSB, TCDSB, Viamonde, MonAvenir). */
export function wardBallotRaceIds(ward: string, trustees: TrusteeRaceCardsFeed): string[] {
  const cityWard = Number(ward);
  const trusteeIds = TRUSTEE_BOARD_NAV.flatMap(({ boardId }) => {
    const board = trustees.boards.find((b) => b.board_id === boardId);
    const area = board?.wards.find((w) => w.city_wards.includes(cityWard));
    return area ? [`${boardId}-${area.ward_id}`] : [];
  });
  return [`councillor-${ward}`, ...trusteeIds];
}
