import { candidateMeta } from "./candidates";
import colours from "@/data/candidate-colours.json";

/**
 * Each candidate's colour on the results page: the forecast pages' colour for a forecast-named
 * candidate, else the campaign colour assigned per race in `candidate-colours.json` (best-effort,
 * drawn from the campaign's website and kept apart from the race's others), else the neutral.
 */
export type ColourTable = { races: Record<string, Record<string, string>> };

const NEUTRAL = "var(--color-disengaged)";

function flatten(table: ColourTable): Map<string, string> {
  return new Map(Object.values(table.races).flatMap((race) => Object.entries(race)));
}

const BY_CANDIDACY = flatten(colours as ColourTable);
const cache = new WeakMap<ColourTable, Map<string, string>>();

export function liveColour(
  candidate: { candidate_id: string | null; candidacy_id: string | null } | undefined,
  neutral: string = NEUTRAL,
  table?: ColourTable,
): string {
  if (!candidate) return neutral;
  if (candidate.candidate_id) {
    const meta = candidateMeta(candidate.candidate_id);
    if (meta.slug !== "disengaged") return meta.colorVar;
  }
  let lookup = BY_CANDIDACY;
  if (table) {
    lookup = cache.get(table) ?? flatten(table);
    cache.set(table, lookup);
  }
  return (candidate.candidacy_id && lookup.get(candidate.candidacy_id)) || neutral;
}

/** A `#rrggbb` colour in OKLab, for checking the table's colours stay apart. */
export function oklab(hex: string): [number, number, number] {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** A candidate's colour as large text: mixed towards the ink so even a light campaign colour
 *  reads at 3:1 or better on paper (Alex, 2026-10-21). Bars and swatches keep the pure colour. */
export function figureColour(colour: string): string {
  return `color-mix(in srgb, ${colour} 70%, var(--ink))`;
}
