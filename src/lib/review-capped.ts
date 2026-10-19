/**
 * Prototype only (live-projection #124, branch review/capped-possible, never merged): the
 * Possible Range with the outstanding vote capped per race by C(1.5), the variant that passed the
 * second pre-registered replay test. For a race (or a mayoral ward) still counting with Reporting
 * Progress f ≥ 0.20: R′ = min(R, max(0, 1.5·V/f − V) + a), with R = electors − V and a the citywide
 * advance vote × electors ÷ city electors; otherwise R as now.
 */

import inputs from "@/data/review-capped.json";
import type { LivePayload, LiveProgress, LiveRace } from "@/types/live";

const S = 1.5;
const MIN_F = 0.2;
const ELECTORS: Record<string, number> = inputs.electors;
const CITY = Object.values(ELECTORS).reduce((a, b) => a + b, 0);
const TRUSTEE: Record<string, string[]> = inputs.trustee_city_wards;

function capped(votes: number, electors: number, progress: LiveProgress | null): number {
  const old = Math.max(0, electors - votes);
  if (!progress || progress.total <= 0) return old;
  const f = progress.received / progress.total;
  if (f >= 1) return 0;
  if (f < MIN_F) return old;
  const allowance = (inputs.advance_voters * electors) / CITY;
  return Math.min(old, Math.max(0, (S * votes) / f - votes) + allowance);
}

function outstanding(race: LiveRace): number | null {
  const counted = race.candidates.reduce((a, c) => a + (c.votes ?? 0), 0);
  if (race.level === "mayor") {
    let total = 0;
    for (const w of race.wards ?? []) {
      const v = Object.values(w.votes ?? {}).reduce((a, b) => a + b, 0);
      total += capped(v, ELECTORS[w.num] ?? 0, w.progress);
    }
    return total;
  }
  const wards = race.level === "council" ? [race.num] : race.level === "trustee" ? TRUSTEE[race.id] : null;
  if (!wards) return null;
  return capped(counted, wards.reduce((a, w) => a + (ELECTORS[w] ?? 0), 0), race.progress);
}

/** The payload with each counting race's Possible Range recomputed under C(1.5). */
export function capPossible(payload: LivePayload): LivePayload {
  const races = payload.races.map((race) => {
    if (race.state !== "counting" || !race.possible) return race;
    const r = outstanding(race);
    if (r === null) return race;
    const counted = race.candidates.reduce((a, c) => a + (c.votes ?? 0), 0);
    const total = counted + r;
    if (total <= 0) return race;
    const round = (x: number) => Math.round(x * 100) / 100;
    const possible = Object.fromEntries(
      race.candidates.map((c) => [c.key, { low: round((100 * (c.votes ?? 0)) / total), high: round((100 * ((c.votes ?? 0) + r)) / total) }]),
    );
    return { ...race, possible };
  });
  return { ...payload, races };
}
