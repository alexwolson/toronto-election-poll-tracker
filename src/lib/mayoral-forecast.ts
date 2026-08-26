/**
 * Pure selectors over the mayoral forecast feed (spec §Hero, §Withheld).
 *
 * The publication rules are baked in here so the UI never has to reason about
 * them: only `Forecast Available` quantities are ever returned (withheld ones
 * are hidden, Q11), and we surface the band + frequency phrase, never a raw
 * probability number (ADR 0006).
 */

import { candidateName } from "@/lib/candidates";
import type { ForecastQuantityCard, MayoralForecastFeed } from "@/types/feeds";

export function isPublished(card: ForecastQuantityCard): boolean {
  return card.availability === "Forecast Available" && card.band !== null;
}

/**
 * Render a published frequency band as a sentence unit: "about 4 in 5" →
 * "about 4 times in 5", "less than 1 in 10" → "less than 1 time in 10"
 * (singular for a count of one). The ADR 0006 band vocabulary stays canonical
 * in the feed; this is display wording only, applied to every frequency line.
 * Statements without the "N in M" shape (including the empty withheld case)
 * pass through unchanged.
 */
export function frequencyWithUnit(statement: string): string {
  return statement.replace(
    /(\d+) in (\d+)/,
    (_match, count: string, denominator: string) =>
      `${count} time${count === "1" ? "" : "s"} in ${denominator}`,
  );
}

export interface CandidateWin {
  candidateId: string;
  name: string;
  band: string;
  frequencyStatement: string;
  /** kept for ordering only; never rendered */
  probability: number;
}

function toCandidateWin(
  candidateId: string,
  card: ForecastQuantityCard,
): CandidateWin | null {
  if (!isPublished(card)) return null;
  return {
    candidateId,
    name: candidateName(candidateId),
    band: card.band!,
    frequencyStatement: frequencyWithUnit(card.frequency_statement ?? ""),
    probability: card.probability ?? 0,
  };
}

/** Published candidate wins, favourite first. Withheld candidates are omitted. */
export function publishedCandidateWins(feed: MayoralForecastFeed): CandidateWin[] {
  return Object.entries(feed.candidate_win)
    .map(([id, card]) => toCandidateWin(id, card))
    .filter((win): win is CandidateWin => win !== null)
    .sort((a, b) => b.probability - a.probability);
}

/** The favourite, or null when nothing publishes. */
export function leadForecast(feed: MayoralForecastFeed): CandidateWin | null {
  return publishedCandidateWins(feed)[0] ?? null;
}

export interface AgnosticQuantity {
  key: "close_result";
  label: string;
  frequencyStatement: string;
}

/** Published candidate-agnostic quantities — Close-Result is the only one, and it
 *  stays outside every candidate card. Withheld → omitted (so the section can be
 *  dropped entirely when nothing agnostic publishes). */
export function agnosticQuantities(feed: MayoralForecastFeed): AgnosticQuantity[] {
  if (!isPublished(feed.close_result)) return [];
  return [
    {
      key: "close_result",
      label: "Chance of a close result",
      frequencyStatement: frequencyWithUnit(feed.close_result.frequency_statement ?? ""),
    },
  ];
}

export interface HistoricalMargin {
  year: number;
  label: string;
  /** winner v. runner-up, by surname, e.g. "Chow v. Bailão" */
  matchup: string;
  /** winning margin in percentage points (winner minus runner-up share × 100) */
  marginPp: number;
}

/** Past Toronto mayoral results — the winner-minus-runner-up margin and matchup,
 *  from the canonical all-offices dataset (top-two share gap × 100). Seven races:
 *  the six general elections plus the 2023 by-election. These are fixed
 *  historical facts (not forecast output), so they live here as a constant and
 *  become the reference scale for the margin-distribution panel. */
export const HISTORICAL_MAYORAL_MARGINS: HistoricalMargin[] = [
  { year: 2003, label: "2003", matchup: "Miller vs. Tory", marginPp: 5.2 },
  { year: 2006, label: "2006", matchup: "Miller vs. Pitfield", marginPp: 24.6 },
  { year: 2010, label: "2010", matchup: "Ford vs. Smitherman", marginPp: 11.5 },
  { year: 2014, label: "2014", matchup: "Tory vs. Ford", marginPp: 6.5 },
  { year: 2018, label: "2018", matchup: "Tory vs. Keesmaat", marginPp: 39.9 },
  { year: 2022, label: "2022", matchup: "Tory vs. Penalosa", marginPp: 44.1 },
  { year: 2023, label: "2023", matchup: "Chow vs. Bailão", marginPp: 4.7 },
];

/** One named margin band on the strip. `weight` is an ORDINAL cue only — the
 *  share of forecast mass in [loPp, hiPp), normalized so the likeliest band is 1
 *  — used to shade the band darker/lighter. It re-presents the ordering the
 *  (already-gated) density curve shows; it is never rendered as a number. */
