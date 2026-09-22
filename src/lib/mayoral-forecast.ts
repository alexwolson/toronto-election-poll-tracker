/**
 * Pure selectors over the schema-4 mayoral forecast feed (ADR 0054, policy
 * margin-first-joint-draws-v1).
 *
 * Every public number is a summary of the same joint election-day draws; these
 * selectors only reshape the feed for the three views the approved presentation
 * renders (the leader margin, candidate vote ranges, full-race win chances).
 * Shares arrive as fractions and leave as percentage points; probabilities stay
 * fractions and are formatted once, by `chance`.
 */

import { candidateMeta, candidateName } from "@/lib/candidates";
import { formatDate } from "@/lib/format";
import type { MayoralForecastFeed, UncertaintyGap, UncertaintySourceKey } from "@/types/feeds";

/** Whole-percent chance with guarded tails: "<1%", "63%", ">99%". */
export function chance(value: number): string {
  if (value < 0.01) return "<1%";
  if (value > 0.99) return ">99%";
  return `${Math.round(value * 100)}%`;
}

export interface ForecastLead {
  candidateId: string;
  name: string;
}

/** The separately gated favourite (ADR 0051). */
export function leadForecast(feed: MayoralForecastFeed): ForecastLead | null {
  const favourite = feed.forecast_favourite;
  if (favourite.availability !== "Forecast Available" || !favourite.candidate_id) return null;
  return { candidateId: favourite.candidate_id, name: candidateName(favourite.candidate_id) };
}

/** The current viable field — the candidate_win keys (includes the incumbent). */
export function viableField(feed: MayoralForecastFeed): string[] {
  return Object.keys(feed.candidate_win);
}

/** True only when the favourite publishes and the election-day block is present. */
export function forecastAvailable(feed: MayoralForecastFeed): boolean {
  return leadForecast(feed) !== null && feed.election_day !== null;
}

function surnameOf(name: string): string {
  return name.trim().split(/\s+/).at(-1) ?? name;
}

export interface ShareRange {
  /** null for the residual pool */
  candidateId: string | null;
  name: string;
  slug: string;
  colorVar: string;
  hatch: boolean;
  /** percentage points */
  median: number;
  lower: number;
  upper: number;
  winProbability: number;
}

export interface ElectionDaySharesView {
  intervalMass: number;
  rows: ShareRange[];
}

/** Election-day full-ballot ranges: the named candidates in feed order, then the pool. */
export function electionDayShares(feed: MayoralForecastFeed): ElectionDaySharesView | null {
  const day = feed.election_day;
  if (!day) return null;
  const rows: ShareRange[] = day.candidates.map((c) => {
    const meta = candidateMeta(c.candidate_id);
    return {
      candidateId: c.candidate_id,
      name: meta.name,
      slug: meta.slug,
      colorVar: meta.colorVar,
      hatch: meta.hatch,
      median: c.median * 100,
      lower: c.lower * 100,
      upper: c.upper * 100,
      winProbability: c.win_probability,
    };
  });
  const pool = day.residual_pool;
  rows.push({
    candidateId: null,
    name: pool.label,
    slug: "residual",
    colorVar: "var(--color-disengaged)",
    hatch: false,
    median: pool.median * 100,
    lower: pool.lower * 100,
    upper: pool.upper * 100,
    winProbability: pool.win_probability,
  });
  return { intervalMass: day.interval_mass, rows };
}

export interface ComparedCandidate {
  candidateId: string;
  name: string;
  surname: string;
  colorVar: string;
}

function compared(id: string): ComparedCandidate {
  const meta = candidateMeta(id);
  return { candidateId: id, name: meta.name, surname: surnameOf(meta.name), colorVar: meta.colorVar };
}

export interface MarginOutcomeRow {
  key: "leader_ahead" | "close" | "challenger_ahead";
  label: string;
  probability: number;
  colorVar: string;
}

export interface MarginOutcomesView {
  thresholdPoints: number;
  leader: ComparedCandidate;
  challenger: ComparedCandidate;
  /** leader first, then the close band, then the challenger */
  rows: MarginOutcomeRow[];
  /** pairwise split counting every draw by who is ahead (from the feed) */
  leaderAhead: number;
  challengerAhead: number;
}

