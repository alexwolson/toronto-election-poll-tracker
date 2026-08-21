/**
 * Pure reshaping of the descriptive polling feed for the chart and archive
 * (spec §Chart: raw current-field points, no modelled average).
 */

import { isoDayNumber } from "@/lib/format";
import { type LoessPoint, loessCurve } from "@/lib/loess";
import type { MayoralPollingFeed, Poll } from "@/types/feeds";

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

export interface TrendMarker {
  x: number; // fieldwork date as a day number
  y: number; // reported share (0..1)
  poll_id: string;
}

export interface CandidateTrend {
  id: string;
  /** raw poll observations for this candidate, chronological */
  markers: TrendMarker[];
  /** LOESS smoother over the markers, or null when there are too few to fit */
  curve: LoessPoint[] | null;
}

/**
 * Per-candidate trend: raw markers plus a LOESS smoother, each candidate fitted
 * only from its own reported shares (a poll that didn't test a candidate
 * contributes nothing — never zero-filled or inferred from another candidate).
 */
export function candidateTrends(
  feed: MayoralPollingFeed,
  field: string[],
): CandidateTrend[] {
  return field.map((id) => {
    const markers: TrendMarker[] = feed.polls
      .filter((poll) => id in poll.shares)
      .map((poll) => ({
        x: isoDayNumber(poll.date_conducted),
        y: poll.shares[id],
        poll_id: poll.poll_id,
      }))
      .sort((a, b) => a.x - b.x);
    const curve = loessCurve(markers.map((m) => ({ x: m.x, y: m.y })));
    return { id, markers, curve };
  });
}
