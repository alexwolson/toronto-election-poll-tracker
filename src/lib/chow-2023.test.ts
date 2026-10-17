import { describe, expect, it } from "vitest";
import { CHOW_2023, chowCandidate, chowWard } from "./chow-2023";
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