function points(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/** The published three-outcome view of the margin, labels built from the feed's pair. */
export function marginOutcomes(feed: MayoralForecastFeed): MarginOutcomesView | null {
  const margin = feed.election_day?.pairwise_margin;
  if (!margin) return null;
  const leader = compared(margin.leader_candidate_id);
  const challenger = compared(margin.challenger_candidate_id);
  const t = points(margin.outcomes.close_threshold_points);
  return {
    thresholdPoints: margin.outcomes.close_threshold_points,
    leader,
    challenger,
    rows: [
      {
        key: "leader_ahead",
        label: `${leader.surname} ahead by ${t} or more`,
        probability: margin.outcomes.leader_ahead,
        colorVar: leader.colorVar,
      },
      {
        key: "close",
        label: `Within ${t} points either way`,
        probability: margin.outcomes.close,
        colorVar: "var(--text-soft)",
      },
      {
        key: "challenger_ahead",
        label: `${challenger.surname} ahead by ${t} or more`,
        probability: margin.outcomes.challenger_ahead,
        colorVar: challenger.colorVar,
      },
    ],
    leaderAhead: 1 - margin.probability_challenger_ahead,
    challengerAhead: margin.probability_challenger_ahead,
  };
}

export interface UncertaintyRow {
  key: UncertaintySourceKey | "combined";
  label: string;
  /** vote-share points, signed: positive means the leader is ahead */
  lower: number;
  median: number;
  upper: number;
  leaderAhead: number;
  challengerAhead: number;
  /** all three sources together: the published forecast */
  combined: boolean;
}

export interface UncertaintyBreakdownView {
  leader: ComparedCandidate;
  challenger: ComparedCandidate;
  intervalMass: number;
  /** one shared axis in points, a multiple of 10 on each side, always containing the tie */
  axisMin: number;
  axisMax: number;
  /** each source on its own, then the combined row last */
  rows: UncertaintyRow[];
}

const UNCERTAINTY_LABELS: Record<UncertaintySourceKey, (electionDate: string) => string> = {
  polls_today: () => "The polls today could be off",
  campaign_movement: (electionDate) => `Support could shift before ${formatDate(electionDate)}`,
  election_day: () => "Results have landed away from final polls",
};

function gapRow(
  key: UncertaintyRow["key"],
  label: string,
  gap: UncertaintyGap,
  combined: boolean,
): UncertaintyRow {
  return {
    key,
    label,
    lower: gap.lower,
    median: gap.median,
    upper: gap.upper,
    leaderAhead: gap.probability_leader_ahead,
    challengerAhead: gap.probability_challenger_ahead,
    combined,
  };
}

/** Where the uncertainty comes from (ADR 0056); null when the feed does not carry the block. */
export function uncertaintyBreakdown(feed: MayoralForecastFeed): UncertaintyBreakdownView | null {
  const block = feed.uncertainty;
  if (!block || !feed.election_day) return null;
  const rows = [
    ...block.sources.map((source) =>
      gapRow(source.key, UNCERTAINTY_LABELS[source.key](feed.election_date), source, false),
    ),
    gapRow("combined", "All three together: the forecast", block.combined, true),
  ];
  const lowest = Math.min(0, ...rows.map((r) => r.lower));
  const highest = Math.max(0, ...rows.map((r) => r.upper));
  return {
    leader: compared(block.leader_candidate_id),
    challenger: compared(block.challenger_candidate_id),
    intervalMass: block.interval_mass,
    axisMin: Math.floor((lowest - 1) / 10) * 10,
    axisMax: Math.ceil((highest + 1) / 10) * 10,
    rows,
  };
}

function listNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/** Plain sentence for the pool: its size and any minor candidates polls reported. */
export function residualPoolNote(feed: MayoralForecastFeed): string {
  const pool = feed.election_day?.residual_pool;
  if (!pool) return "";
  const named = pool.named_in_polls.map((n) => n.display_name);
  const including = named.length > 0 ? `, including ${listNames(named)}` : "";
  return `${pool.candidate_count} certified candidates${including}, modelled together.`;
}
