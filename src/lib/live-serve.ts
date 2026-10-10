/**
 * The pure serving function behind `/live/results.json` (#17 § Route). It turns
 * the store's raw values into the served JSON, or throws. The route must never
 * return a non-200, which ISR would cache: a throw keeps the last good copy.
 *
 * It applies the switches (#49; docs/store.md § Switches): store flags, never read
 * by the pipelines, that remove a level's projections, the mayor's variant, every
 * projection, or pause the page. It also passes Night Close (#51; docs/store.md §
 * Night Close), the flag Alex declares once the count stops changing.
 */

import { LIVE_SCHEMA_VERSION, validateLivePayload } from "@/lib/live-payload";
import type { LivePayload, LiveResults, ProjectionStatus } from "@/types/live";

/** The switches, each stored as `switch:<name>`. */
export const SWITCHES = ["mayor", "council", "trustee", "mayor_variant", "projections", "page"] as const;
export type SwitchName = (typeof SWITCHES)[number];

/** The store's raw values: `payload`, each pipeline's `heartbeat:<name>` and each
 *  `switch:<name>` (docs/store.md in toronto-election-live-projection). Null is a
 *  missing key. */
export interface StoredLive {
  payload: string | null;
  heartbeats: (string | null)[];
  switches: Record<SwitchName, string | null>;
  /** `night_close`; missing (null or absent) is open. */
  nightClose?: string | null;
}

/** The switches from their store values, in `SWITCHES` order. */
export function switchesFrom(values: (string | null)[]): StoredLive["switches"] {
  return Object.fromEntries(SWITCHES.map((name, i) => [name, values[i] ?? null])) as StoredLive["switches"];
}

/** A missing key or `on` is on; anything else is off, so a typo in the Upstash
 *  console fails closed. */
function isOff(raw: string | null): boolean {
  return raw !== null && raw !== "on";
}

/** The statuses under which a level's projection shows (the pipeline's `SHOWS`). A level
 *  its gate already keeps off keeps its own status and wording. */
const SHOWING: ReadonlySet<ProjectionStatus> = new Set(["live", "stub", "ungated"]);

function switchedOff(status: ProjectionStatus): ProjectionStatus {
  return SHOWING.has(status) ? "switched_off" : status;
}

/** The payload with switched-off projections removed. The count and the Possible Range
 *  are not projections and stay. */
function applySwitches(payload: LivePayload, switches: StoredLive["switches"]): LivePayload {
  const levelOff = (level: "mayor" | "council" | "trustee") =>
    isOff(switches[level]) || isOff(switches.projections);
  const levels = structuredClone(payload.levels);
  const races = payload.races.map((race) => ({ ...race }));

  for (const level of ["council", "trustee"] as const) {
    if (!levelOff(level)) continue;
    levels[level].projection = switchedOff(levels[level].projection);
    for (const race of races) if (race.level === level) race.projection = null;
  }

  const mayorOff = levelOff("mayor");
  if (mayorOff || isOff(switches.mayor_variant)) {
    levels.mayor.variant = switchedOff(levels.mayor.variant);
    levels.mayor.approved = false;
    let removed = false;
    for (const race of races) {
      if (race.level !== "mayor" || race.projection === null) continue;
      // The variant alone: the count-only band, which the pipeline publishes only while
      // count-only is itself live.
      const countOnly = mayorOff ? undefined : race.projection.bands.count_only;
      race.projection = countOnly
        ? {
            ...race.projection,
            bands: { count_only: countOnly },
            ...("shown" in race.projection ? { shown: "count_only" as const } : {}),
          }
        : null;
      removed ||= race.projection === null;
    }
    // The level reads switched off when it is, or when its last band went with the variant.
    if (mayorOff || removed) levels.mayor.projection = switchedOff(levels.mayor.projection);
  }
  return { ...payload, levels, races };
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
  return {
    heartbeat,
    paused: isOff(stored.switches.page),
    // Exactly `closed`: a typo is open, the opposite of the switches, so it never puts up
    // "Elected (unofficial)".
    closed: stored.nightClose === "closed",
    payload: applySwitches(payload, stored.switches),
  };
}
