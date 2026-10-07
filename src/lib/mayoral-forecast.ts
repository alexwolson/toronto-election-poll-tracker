/**
 * Pure selectors over the schema-5 mayoral forecast feed (ADR 0054, policy
 * margin-first-joint-draws-v1).
 *
 * Every public number is a summary of the same joint election-day draws; these
 * selectors only reshape the feed for the three views the approved presentation
 * renders (the leader margin, candidate vote ranges, where the uncertainty comes
 * from). Shares arrive as fractions and leave as percentage points. Probabilities
 * stay fractions and are formatted once: a lone chance by `chance`, and the parts
 * of a whole (margin outcomes, uncertainty shares) as whole percents rounded as a
 * set so they add to 100, printed by `wholePercent`.
 */

import { candidateMeta, candidateName } from "@/lib/candidates";
import { formatDate, formatShortDate, isoDayNumber, percentagesToHundred } from "@/lib/format";
import { loessCurve } from "@/lib/loess";
import type { CandidateTrend } from "@/lib/polling";
import type { MayoralForecastFeed, UncertaintyGap, UncertaintySourceKey } from "@/types/feeds";

/** Whole-percent chance with guarded tails: "<1%", "63%", ">99%". */
export function chance(value: number): string {
  if (value < 0.01) return "<1%";
  if (value > 0.99) return ">99%";
  return `${Math.round(value * 100)}%`;
}

