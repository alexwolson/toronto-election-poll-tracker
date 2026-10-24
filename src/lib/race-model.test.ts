import { describe, expect, it } from "vitest";
import type { LiveBand, LiveCandidate, LiveRace } from "@/types/live";
import { catchUp, contenders, promotionReasons, raceColours, type EditorialRace } from "./race-model";

function cand(name: string, votes: number | null, extra: Partial<LiveCandidate> = {}): LiveCandidate {
  return { key: name, full_name: name, short_label: name.split(" ").pop()!, candidacy_id: `can_${name}`, candidate_id: null, votes, share: null, ...extra };
}

function race(cands: LiveCandidate[], bands: Record<string, LiveBand> | null = null, extra: Partial<LiveRace> = {}): LiveRace {
  const total = cands.reduce((a, c) => a + (c.votes ?? 0), 0);
  return {
    id: "councillor-4",
    level: "council",
    num: "4",
    name: "Parkdale-High Park",
    state: "counting",
    progress: { received: 60, total: 67 },
    candidates: cands.map((c) => ({ ...c, share: total ? (100 * (c.votes ?? 0)) / total : 0 })),
    projection: bands ? { stub: false, bands: { count_only: bands }, shown: "count_only" } : null,
    possible: null,
    withdrawal: null,
    fault: null,
    ...extra,
  };
}

const band = (low: number, mid: number, high: number): LiveBand => ({ low, mid, high });
const contest: EditorialRace = { type: "contest", featured: ["Nadia Guerrera", "Diana Chan McNally", "Debbie King"] };

describe("contenders", () => {
  it("is a contest's featured three, leader included, in count order", () => {
    const r = race([cand("Nadia Guerrera", 9140), cand("Diana Chan McNally", 7937), cand("Debbie King", 6915), cand("Vanessa Raponi", 706)]);
    expect(contenders(r, contest).map((c) => c.full_name)).toEqual(["Nadia Guerrera", "Diana Chan McNally", "Debbie King"]);
  });

  it("keeps a leader the editor didn't feature, and stays at three", () => {
    const r = race([cand("Vanessa Raponi", 9999), cand("Nadia Guerrera", 9140), cand("Diana Chan McNally", 7937), cand("Debbie King", 6915)]);
    expect(contenders(r, contest).map((c) => c.full_name)).toEqual(["Vanessa Raponi", "Nadia Guerrera", "Diana Chan McNally"]);
  });

  it("is the top two in any other race", () => {
    const r = race([cand("A B", 50), cand("C D", 40), cand("E F", 30)]);
    expect(contenders(r, { type: "incumbent", featured: ["A B"] }).map((c) => c.full_name)).toEqual(["A B", "C D"]);
  });
});

describe("promotionReasons", () => {
  it("is empty for a race going as the editor expected", () => {
    const r = race([cand("Ausma Malik", 5695), cand("Ian Cunningham", 3200)], { "Ausma Malik": band(35, 37, 39), "Ian Cunningham": band(19, 21, 22) });
    expect(promotionReasons(r, { type: "incumbent", featured: ["Ausma Malik"] })).toEqual([]);
  });

  it("names an incumbent who isn't leading", () => {
    const r = race([cand("Ian Cunningham", 5695), cand("Ausma Malik", 3200)], null);
    expect(promotionReasons(r, { type: "incumbent", featured: ["Ausma Malik"] })).toContain("Incumbent Malik is not leading");
  });

  it("flags overlapping ranges between the top two", () => {
    const r = race([cand("Frances Nunziata", 7336), cand("Chiara Padovani", 7229)], { "Frances Nunziata": band(46, 48, 49), "Chiara Padovani": band(45, 47, 48) });
    expect(promotionReasons(r, { type: "head", featured: ["Frances Nunziata", "Chiara Padovani"] })).toEqual(["The top two’s estimated ranges overlap"]);
  });

  it("in a contest, flags second and third overlapping even when first is clear", () => {
    const r = race([cand("Nadia Guerrera", 9000), cand("Diana Chan McNally", 7000, { short_label: "Chan McNally" }), cand("Debbie King", 6900)], {
      "Nadia Guerrera": band(36, 38, 40),
      "Diana Chan McNally": band(28, 29.5, 31),
      "Debbie King": band(27.5, 29, 30.5),
    });
    expect(promotionReasons(r, contest)).toEqual(["Chan McNally’s and King’s estimated ranges overlap"]);
  });

  it("ignores ranges under a Withdrawal and falls back to the counted gap", () => {
    const r = race([cand("A B", 5000), cand("C D", 4990)], null, { withdrawal: { reason: "check" } });
    expect(promotionReasons(r, { type: "incumbent", featured: ["A B"] })).toEqual(["Under 2 points apart"]);
  });

  it("never promotes before a vote is counted, or an acclaimed race", () => {
    expect(promotionReasons(race([cand("A B", 0), cand("C D", 0)]), { type: "incumbent", featured: ["C D"] })).toEqual([]);
    expect(promotionReasons(race([cand("A B", 2752)], null, { state: "acclaimed" }), { type: "acclaimed", featured: ["A B"] })).toEqual([]);
  });
});

describe("catchUp", () => {
  it("estimates votes left at the average size of the areas counted, and what second needs", () => {
    // 60 of 67 areas, 25,906 votes: 7 areas × 431.77 ≈ 3,022 left; lead 1,203.
    const r = race([cand("Nadia Guerrera", 9140), cand("Diana Chan McNally", 7937), cand("Debbie King", 6915), cand("Others", 1914)]);
    const cu = catchUp(r)!;
    expect(Math.round(cu.votesLeft)).toBe(3022);
    expect(cu.left).toBe(7);
    expect(Math.round(cu.need * 100)).toBe(70);
    expect(cu.out).toBe(false);
  });

  it("says when the gap is bigger than what's left", () => {
    const r = race([cand("A B", 10000), cand("C D", 2000)], null, { progress: { received: 66, total: 67 } });
    expect(catchUp(r)!.out).toBe(true);
  });

  it("is null with nothing counted, no second candidate, or no progress", () => {
    expect(catchUp(race([cand("A B", 0), cand("C D", 0)]))).toBeNull();
    expect(catchUp(race([cand("A B", 10)]))).toBeNull();
    expect(catchUp(race([cand("A B", 10), cand("C D", 5)], null, { progress: null }))).toBeNull();
  });

  it("treats more areas received than listed as none left", () => {
    const cu = catchUp(race([cand("A B", 100), cand("C D", 90)], null, { progress: { received: 70, total: 67 } }))!;
    expect(cu.left).toBe(0);
    expect(cu.out).toBe(true);
  });
});

describe("raceColours", () => {
  it("gives uncoloured contenders distinct fallbacks, never a colour already in the race", () => {
    const r = race([cand("A B", 50), cand("C D", 40), cand("E F", 30), cand("G H", 5)]);
    const colours = raceColours(r, [r.candidates[0], r.candidates[1], r.candidates[2]], () => null);
    const top = ["A B", "C D", "E F"].map((k) => colours[k]);
    expect(new Set(top).size).toBe(3);
    expect(colours["G H"]).toBe("var(--color-disengaged)");
  });

  it("keeps campaign colours and steers fallbacks around them", () => {
    const r = race([cand("A B", 50), cand("C D", 40)]);
    const colours = raceColours(r, r.candidates, (c) => (c.full_name === "A B" ? "#274490" : null));
    expect(colours["A B"]).toBe("#274490");
    expect(colours["C D"]).not.toBe("#274490");
  });
});
