/**
 * Certain win (live-projection #105): the final share at which a candidate has won whatever
 * happens to the votes still to be counted. With R still out and the strongest rival on v_j,
 * candidate i is certain once v_i + x > v_j + (R − x): a final share of (v_i + v_j + R) / 2T,
 * which on the Possible Ranges' shared denominator is (i's low + the rival's high) / 2.
 * Arithmetic on the count, not a chance. Pure: safe for the browser and tests.
 */

import type { LiveRange } from "@/types/live";

/** Each contender's certain-win share, in percent. None for the eliminated, and none at all
 *  once a single contender is left: that line would call the winner before Night Close (#51). */
export function certainWinShares(
  possible: Record<string, LiveRange> | null,
  eliminated: Set<string>,
): Record<string, number> {
  if (!possible) return {};
  const contenders = Object.keys(possible).filter((key) => !eliminated.has(key));
  if (contenders.length < 2) return {};
  return Object.fromEntries(
    contenders.map((key) => {
      const own = possible[key];
      const rivalHigh = Math.max(...Object.entries(possible).filter(([k]) => k !== key).map(([, r]) => r.high));
      // Clamped to the candidate's own range: the payload's 2-decimal rounding can tip it past an end.
      const share = Math.min(Math.max((own.low + rivalHigh) / 2, own.low), own.high);
      return [key, Math.round(share * 100) / 100];
    }),
  );
}