/** A set-rounded whole percent (see `percentagesToHundred`) with the same guarded tails as `chance`. */
export function wholePercent(percent: number, fraction: number): string {
  if (percent === 0 && fraction > 0) return "<1%";
  if (percent === 100 && fraction < 1) return ">99%";
  return `${percent}%`;
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

/** The field that remains on the campaign trail: the candidate_win keys minus any
 * Suspended Campaign folded into Other candidates. A post-exit poll need only report
 * these to count as reporting the field. */
export function remainingField(feed: MayoralForecastFeed): string[] {
  const folded = new Set(
    (feed.election_day?.other_candidates.includes ?? []).map((c) => c.candidate_id),
  );
  return viableField(feed).filter((id) => !folded.has(id));
}

/** True only when the favourite publishes and the election-day block is present. */
export function forecastAvailable(feed: MayoralForecastFeed): boolean {
  return leadForecast(feed) !== null && feed.election_day !== null;
}

function surnameOf(name: string): string {
  return name.trim().split(/\s+/).at(-1) ?? name;
}

export interface ShareRange {
  /** null for the Other candidates row */
  candidateId: string | null;
  name: string;
  slug: string;
  colorVar: string;
  hatch: boolean;
  /** percentage points */
  median: number;
  lower: number;
  upper: number;
}

export interface ElectionDaySharesView {
  intervalMass: number;
  rows: ShareRange[];
}

/** Election-day full-ballot ranges: the named candidates not folded into Other
 * candidates, in feed order, then the Other candidates row. That row is the pool
 * plus each included Suspended Campaign, summed draw by draw by the Backend, so
 * it is read from the feed rather than added up here. */
export function electionDayShares(feed: MayoralForecastFeed): ElectionDaySharesView | null {
  const day = feed.election_day;
  if (!day) return null;
  const other = day.other_candidates;
  const folded = new Set(other.includes.map((c) => c.candidate_id));
  const rows: ShareRange[] = day.candidates.filter((c) => !folded.has(c.candidate_id)).map((c) => {
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
    };
  });
  rows.push({
    candidateId: null,
    name: other.label,
    slug: "residual",
    colorVar: "var(--color-disengaged)",
    hatch: false,
    median: other.median * 100,
    lower: other.lower * 100,
    upper: other.upper * 100,
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
  /** whole percent, rounded with the other two outcomes so the three add to 100 */
  percent: number;
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
  const { leader_ahead, close, challenger_ahead } = margin.outcomes;
  const [leaderPct, closePct, challengerPct] = percentagesToHundred([leader_ahead, close, challenger_ahead]);
  return {
    thresholdPoints: margin.outcomes.close_threshold_points,
    leader,
    challenger,
    rows: [
      {
        key: "leader_ahead",
        label: `${leader.surname} ahead by ${t} or more`,
        probability: leader_ahead,
        percent: leaderPct,
        colorVar: leader.colorVar,
      },
      {
        key: "close",
        label: `Within ${t} points either way`,
        probability: close,
        percent: closePct,
        colorVar: "var(--text-soft)",
      },
      {
        key: "challenger_ahead",
        label: `${challenger.surname} ahead by ${t} or more`,
        probability: challenger_ahead,
        percent: challengerPct,
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
  /** this source's part of the forecast's spread; the three sources add to 1, the combined row is 1 */
  share: number;
  /** whole percent of `share`, rounded with the other sources so the three add to 100; 100 for the combined row */
  sharePercent: number;
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
  share: number,
  sharePercent: number,
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
    share,
    sharePercent,
    combined,
  };
}

/** Where the uncertainty comes from (ADR 0056); null when the feed does not carry the block. */
export function uncertaintyBreakdown(feed: MayoralForecastFeed): UncertaintyBreakdownView | null {
  const block = feed.uncertainty;
  if (!block || !feed.election_day) return null;
  const sharePercents = percentagesToHundred(block.sources.map((s) => s.share_of_uncertainty));
  const rows = [
    ...block.sources.map((source, i) =>
      gapRow(
        source.key,
        UNCERTAINTY_LABELS[source.key](feed.election_date),
        source,
        source.share_of_uncertainty,
        sharePercents[i],
        false,
      ),
    ),
    gapRow("combined", "All three together: the forecast", block.combined, 1, 100, true),
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

/** The "What is behind these numbers" line for the Other candidates row: it names
 * each included Suspended Campaign and its date, then describes the pool. */
export function otherCandidatesNote(feed: MayoralForecastFeed): string {
  const other = feed.election_day?.other_candidates;
  if (!other) return "";
  const exits = other.includes.map(
    (c) => `${c.display_name}, who ended his campaign on ${formatShortDate(c.campaign_suspended_on)}`,
  );
  const label = exits.length > 0 ? `${other.label}, including ${listNames(exits)}` : other.label;
  return `${label}: ${residualPoolNote(feed)}`;
}

/** The included Suspended Campaign's own election-day share in words, read from
 * the release: "less than 1%" below one percent, otherwise "about N%". Null when
 * no campaign is included. */
export function suspendedShareText(feed: MayoralForecastFeed): string | null {
  const day = feed.election_day;
  const included = day?.other_candidates.includes[0];
  const candidate = day?.candidates.find((c) => c.candidate_id === included?.candidate_id);
  if (!candidate) return null;
  return candidate.median < 0.01 ? "less than 1%" : `about ${Math.round(candidate.median * 100)}%`;
}

/** The forecast history as the polling chart's series: one point per release and
 * candidate, with the same LOESS trend line the polling chart uses (none under
 * its minimum point count); null when the feed carries no history. x is the
 * publication date as a day number. */
export function forecastHistoryTrends(
  feed: MayoralForecastFeed,
  field: string[],
): CandidateTrend[] | null {
  const history = feed.history;
  if (!history || history.length === 0) return null;
  return field.map((id) => {
    const markers = history
      .filter((point) => id in point.win_probability)
      .map((point) => ({
        x: isoDayNumber(point.date),
        y: point.win_probability[id],
        poll_id: point.poll_sample_ids.join(", "),
      }));
    return { id, markers, curve: loessCurve(markers.map(({ x, y }) => ({ x, y }))) };
  });
}

/** Screen-reader rows for the forecast-history chart. */
export function forecastHistorySummaryRows(
  feed: MayoralForecastFeed,
  series: Array<{ id: string; name: string }>,
): string[] {
  const history = feed.history ?? [];
  if (history.length === 0) return [];
  const first = history[0];
  const last = history[history.length - 1];
  const pct = (value: number | undefined) =>
    value === undefined ? "n/a" : `${(value * 100).toFixed(1)}%`;
  return series.map(
    ({ id, name }) =>
      `${name}: ${pct(first.win_probability[id])} after the poll published ${formatDate(first.date)}; ` +
      `${pct(last.win_probability[id])} after the latest, published ${formatDate(last.date)}; ` +
      `${history.length} releases.`,
  );
}
