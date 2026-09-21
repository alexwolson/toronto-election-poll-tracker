import forecastFixture from "../../fixtures/mayoral_forecast.json";
import { describe, expect, it } from "vitest";
import type { MayoralForecastFeed } from "@/types/feeds";
import {
  chance,
  electionDayShares,
  forecastAvailable,
  leadForecast,
  pairwiseMargin,
  residualPoolNote,
  viableField,
  winProbabilities,
} from "./mayoral-forecast";

const CHOW = "per_a4291ca7539b53e2acc1c4f108bc73e6";
const BRADFORD = "per_d8dfddfb642358e299f4b428292666bf";
const ALEXANDER = "per_345dd6a9ee645c0bb5a8ade615f91579";

function feed(): MayoralForecastFeed {
  return structuredClone(forecastFixture) as unknown as MayoralForecastFeed;
}

describe("chance", () => {
  it("rounds to whole percentages with guarded tails", () => {
    expect(chance(0.630)).toBe("63%");
    expect(chance(0.0049)).toBe("<1%");
    expect(chance(0.012)).toBe("1%");
    expect(chance(0.995)).toBe(">99%");
    expect(chance(0)).toBe("<1%");
    expect(chance(1)).toBe(">99%");
  });
});

describe("leadForecast and viableField", () => {
  it("names the favourite from the separately gated card", () => {
    expect(leadForecast(feed())).toEqual({ candidateId: CHOW, name: "Olivia Chow" });
    const withheld = feed();
    withheld.forecast_favourite = {
      ...withheld.forecast_favourite,
      availability: "Forecast Unavailable",
      candidate_id: null,
    };
    expect(leadForecast(withheld)).toBeNull();
  });
  it("keeps the viable field as the candidate_win keys", () => {
    expect(viableField(feed())).toEqual([CHOW, BRADFORD, ALEXANDER]);
  });
  it("reports availability from the favourite gate and the election-day block", () => {
    expect(forecastAvailable(feed())).toBe(true);
    const dark = feed();
    dark.election_day = null;
    expect(forecastAvailable(dark)).toBe(false);
  });
});

describe("electionDayShares", () => {
  it("returns percent-unit ranges for each named candidate and the pool, in feed order", () => {
    const view = electionDayShares(feed())!;
    expect(view.intervalMass).toBe(0.8);
    expect(view.rows.map((r) => r.name)).toEqual([
      "Olivia Chow",
      "Brad Bradford",
      "Chris Alexander",
      "Other candidates",
    ]);
    const chow = view.rows[0];
    const source = feed().election_day!.candidates[0];
    expect(chow.candidateId).toBe(CHOW);
    expect(chow.colorVar).toBe("var(--color-chow)");
    expect(chow.median).toBeCloseTo(source.median * 100, 6);
    expect(chow.lower).toBeCloseTo(source.lower * 100, 6);
    expect(chow.upper).toBeCloseTo(source.upper * 100, 6);
    expect(chow.lower).toBeLessThanOrEqual(chow.median);
    expect(chow.median).toBeLessThanOrEqual(chow.upper);
    expect(view.rows[2].hatch).toBe(true);
    const pool = view.rows[3];
    expect(pool.candidateId).toBeNull();
    expect(pool.colorVar).toBe("var(--color-disengaged)");
    expect(pool.median).toBeCloseTo(feed().election_day!.residual_pool.median * 100, 6);
  });
  it("is null when the election-day block is absent", () => {
    const dark = feed();
    dark.election_day = null;
    expect(electionDayShares(dark)).toBeNull();
  });
});

describe("pairwiseMargin", () => {
  it("names the compared pair from the feed and carries signed bins", () => {
    const view = pairwiseMargin(feed())!;
    const source = feed().election_day!.pairwise_margin;
    expect(view.leader.candidateId).toBe(CHOW);
    expect(view.leader.surname).toBe("Chow");
    expect(view.challenger.candidateId).toBe(BRADFORD);
    expect(view.challenger.surname).toBe("Bradford");
    expect(view.medianPp).toBe(source.median);
    expect(view.lowerPp).toBe(source.lower);
    expect(view.upperPp).toBe(source.upper);
    expect(view.challengerAhead).toBe(source.probability_challenger_ahead);
    expect(view.bins).toHaveLength(40);
    expect(view.bins[0]).toMatchObject({ left: -100, right: -95 });
    expect(view.bins[39]).toMatchObject({ left: 95, right: 100 });
    const total = view.bins.reduce((sum, bin) => sum + bin.probability, 0);
    expect(total).toBeCloseTo(1, 3);
    // The challenger-ahead share is the mass left of the tie, to bin resolution.
    const left = view.bins.filter((b) => b.right <= 0).reduce((s, b) => s + b.probability, 0);
    expect(Math.abs(left - view.challengerAhead)).toBeLessThan(0.02);
  });
});

describe("winProbabilities", () => {
  it("orders named candidates by probability and keeps the pool at zero", () => {
    const view = winProbabilities(feed());
    expect(view.candidates.map((c) => c.name)).toEqual([
      "Olivia Chow",
      "Brad Bradford",
      "Chris Alexander",
    ]);
    expect(view.candidates[0].probability).toBeGreaterThan(view.candidates[1].probability);
    const sum = view.candidates.reduce((s, c) => s + c.probability, 0);
    expect(sum).toBeCloseTo(1, 6);
    expect(view.pool).toEqual({ label: "Other candidates", probability: 0 });
  });
});

describe("residualPoolNote", () => {
  it("counts the pool and names the minor candidates polls reported", () => {
    expect(residualPoolNote(feed())).toBe(
      "50 certified candidates, including Sarah McVie and Odessa Paloma Parker, modelled together.",
    );
    const unnamed = feed();
    unnamed.election_day!.residual_pool.named_in_polls = [];
    expect(residualPoolNote(unnamed)).toBe("50 certified candidates, modelled together.");
  });
});
