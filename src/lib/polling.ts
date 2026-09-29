/**
 * Descriptive polling views: candidate-choice chart shares and an archive
 * preserving the source figures, with no modelled polling average.
 */

import { isoDayNumber } from "@/lib/format";
import { type LoessPoint, loessCurve } from "@/lib/loess";
import type { MayoralPollingFeed, Poll } from "@/types/feeds";

/** Polls ordered by when the fieldwork happened, newest first. The feed lists
 * them newest *published* first; a poll released weeks after its fieldwork
 * (Ipsos, September 2026) must not displace polls conducted after it. Ties
 * break by publication date, then id. */
export function pollsByFieldwork(feed: MayoralPollingFeed): Poll[] {
  return [...feed.polls].sort(
    (a, b) =>
      b.date_conducted.localeCompare(a.date_conducted) ||
      b.date_published.localeCompare(a.date_published) ||
      b.poll_id.localeCompare(a.poll_id),
  );
}

/** The poll with the most recent fieldwork; null when the feed has none. */
export function latestPoll(feed: MayoralPollingFeed): Poll | null {
  return pollsByFieldwork(feed)[0] ?? null;
}

/** The latest poll's shares (by fieldwork), restricted to the field. */
export function latestFieldShares(
  feed: MayoralPollingFeed,
  field: string[],
): Record<string, number> {
  const latest = latestPoll(feed);
  const shares: Record<string, number> = {};
  if (!latest) return shares;
  for (const id of field) {
    if (id in latest.shares) shares[id] = latest.shares[id];
  }
  return shares;
}

/** Sum responses a poll explicitly reports outside the forecast field. This
 * never infers a residual from an incomplete total. */
export function explicitOtherShare(poll: Poll, field: string[]): number | null {
  const fieldIds = new Set(field);
  const reportedOutsideField = Object.entries(poll.shares).filter(
    ([id]) => !fieldIds.has(id),
  );

  if (reportedOutsideField.length === 0) return null;
  return reportedOutsideField.reduce((sum, [, share]) => sum + share, 0);
}

const UNDECIDED_KEY = "response:undecided";

export interface ResidualShares {
  /** the poll's reported undecided share, when its denominator keeps undecideds in */
  undecided: number | null;
  /** everything else reported outside the forecast field: other candidates, non-voters */
  other: number | null;
}

/** Responses a poll reports outside the forecast field, with undecided kept
 * apart from the rest so an all-respondents reading is not read as "38% chose
 * someone else". Nothing is inferred from an incomplete total. */
export function residualShares(poll: Poll, field: string[]): ResidualShares {
  const fieldIds = new Set(field);
  let undecided: number | null = null;
  let other: number | null = null;
  for (const [id, share] of Object.entries(poll.shares)) {
    if (fieldIds.has(id)) continue;
    if (id === UNDECIDED_KEY) undecided = (undecided ?? 0) + share;
    else other = (other ?? 0) + share;
  }
  return { undecided, other };
}

/** The poll's denominator label as it reads mid-sentence; null when the feed has none. */
export function denominatorPhrase(poll: Poll): string | null {
  const label = poll.denominator?.trim();
  if (!label) return null;
  return label.charAt(0).toLowerCase() + label.slice(1);
}

/** Expand terse feed codes where a plain-language label is known. */
export function pollMethodLabel(methodology: string): string {
  const normalized = methodology.trim().toLowerCase();
  if (normalized === "ivr") return "Interactive voice response (IVR)";
  if (normalized === "online") return "Online survey";
  if (normalized === "ivr/online" || normalized === "online/ivr") {
    return "Interactive voice response and online";
  }
  return methodology;
}

/** Newest conducted date among polls the forecast identifies as evidence. */
export function latestReferencedPollDate(
  feed: MayoralPollingFeed,
  pollIds: string[],
): string | null {
  const referenced = new Set(pollIds);
  const dates = feed.polls
    .filter((poll) => referenced.has(poll.poll_id))
    .map((poll) => poll.date_conducted)
    .sort();
  return dates.at(-1) ?? null;
}

export interface PollsterCount {
  firm: string;
  count: number;
  website: string | null;
}

/** Official pollster sites. Feed names are the stable lookup key; an unknown
 * firm deliberately stays unlinked until its destination can be verified. */
const POLLSTER_WEBSITES: Readonly<Record<string, string>> = {
  "Abacus Data": "https://abacusdata.ca/",
  "Canada Pulse Insights/CityNews": "https://canadapulseinsights.com/",
  "Forum Research": "https://forumresearch.com/",
  Ipsos: "https://www.ipsos.com/en-ca",
  "Liaison Strategies": "https://press.liaisonstrategies.ca/",
  "Mainstreet Research": "https://www.mainstreetresearch.ca/",
  "Pallas Data": "https://pallas-data.ca/",
};

export function pollsterWebsite(firm: string): string | null {
  return POLLSTER_WEBSITES[firm] ?? null;
}

