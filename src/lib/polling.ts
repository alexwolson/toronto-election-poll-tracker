/**
 * Pure reshaping of the descriptive polling feed for the chart and archive
 * (spec §Chart: raw current-field points, no modelled average).
 */

import type { MayoralPollingFeed, Poll } from "@/types/feeds";

export interface PollRow {
  date: string;
  poll_id: string;
  firm: string;
  /** each requested candidate's reported share, or null if not field-tested */
  [candidateId: string]: string | number | null;
}

/** One chronological row per poll, each carrying the requested field's shares
 *  (null where a candidate was not tested). Candidates outside the field are
 *  omitted entirely, so the chart shows only the current race. */
export function pollRows(feed: MayoralPollingFeed, field: string[]): PollRow[] {
  return [...feed.polls]
    .sort((a, b) => a.date_conducted.localeCompare(b.date_conducted))
    .map((poll) => {
      const row: PollRow = {
        date: poll.date_conducted,
        poll_id: poll.poll_id,
        firm: poll.firm,
      };
      for (const id of field) {
        row[id] = id in poll.shares ? poll.shares[id] : null;
      }
      return row;
    });
}

/** The newest poll's shares, restricted to the field. */
export function latestFieldShares(
  feed: MayoralPollingFeed,
  field: string[],
): Record<string, number> {
  const latest = feed.latest;
  const shares: Record<string, number> = {};
  if (!latest) return shares;
  for (const id of field) {
    if (id in latest.shares) shares[id] = latest.shares[id];
  }
  return shares;
}

export interface PollsterCount {
  firm: string;
  count: number;
}

/** Polls per firm, most frequent first (ties broken alphabetically). */
export function pollsterRegistry(feed: MayoralPollingFeed): PollsterCount[] {
  const counts = new Map<string, number>();
  for (const poll of feed.polls) {
    counts.set(poll.firm, (counts.get(poll.firm) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([firm, count]) => ({ firm, count }))
    .sort((a, b) => b.count - a.count || a.firm.localeCompare(b.firm));
}

/** Convenience re-export shape for the archive table (newest first, as fed). */
export function pollArchive(feed: MayoralPollingFeed): Poll[] {
  return feed.polls;
}
