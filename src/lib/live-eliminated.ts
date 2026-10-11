/**
 * Mathematically Eliminated (#90, live-projection ADR 0003): a candidate who cannot win even
 * with every outstanding vote. A race's Possible Ranges share one denominator, so that is their
 * possible high below another candidate's possible low.
 *
 * Pure: safe for the browser and tests.
 */

import type { LiveRange } from "@/types/live";

/** The payload rounds each bound to 2 decimals, so a gap must exceed 0.01 pt to be certain. */
const MIN_GAP_HUNDREDTHS = 1;

/** The candidate keys eliminated in a race's Possible Ranges; none without them. */
export function eliminatedKeys(possible: Record<string, LiveRange> | null): Set<string> {
  if (!possible) return new Set();
  // Whole hundredths, so float error cannot tip a gap at the rounding margin.
  const hundredths = (value: number) => Math.round(value * 100);
  const lows = Object.values(possible).map((range) => hundredths(range.low));
  const topLow = Math.max(...lows);
  return new Set(
    Object.entries(possible)
      .filter(([, range]) => topLow - hundredths(range.high) > MIN_GAP_HUNDREDTHS)
      .map(([key]) => key),
  );
}
