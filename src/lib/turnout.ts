/**
 * Turnout figures for the voters' list bar (Alex, 2026-10-19), built by `scripts/turnout/build.py`:
 * each ward's and the city's 2026 voters' list before election day, the 2026 advance vote, and
 * 2022's and 2023's votes for mayor as a share of their own lists, measured the same way. The
 * City's official turnout also counts declined and rejected ballots and election-day additions to
 * the list, so it differs a little.
 */

import data from "@/data/turnout.json";

interface Area {
  electors_2026: number;
  /** Percent, 2 dp. */
  share_2022: number;
  share_2023: number;
  /** Votes for councillor in 2022 over the ward's list; null for Ward 23 (see build.py). */
  council_share_2022?: number | null;
}

export const TURNOUT: {
  advance_voters: Record<"2026" | "2022" | "2023", number>;
  city: Area;
  wards: Record<string, Area>;
} = data;

/** What the voters' list bar measures, shown under it. */
export const TURNOUT_NOTE =
  "Valid votes for mayor over the voters’ list before election day, measured the same way for each year. The City’s official turnout also counts declined and rejected ballots and election-day additions to the list.";
