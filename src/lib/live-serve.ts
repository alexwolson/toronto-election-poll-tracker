/**
 * The pure serving function behind `/live/results.json` (#17 § Route). It turns
 * the store's raw values into the served JSON, or throws. The route must never
 * return a non-200, which ISR would cache: a throw keeps the last good copy.
 */

import { LIVE_SCHEMA_VERSION, validateLivePayload } from "@/lib/live-payload";
import type { LiveResults } from "@/types/live";

/** The store's raw values: `payload` and each pipeline's `heartbeat:<name>`
 *  (docs/store.md in toronto-election-live-projection). Null is a missing key. */
export interface StoredLive {
  payload: string | null;
  heartbeats: (string | null)[];
}

/** A heartbeat is written as epoch milliseconds in decimal digits. */
function parseHeartbeat(value: string): number {
  const ms = /^\d+$/.test(value) ? Number(value) : NaN;
  if (!Number.isSafeInteger(ms)) throw new Error(`live: malformed heartbeat ${JSON.stringify(value)}`);
  return ms;
}

export function serveLive(stored: StoredLive): LiveResults {
  if (stored.payload === null) throw new Error("live: no payload in the store");

  // One pipeline's heartbeat may never have been written; the staleness banner
  // covers a pipeline that is down. Both missing means nothing has read the City.
  const present = stored.heartbeats.filter((value): value is string => value !== null);
  if (present.length === 0) throw new Error("live: no heartbeat in the store");
  const heartbeat = Math.max(...present.map(parseHeartbeat));

  let parsed: unknown;
  try {
    parsed = JSON.parse(stored.payload);
  } catch {
    throw new Error("live: stored payload is not JSON");
  }
  const payload = validateLivePayload(parsed);
  if (payload === null) {
    throw new Error(`live: stored payload fails the schema-${LIVE_SCHEMA_VERSION} validator`);
  }
  return { heartbeat, payload };
}
