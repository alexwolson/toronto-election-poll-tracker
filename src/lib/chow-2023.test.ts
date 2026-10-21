import { describe, expect, it } from "vitest";
import { CHOW_2023, chowCandidate, chowVs2023, chowWard } from "./chow-2023";
import type { LiveMayoralWard, LiveRace } from "@/types/live";

const race = {
  candidates: [
    { key: "Olivia Chow", candidacy_id: "can_24054bba2bed56dab41293ec7d138d41" },
    { key: "Braeden Chow", candidacy_id: "can_5cfd62de1fc35b858be03962fb88f01a" },
    { key: "Brad Bradford", candidacy_id: "can_b" },
  ],
} as unknown as LiveRace;

const ward = (votes: Record<string, number> | null): LiveMayoralWard => ({
  num: "2",
  name: null,
  progress: null,
  votes_counted: null,
  votes,
});

describe("CHOW_2023", () => {
  it("holds the certified 2023 by-election result for all 25 wards and citywide", () => {
    expect(Object.keys(CHOW_2023.wards)).toEqual(Array.from({ length: 25 }, (_, i) => String(i + 1)));
    expect(CHOW_2023.citywide).toEqual({ votes: 269372, valid: 724638, share: 37.17 });
    expect(CHOW_2023.candidates).toBe(102);
    const sum = Object.values(CHOW_2023.wards).reduce((a, w) => a + w.votes, 0);
    expect(sum).toBe(CHOW_2023.citywide.votes);
  });
});

describe("chowCandidate", () => {
  it("finds Olivia Chow by candidacy, never by name", () => {
    expect(chowCandidate(race)?.key).toBe("Olivia Chow");
    const renamed = { candidates: [{ key: "Chow Olivia", candidacy_id: "can_other" }] } as unknown as LiveRace;
    expect(chowCandidate(renamed)).toBeNull();
    expect(chowCandidate(null)).toBeNull();
  });
});

describe("chowWard", () => {
  it("gives her live share of the ward's counted votes beside her 2023 share there", () => {
    const w = ward({ "Olivia Chow": 600, "Braeden Chow": 100, "Brad Bradford": 300 });
    expect(chowWard(race, w)).toEqual({ live: 60, share2023: 21.22 });
  });

  it("has no live share before a vote is counted, but still the 2023 share", () => {
    expect(chowWard(race, ward(null))).toEqual({ live: null, share2023: 21.22 });
    expect(chowWard(null, ward(null))).toEqual({ live: null, share2023: 21.22 });
    expect(chowWard(race, ward({ "Olivia Chow": 0, "Brad Bradford": 0 }))).toEqual({ live: null, share2023: 21.22 });
  });

  it("has no live share when she isn't in the race, and is null for a ward that isn't a City ward", () => {
    const other = { candidates: [{ key: "X", candidacy_id: "can_x" }] } as unknown as LiveRace;
    expect(chowWard(other, ward({ X: 5 }))).toEqual({ live: null, share2023: 21.22 });
    expect(chowWard(race, { ...ward({ "Olivia Chow": 5 }), num: "26" })).toBeNull();
  });
});

describe("chowVs2023", () => {
  /** A mayor race whose wards have counted Chow's votes and everyone else's (ward → [Chow, others]). */
  const counted = (wards: Record<string, [number, number]>, state: LiveRace["state"] = "counting"): LiveRace =>
    ({
      ...race,
      state,
      wards: Array.from({ length: 25 }, (_, i) => {
        const num = String(i + 1);
        const [chow, others] = wards[num] ?? [0, 0];
        return { num, name: null, progress: null, votes_counted: chow + others, votes: { "Olivia Chow": chow, "Brad Bradford": others } };
      }),
    }) as unknown as LiveRace;

  it("sets each counted ward's change since 2023 against her change across the wards counted", () => {
    // Ward 1: 40% now, 27.9% in 2023; ward 13: 50% now, 54.6% in 2023. Across both: 45% now, 41.25% then.
    const vs = chowVs2023(counted({ "1": [400, 600], "13": [500, 500] }));
    expect(Object.keys(vs)).toEqual(["1", "13"]);
    expect(vs["1"]).toBeCloseTo(40 - 27.9 - 3.75, 6);
    expect(vs["13"]).toBeCloseTo(50 - 54.6 - 3.75, 6);
  });

  it("is never positive everywhere: the wards weighed by their votes counted average to zero", () => {
    const vs = chowVs2023(counted({ "1": [300, 700], "4": [1200, 800], "13": [900, 600], "20": [100, 400] }));
    const weights = { "1": 1000, "4": 2000, "13": 1500, "20": 500 } as Record<string, number>;
    const mean = Object.entries(vs).reduce((a, [n, d]) => a + weights[n] * d, 0) / 5000;
    expect(mean).toBeCloseTo(0, 9);
  });

  it("reads 0 with one ward in, still reads once every voting area is in, and is empty with none", () => {
    expect(chowVs2023(counted({ "1": [100, 900] }))["1"]).toBeCloseTo(0, 9);
    expect(Object.keys(chowVs2023(counted({ "1": [1, 1], "2": [1, 1] }, "all_units_in")))).toEqual(["1", "2"]);
    expect(chowVs2023(counted({}))).toEqual({});
    const without = { ...counted({ "1": [1, 1] }), candidates: [{ key: "X", candidacy_id: "can_x" }] } as unknown as LiveRace;
    expect(chowVs2023(without)).toEqual({});
  });
});