/** Polls per firm, most frequent first (ties broken alphabetically). */
export function pollsterRegistry(feed: MayoralPollingFeed): PollsterCount[] {
  const counts = new Map<string, number>();
  for (const poll of feed.polls) {
    counts.set(poll.firm, (counts.get(poll.firm) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([firm, count]) => ({ firm, count, website: pollsterWebsite(firm) }))
    .sort((a, b) => b.count - a.count || a.firm.localeCompare(b.firm));
}

/** Convenience re-export shape for the archive table (newest first, as fed). */
export function pollArchive(feed: MayoralPollingFeed): Poll[] {
  return feed.polls;
}

export interface TrendMarker {
  x: number; // fieldwork date as a day number
  y: number; // chart share (0..1)
  poll_id: string;
  reportedShare?: number;
  derived?: boolean;
  firm?: string;
  denominator?: string;
}

export interface CandidateTrend {
  id: string;
  /** comparable poll observations for this candidate, chronological */
  markers: TrendMarker[];
  /** LOESS fit from the full comparable history; views may show fewer markers. */
  curve: LoessPoint[] | null;
}

/** Toronto's nomination deadline was August 21 at 2 p.m.
 * https://www.toronto.ca/news/municipal-election-candidate-nominations-close-tomorrow/ */
export const NOMINATIONS_CLOSED_DATE = "2026-08-21";

/** Public polls completed after nomination day and reporting the current field.
 * End dates have no time of day, so a poll ending on nomination day cannot
 * establish post-deadline fieldwork. A reported zero qualifies; an absent
 * candidate does not. This is a chart filter, not the model's selection gate. */
export function pollsSinceNominationsClosed(feed: MayoralPollingFeed, field: string[]): Poll[] {
  if (field.length === 0) return [];
  return feed.polls.filter((poll) =>
    poll.date_conducted > NOMINATIONS_CLOSED_DATE &&
    field.every((id) => Object.hasOwn(poll.shares, id)),
  );
}

/** Select displayed observations while retaining the full-history LOESS fit.
 * The chart's date domain clips the curve; this never refits the selected polls. */
export function candidateTrendsForPolls(trends: CandidateTrend[], polls: Poll[]): CandidateTrend[] {
  const ids = new Set(polls.map((poll) => poll.poll_id));
  return trends.map((trend) => ({
    ...trend,
    markers: trend.markers.filter((marker) => ids.has(marker.poll_id)),
  }));
}

const NON_CHOICE_RESPONSES = new Set([
  "response:undecided", "response:would_not_vote", "response:refusal",
  "response:dont_know", "response:none_of_the_above", "response:no_answer",
]);

/** Expressed candidate choice, including every named candidate and the other
 * candidate pool. Decided readings retain source rounding. All-respondent
 * readings need a complete, classifiable total before deriving their shares;
 * an unknown denominator or combined residual cannot establish this basis. */
export function candidateChoiceShares(poll: Poll): {
  shares: Record<string, number>;
  derived: boolean;
} | null {
  if (poll.denominator === "Decided voters" ||
      poll.denominator === "Decided and leaning voters") {
    return { shares: poll.shares, derived: false };
  }
  if (poll.denominator !== "All respondents") return null;

  const responses = Object.entries(poll.shares);
  if (responses.some(([id]) =>
    !id.startsWith("per_") && id !== "response:other" && !NON_CHOICE_RESPONSES.has(id),
  )) return null;
  const total = responses.reduce((sum, [, share]) => sum + share, 0);
  // Whole-point rounding can move the reported total slightly away from 100%.
  if (Math.abs(total - 1) > 0.02 + Number.EPSILON) return null;
  const choices = responses.filter(([id]) => !NON_CHOICE_RESPONSES.has(id));
  const choiceTotal = choices.reduce((sum, [, share]) => sum + share, 0);
  if (choiceTotal <= 0) return null;
  return {
    shares: Object.fromEntries(choices.map(([id, share]) => [id, share / choiceTotal])),
    derived: true,
  };
}

/** Candidate-choice markers and LOESS, without inventing an absent candidate. */
export function candidateTrends(
  feed: MayoralPollingFeed,
  field: string[],
): CandidateTrend[] {
  return trendsForReadings(feed.polls, field, candidateChoiceShares);
}

/** Published all-respondent shares, including undecided/non-voters in the base. */
export function allRespondentTrends(feed: MayoralPollingFeed, field: string[]): CandidateTrend[] {
  return trendsForReadings(feed.all_respondents ?? [], field, (poll) => ({
    shares: poll.shares, derived: false,
  }));
}

function trendsForReadings(
  polls: Poll[], field: string[],
  readShares: (poll: Poll) => { shares: Record<string, number>; derived: boolean } | null,
): CandidateTrend[] {
  const comparable = polls.flatMap((poll) => {
    const choice = readShares(poll);
    return choice ? [{ poll, ...choice }] : [];
  });
  return field.map((id) => {
    const markers: TrendMarker[] = comparable
      .filter(({ shares }) => id in shares)
      .map(({ poll, shares, derived }) => ({
        x: isoDayNumber(poll.date_conducted),
        y: shares[id],
        poll_id: poll.poll_id,
        reportedShare: poll.shares[id],
        derived,
        firm: poll.firm,
        denominator: poll.denominator,
      }))
      .sort((a, b) => a.x - b.x);
    const curve = loessCurve(markers.map((m) => ({ x: m.x, y: m.y })));
    return { id, markers, curve };
  });
}