export interface MarginBand {
  name: string;
  loPp: number;
  hiPp: number;
  weight: number;
}

/** Editorial band names and their upper cuts in points. The Close/Clear-win
 *  boundary is NOT here — it is the model's own close threshold, read from the
 *  feed — so the Close band always matches the published "close" definition.
 *  The 15/30/50-pt cuts are editorial. */
const BAND_NAMES = ["Close", "Clear win", "Comfortable", "Landslide"] as const;
const BAND_UPPER_CUTS_PP = [15, 30, 50] as const;

/** Trapezoidal mass of the density (points carried in pp) over [lo, hi), summing
 *  only the clipped overlap of each segment so partial bands and bands past the
 *  data both integrate correctly. Units are immaterial: the result is normalized
 *  across bands, so only the ratios matter. */
function densityMass(
  points: { pp: number; density: number }[],
  lo: number,
  hi: number,
): number {
  let mass = 0;
  for (let i = 1; i < points.length; i++) {
    const x0 = points[i - 1].pp;
    const x1 = points[i].pp;
    const a = Math.max(x0, lo);
    const b = Math.min(x1, hi);
    if (b <= a || x1 === x0) continue;
    const at = (x: number) =>
      points[i - 1].density +
      ((x - x0) / (x1 - x0)) * (points[i].density - points[i - 1].density);
    mass += ((at(a) + at(b)) / 2) * (b - a);
  }
  return mass;
}

export interface MarginDistributionView {
  /** density curve points, x carried in percentage points */
  points: { pp: number; density: number }[];
  /** the "close" cutoff in percentage points (e.g. 5) */
  closeThresholdPp: number;
  /** the four named margin bands, ascending, each with an ordinal shade weight */
  bands: MarginBand[];
  /** past elections to mark, ascending by margin (the reference scale) */
  markers: HistoricalMargin[];
}

/** The published winning-margin distribution as a chart-ready view, or null when
 *  the feed withholds it. Gate-linked twice over: the feed only sends the shape
 *  when close_result publishes, and we re-check that gate here so the panel can
 *  never outlive the summary it derives from (ADR 0006 / 0032). */
export function marginDistribution(
  feed: MayoralForecastFeed,
): MarginDistributionView | null {
  const dist = feed.margin_distribution;
  if (!dist || !isPublished(feed.close_result)) return null;
  if (dist.x.length === 0 || dist.x.length !== dist.density.length) return null;

  const points = dist.x.map((x, i) => ({ pp: x * 100, density: dist.density[i] }));
  const closeThresholdPp = dist.close_threshold * 100;

  // Band boundaries: Close ends at the model's close threshold; then editorial cuts.
  const cuts = [0, closeThresholdPp, ...BAND_UPPER_CUTS_PP];
  const rawMass = BAND_NAMES.map((_, i) => densityMass(points, cuts[i], cuts[i + 1]));
  const maxMass = Math.max(...rawMass, Number.EPSILON);
  const bands = BAND_NAMES.map((name, i) => ({
    name,
    loPp: cuts[i],
    hiPp: cuts[i + 1],
    weight: rawMass[i] / maxMass,
  }));

  return {
    points,
    closeThresholdPp,
    bands,
    markers: [...HISTORICAL_MAYORAL_MARGINS].sort((a, b) => a.marginPp - b.marginPp),
  };
}

export interface IncumbentDefeat {
  candidateId: string;
  name: string;
  label: string;
  frequencyStatement: string;
}

/** The incumbent's published defeat chance, tied to the incumbent the feed
 *  identifies (name resolved from that id, never hardcoded). Null when the race
 *  is open or the quantity is withheld — so it is omitted everywhere then. */
export function incumbentDefeat(feed: MayoralForecastFeed): IncumbentDefeat | null {
  const id = feed.incumbent_candidate_id;
  if (!id || !isPublished(feed.incumbent_defeat)) return null;
  const name = candidateName(id);
  return {
    candidateId: id,
    name,
    label: `Chance ${name} loses to any candidate`,
    frequencyStatement: frequencyWithUnit(feed.incumbent_defeat.frequency_statement ?? ""),
  };
}

/** The current viable field — the candidate_win keys (includes the incumbent). */
export function viableField(feed: MayoralForecastFeed): string[] {
  return Object.keys(feed.candidate_win);
}

/** Plain-language basis line for the tier (spec §Q12: no "M3" codes surfaced). */
export function evidenceBasisLine(tierLabel: string): string {
  const code = tierLabel.split("—")[0]?.trim().toUpperCase();
  switch (code) {
    case "M3":
      return "Based on repeated final-ballot polling of the confirmed field.";
    case "M2":
      return "Based on final-ballot polling of the confirmed field.";
    case "M1":
      return "Based on early polling, before the ballot was final.";
    case "M0":
      return "Based on the historical record only — no current polling yet.";
    default:
      return "Based on the available polling evidence.";
  }
}
