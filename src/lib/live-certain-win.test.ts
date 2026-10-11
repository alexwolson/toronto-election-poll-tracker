import { describe, expect, it } from "vitest";
import { certainWinShares } from "./live-certain-win";
import { eliminatedKeys } from "./live-eliminated";
import type { LiveRange } from "@/types/live";

/** The payload's Possible Ranges from raw votes and the votes still out, rounded as the
 *  pipeline rounds them (live-projection `payload.py` `_possible`). */
function possibleFrom(votes: Record<string, number>, remaining: number): Record<string, LiveRange> {
  const total = Object.values(votes).reduce((a, b) => a + b, 0) + remaining;
  const round = (v: number) => Math.round(v * 100) / 100;
  return Object.fromEntries(
    Object.entries(votes).map(([key, v]) => [key, { low: round((100 * v) / total), high: round((100 * (v + remaining)) / total) }]),
  );
}

/** The certain-win share from raw votes: past (own + strongest rival's + still out) / 2. */
function fromVotes(votes: Record<string, number>, remaining: number, key: string): number {
  const total = Object.values(votes).reduce((a, b) => a + b, 0) + remaining;
  const rival = Math.max(...Object.entries(votes).filter(([k]) => k !== key).map(([, v]) => v));
  return (100 * (votes[key] + rival + remaining)) / 2 / total;
}

describe("certainWinShares (live-projection #105)", () => {
  it("matches the share computed from raw votes, for each candidate against their strongest rival", () => {
    const votes = { a: 500, b: 420, c: 80 };
    const shares = certainWinShares(possibleFrom(votes, 500), new Set());
    for (const key of ["a", "b", "c"]) expect(shares[key], key).toBeCloseTo(fromVotes(votes, 500, key), 1);
    // The top two share one line; a trailing candidate's own line sits lower.
    expect(shares.a).toBeCloseTo(shares.b, 1);
    expect(shares.c).toBeLessThan(shares.a);
  });

  it("always falls inside a contender's own Possible Range", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const n = 2 + (seed % 7);
      const votes = Object.fromEntries(
        Array.from({ length: n }, (_, i) => [`k${i}`, ((seed * 7919 * (i + 3)) % 997) + (i === 0 ? 50 : 0)]),
      );
      const possible = possibleFrom(votes, (seed * 104729) % 1500);
      const shares = certainWinShares(possible, eliminatedKeys(possible));
      for (const [key, share] of Object.entries(shares)) {
        expect(share, `${seed} ${key}`).toBeGreaterThanOrEqual(possible[key].low);
        expect(share, `${seed} ${key}`).toBeLessThanOrEqual(possible[key].high);
      }
    }
  });

  it("gives eliminated candidates no line", () => {
    const possible = { a: { low: 40, high: 60 }, b: { low: 25, high: 45 }, c: { low: 5, high: 25 } };
    expect(Object.keys(certainWinShares(possible, new Set(["c"])))).toEqual(["a", "b"]);
  });

  it("gives no line once only one candidate is left, which would call the winner before Night Close", () => {
    const possible = { a: { low: 60, high: 70 }, b: { low: 20, high: 30 }, c: { low: 5, high: 15 } };
    expect(certainWinShares(possible, new Set(["b", "c"]))).toEqual({});
  });

  it("gives no line without a Possible Range", () => {
    expect(certainWinShares(null, new Set())).toEqual({});
  });
});
