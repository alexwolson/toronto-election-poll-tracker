import { describe, expect, it } from "vitest";
import {
  getPollBreakdown,
  getRaceStatusCounts,
  getRaceTakeaway,
  partitionCandidateRoster,
} from "./site-view-models";

describe("getPollBreakdown", () => {
  it("derives the current 2 + 7 + 13 = 22 snapshot", () => {
    const polls = [
      ...Array.from({ length: 2 }, () => ({
        use: "current_average" as const,
      })),
      ...Array.from({ length: 7 }, () => ({
        use: "head_to_head" as const,
      })),
      ...Array.from({ length: 13 }, () => ({
        use: "different_candidate_field" as const,
      })),
    ];

    expect(getPollBreakdown(polls, 22)).toEqual({
      currentField: 2,
      headToHead: 7,
      differentField: 13,
      other: 0,
      total: 22,
    });
  });

  it("groups unknown reasons and missing history under Other without losing the total", () => {
    const result = getPollBreakdown(
      [
        { use: "current_average" },
        { use: "other" },
      ],
      3
    );

    expect(result.other).toBe(2);
    expect(result.currentField + result.headToHead + result.differentField + result.other).toBe(
      result.total
    );
  });
});

describe("getRaceStatusCounts", () => {
  it("counts only the v3 evidence assessment and preserves 14 + 9 + 2 = 25", () => {
    const wards = [
      ...Array.from({ length: 14 }, () => ({ race_class: "safe" as const })),
      ...Array.from({ length: 9 }, () => ({ race_class: "competitive" as const })),
      ...Array.from({ length: 2 }, () => ({ race_class: "open" as const })),
    ];

    expect(getRaceStatusCounts(wards)).toEqual({
      safe: 14,
      competitive: 9,
      open: 2,
      total: 25,
    });
  });
});

describe("partitionCandidateRoster", () => {
  it("features the current field without duplicating it in remaining groups", () => {
    const candidate = (id: string) => ({ id, name: id, summary: "" });
    const result = partitionCandidateRoster(
      {
        declared: [candidate("alexander"), candidate("chow"), candidate("other"), candidate("bradford")],
        potential: [],
        declined: [candidate("declined")],
      },
      ["chow", "bradford", "alexander"]
    );

    expect(result.featured.map((item) => item.id)).toEqual([
      "chow",
      "bradford",
      "alexander",
    ]);
    expect(result.remainingDeclared.map((item) => item.id)).toEqual(["other"]);
    expect(result.potential).toEqual([]);
    expect(result.declined.map((item) => item.id)).toEqual(["declined"]);
  });
});

describe("getRaceTakeaway", () => {
  it("derives the leader, challenger, and Alexander share of combined support", () => {
    const result = getRaceTakeaway({
      candidates: { chow: 0.47, bradford: 0.37, alexander: 0.1 },
      currentFieldPollCount: 2,
      latestPollDate: "2026-08-07",
    });

    expect(result.leader).toEqual({ id: "chow", share: 0.47 });
    expect(result.leadingChallenger).toEqual({ id: "bradford", share: 0.37 });
    expect(result.alexanderCombinedShare).toBeCloseTo(0.1 / 0.47);
  });
});
