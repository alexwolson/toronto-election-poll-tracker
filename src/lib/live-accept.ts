/**
 * The browser's accept rule for `/live/results.json` (#17 § Browser; S7 in #17's
 * grilling). Each poll either replaces what the reader sees or leaves it alone:
 *
 * - a body failing the same schema check the route runs counts as a failed poll
 *   and never replaces a good one;
 * - a newer `seq` pair (neither seq older, at least one newer) is accepted, and so
 *   is an equal pair, so a switch flip, the page pause or a fresh heartbeat
 *   reaches readers who already hold that count;
 * - an older or mixed pair is ignored: after a deploy, ISR restarts from the
 *   build's snapshot (research 05 §6), and no file may go backwards.
 *
 * Pure: the poller owns the clock and the network.
 */

import { validateLivePayload } from "@/lib/live-payload";
import type { LiveResults } from "@/types/live";

/** Failed polls in a row before the page says it can't reach live results. */
export const FAILURES_BEFORE_NOTICE = 3;

export interface LiveClientState {
  /** The newest good results this reader has seen; null before the first. */
  results: LiveResults | null;
  /** Failed polls since the last good response. */
  failures: number;
}

export const INITIAL_LIVE_STATE: LiveClientState = { results: null, failures: 0 };

/** The served JSON, checked as the route checked it. */
function validateLiveResults(value: unknown): LiveResults | null {
  if (typeof value !== "object" || value === null) return null;
  const { heartbeat, paused, payload } = value as Record<string, unknown>;
  if (!Number.isSafeInteger(heartbeat) || Number(heartbeat) < 0) return null;
  if (typeof paused !== "boolean") return null;
  const valid = validateLivePayload(payload);
  return valid === null ? null : { heartbeat: heartbeat as number, paused, payload: valid };
}

/** Newer or equal under S7: neither seq goes backwards. */
function notOlder(next: LiveResults, held: LiveResults): boolean {
  return (
    next.payload.seq.all_office >= held.payload.seq.all_office &&
    next.payload.seq.ward_by_ward >= held.payload.seq.ward_by_ward
  );
}

/** Apply one poll. `body` is the parsed response, or null when the fetch failed. */
export function acceptPoll(state: LiveClientState, body: unknown): LiveClientState {
  const next = validateLiveResults(body);
  if (next === null) return { results: state.results, failures: state.failures + 1 };
  if (state.results !== null && !notOlder(next, state.results)) {
    return { results: state.results, failures: 0 };
  }
  return { results: next, failures: 0 };
}

export function showsUnreachableNotice(state: LiveClientState): boolean {
  return state.failures >= FAILURES_BEFORE_NOTICE;
}
