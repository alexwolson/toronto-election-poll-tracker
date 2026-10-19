/**
 * Turnout on the results pages (Alex, 2026-10-19), built by `scripts/turnout/build.py`: the advance
 * vote before 8 p.m., and once a ward (or the city) has every voting area in, its votes for mayor
 * as a share of the voters' list before election day, beside 2022 and 2023 measured the same way.
 * Never during the count, and never projected. The City's official turnout also counts declined
 * and rejected ballots and election-day additions to the list, so it differs a little.
 */

import data from "@/data/turnout.json";

interface Area {
  electors_2026: number;
  /** Percent, 2 dp. */
  share_2022: number;
  share_2023: number;
}

export const TURNOUT: {
  advance_voters: Record<"2026" | "2022" | "2023", number>;
  city: Area;
  wards: Record<string, Area>;
} = data;

const pct = (x: number) => `${x.toFixed(1)}%`;
const count = (n: number) => n.toLocaleString("en-CA");

export function advanceLine(): string {
  const a = TURNOUT.advance_voters;
  return `Advance voters: ${count(a["2026"])}, up from ${count(a["2022"])} in 2022 and ${count(a["2023"])} in 2023.`;
}

/** "Votes for mayor in Ward 9: 41.3% of the voters’ list (2022: 33.1%, 2023: 48.5%)", or the city's. */
export function turnoutLine(votes: number, ward: string | null): string | null {
  const area = ward === null ? TURNOUT.city : TURNOUT.wards[ward];
  if (!area || area.electors_2026 <= 0) return null;
  const where = ward === null ? "" : ` in Ward ${ward}`;
  return `Votes for mayor${where}: ${pct((100 * votes) / area.electors_2026)} of the voters’ list (2022: ${pct(area.share_2022)}, 2023: ${pct(area.share_2023)})`;
}

/** What the line measures, for its tooltip and the How it works page. */
export const TURNOUT_NOTE =
  "Valid votes for mayor over the voters’ list before election day, measured the same way for each year. The City’s official turnout also counts declined and rejected ballots and election-day additions to the list.";
