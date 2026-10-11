/**
 * The Count view's series (live-projection #103), from the served history: how much is
 * reported and counted over the night, how fast votes arrive, each candidate's counted
 * share with the band the page showed, and one candidate's lead over another. The count
 * only: nothing here compares it with the forecast (#12).
 */

import type { LiveHistory, LiveRaceHistory } from "@/types/live";

export interface CountRow {
  t: number;
  /** Percent of polls reported, or null when the point has no progress. */
  reported: number | null;
  counted: number;
}

function counted(row: (number | null)[]): number {
  return row.reduce<number>((sum, v) => sum + (v ?? 0), 0);
}

function percentReported(p: [number, number] | null): number | null {
  return p === null || p[1] <= 0 ? null : Math.min(100, (100 * p[0]) / p[1]);
}

export function countRows(history: LiveHistory, id: string): CountRow[] {
  const race = history.races[id];
  if (!race) return [];
  return history.t.map((t, i) => ({ t, reported: percentReported(race.p[i]), counted: counted(race.v[i]) }));
}

export interface PaceBucket {
  /** The bucket's start on the clock, epoch ms. */
  start: number;
  votes: number;
}

/** Votes newly counted per clock bucket. A decrease adds nothing rather than going negative. */
export function paceBuckets(history: LiveHistory, id: string, bucketMs: number): PaceBucket[] {
  const rows = countRows(history, id);
  if (rows.length === 0) return [];
  const first = Math.floor(rows[0].t / bucketMs) * bucketMs;
  const last = Math.floor(rows[rows.length - 1].t / bucketMs) * bucketMs;
  const buckets = new Map<number, number>();
  for (let start = first; start <= last; start += bucketMs) buckets.set(start, 0);
  let before = 0;
  for (const row of rows) {
    const start = Math.floor(row.t / bucketMs) * bucketMs;
    buckets.set(start, (buckets.get(start) ?? 0) + Math.max(0, row.counted - before));
    before = Math.max(before, row.counted);
  }
  return [...buckets].map(([start, votes]) => ({ start, votes }));
}

export type ShareRow = { t: number; reported: number | null } & Record<string, number | [number, number] | null>;

function shareAt(race: LiveRaceHistory, i: number, key: string, total: number): number {
  return (100 * (race.v[i][race.keys.indexOf(key)] ?? 0)) / total;
}

/**
 * Each drawn candidate's counted share per point, its shown band as `band:<key>` [low, high]
 * where there was one, and every other candidate summed as `others`. Points with no votes
 * counted are skipped: a share of nothing isn't a point on the line.
 */
export function shareRows(history: LiveHistory, id: string, drawn: string[]): ShareRow[] {
  const race = history.races[id];
  if (!race) return [];
  const rest = race.keys.filter((k) => !drawn.includes(k));
  return history.t.flatMap((t, i) => {
    const total = counted(race.v[i]);
    if (total === 0) return [];
    const row: ShareRow = { t, reported: percentReported(race.p[i]) };
    for (const key of drawn) {
      row[key] = shareAt(race, i, key, total);
      const band = race.b?.[i][race.keys.indexOf(key)];
      if (band) row[`band:${key}`] = [band[0], band[2]];
    }
    if (rest.length > 0) row.others = rest.reduce((sum, key) => sum + shareAt(race, i, key, total), 0);
    return [row];
  });
}

export interface LeadRow {
  t: number;
  reported: number | null;
  /** `a`'s counted share minus `b`'s, in points. */
  lead: number;
}

export function leadRows(history: LiveHistory, id: string, a: string, b: string): LeadRow[] {
  const race = history.races[id];
  if (!race) return [];
  return history.t.flatMap((t, i) => {
    const total = counted(race.v[i]);
    if (total === 0) return [];
    return [{ t, reported: percentReported(race.p[i]), lead: shareAt(race, i, a, total) - shareAt(race, i, b, total) }];
  });
}
