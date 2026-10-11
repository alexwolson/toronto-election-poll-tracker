/**
 * The count over the night (live-projection #102, #103). The pipelines append one entry
 * to the store's `history` list per stored count (docs/store.md § history); the route
 * serves them in columns, which is a fraction of the bytes of one object per entry, with
 * the switches applied to the bands as `/live/results.json` applies them to the payload.
 * The count itself is never switched off. An entry the route can't read is skipped, so one
 * bad entry never takes the whole history down.
 */

import { isOff, type StoredLive } from "@/lib/live-serve";
import type { LiveHistory, LiveRaceHistory } from "@/types/live";

export const HISTORY_SCHEMA_VERSION = 1;

type Pair = [number, number];
type Band = [number, number, number];

interface StoredRace {
  p: Pair | null;
  v: Record<string, number>;
  b?: Record<string, Band>;
  s?: string;
  w?: Record<string, Pair | null>;
}

interface StoredEntry {
  seq: { all_office: number; ward_by_ward: number };
  races: Record<string, StoredRace>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isPair(value: unknown): value is Pair {
  return Array.isArray(value) && value.length === 2 && value.every(isCount);
}

function isBand(value: unknown): value is Band {
  return Array.isArray(value) && value.length === 3 && value.every((n) => typeof n === "number" && Number.isFinite(n));
}

function isStoredRace(value: unknown): value is StoredRace {
  if (!isRecord(value) || !(value.p === null || isPair(value.p))) return false;
  if (!isRecord(value.v) || !Object.values(value.v).every(isCount)) return false;
  if (value.b !== undefined && !(isRecord(value.b) && Object.values(value.b).every(isBand))) return false;
  if (value.s !== undefined && typeof value.s !== "string") return false;
  if (value.w !== undefined && !(isRecord(value.w) && Object.values(value.w).every((p) => p === null || isPair(p)))) {
    return false;
  }
  return true;
}

function parseEntry(raw: string): StoredEntry | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(value) || !isRecord(value.seq) || !isRecord(value.races)) return null;
  if (!isCount(value.seq.all_office) || !isCount(value.seq.ward_by_ward)) return null;
  if (!Object.values(value.races).every(isStoredRace)) return null;
  return value as unknown as StoredEntry;
}

/** The level whose switch governs a race's bands, from its payload id. */
function bandLevel(id: string): "mayor" | "council" | "trustee" | null {
  if (id === "mayor") return "mayor";
  if (id.startsWith("councillor-")) return "council";
  if (id.startsWith("tdsb-") || id.startsWith("tcdsb-")) return "trustee";
  return null;
}

/** Whether a stored band still shows under the switches, as `applySwitches` decides. */
function bandShows(id: string, variant: string | undefined, switches: StoredLive["switches"]): boolean {
  const level = bandLevel(id);
  if (level === null || isOff(switches.projections) || isOff(switches[level])) return false;
  return !(level === "mayor" && variant === "forecast_weighted" && isOff(switches.mayor_variant));
}

export function serveHistory(stored: {
  entries: string[];
  switches: StoredLive["switches"];
}): LiveHistory {
  const entries = stored.entries.map(parseEntry).filter((e): e is StoredEntry => e !== null);
  const ids = [...new Set(entries.flatMap((e) => Object.keys(e.races)))];
  const races: Record<string, LiveRaceHistory> = {};
  for (const id of ids) {
    const points = entries.map((e) => e.races[id]);
    const keys = [...new Set(points.flatMap((race) => (race ? Object.keys(race.v) : [])))];
    const race: LiveRaceHistory = {
      keys,
      p: points.map((r) => r?.p ?? null),
      v: points.map((r) => keys.map((k) => r?.v[k] ?? null)),
    };
    const bands = points.map((r) =>
      keys.map((k) => (r?.b && bandShows(id, r.s, stored.switches) ? (r.b[k] ?? null) : null)),
    );
    if (bands.some((row) => row.some((band) => band !== null))) race.b = bands;
    const wards = [...new Set(points.flatMap((r) => Object.keys(r?.w ?? {})))];
    if (wards.length > 0) {
      race.w = Object.fromEntries(wards.map((ward) => [ward, points.map((r) => r?.w?.[ward] ?? null)]));
    }
    races[id] = race;
  }
  return {
    schema_version: HISTORY_SCHEMA_VERSION,
    t: entries.map((e) => Math.min(e.seq.all_office, e.seq.ward_by_ward)),
    races,
  };
}

function isColumn<T>(value: unknown, length: number, item: (x: unknown) => x is T): value is T[] {
  return Array.isArray(value) && value.length === length && value.every(item);
}

function validRace(value: unknown, length: number): boolean {
  if (!isRecord(value) || !Array.isArray(value.keys) || !value.keys.every((k) => typeof k === "string")) return false;
  const width = value.keys.length;
  const row =
    <T,>(cell: (x: unknown) => x is T) =>
    (x: unknown): x is (T | null)[] =>
      isColumn(x, width, (c: unknown): c is T | null => c === null || cell(c));
  if (!isColumn(value.p, length, (x: unknown): x is Pair | null => x === null || isPair(x))) return false;
  if (!isColumn(value.v, length, row(isCount))) return false;
  if (value.b !== undefined && !isColumn(value.b, length, row(isBand))) return false;
  if (value.w !== undefined) {
    if (!isRecord(value.w)) return false;
    for (const column of Object.values(value.w)) {
      if (!isColumn(column, length, (x: unknown): x is Pair | null => x === null || isPair(x))) return false;
    }
  }
  return true;
}

/** The served history, or null for anything the page shouldn't draw from. */
export function validateLiveHistory(value: unknown): LiveHistory | null {
  if (!isRecord(value) || value.schema_version !== HISTORY_SCHEMA_VERSION) return null;
  if (!Array.isArray(value.t) || !value.t.every(isCount) || !isRecord(value.races)) return null;
  const length = value.t.length;
  if (!Object.values(value.races).every((race) => validRace(race, length))) return null;
  return value as unknown as LiveHistory;
}
