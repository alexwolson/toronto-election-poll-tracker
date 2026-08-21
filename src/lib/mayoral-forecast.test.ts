import { describe, expect, it } from "vitest";
import forecastFixture from "../../fixtures/mayoral_forecast.json";
import type { ForecastQuantityCard, MayoralForecastFeed } from "@/types/feeds";
import {
  agnosticQuantities,
  evidenceBasisLine,
  frequencyWithUnit,
  incumbentDefeat,
  leadForecast,
  publishedCandidateWins,
  viableField,
} from "./mayoral-forecast";

const feed = forecastFixture as unknown as MayoralForecastFeed;

function card(overrides: Partial<ForecastQuantityCard>): ForecastQuantityCard {
  return {
    quantity: "challenger_win",
    candidate_id: null,
    tier: "M3 — Replicated Final-Field Polling",
    availability: "Forecast Available",
    band: "10–<30%",
    frequency_statement: "about 1 in 5",
    probability: 0.2,
    reason: "",
    ...overrides,
  };
}

describe("published candidate wins", () => {
  it("returns every published candidate, ordered by probability descending", () => {
    const wins = publishedCandidateWins(feed);
    expect(wins.map((w) => w.candidateId)).toEqual([
      "chow",
      "bradford",
      "alexander",
    ]);
  });

  it("hides a candidate whose win is withheld (Q11: withheld are hidden)", () => {
    const withheld: MayoralForecastFeed = {
      ...feed,
      candidate_win: {
        chow: card({
          candidate_id: "chow",
          availability: "Forecast Unavailable",
          band: null,
          frequency_statement: null,
          probability: null,
          reason: "variant disagreement",
        }),
        bradford: card({ candidate_id: "bradford", probability: 0.16 }),
      },
    };
    expect(publishedCandidateWins(withheld).map((w) => w.candidateId)).toEqual([
      "bradford",
    ]);
  });
});

describe("lead forecast", () => {
  it("is the favourite with a band and frequency phrase — never a raw number", () => {
    const lead = leadForecast(feed);
    expect(lead).not.toBeNull();
    expect(lead!.candidateId).toBe("chow");
    expect(lead!.name).toBe("Olivia Chow");
    expect(lead!.band).toBe("70–<90%");
    expect(lead!.frequencyStatement).toBe("about 4 times in 5");
  });

  it("is null when nothing is published", () => {
    const dark: MayoralForecastFeed = {
      ...feed,
      candidate_win: {
        chow: card({
          candidate_id: "chow",
          availability: "Forecast Unavailable",
          band: null,
          frequency_statement: null,
          probability: null,
        }),
      },
    };
    expect(leadForecast(dark)).toBeNull();
  });
});

describe("incumbent defeat", () => {
  it("pairs the published incumbent-defeat with the incumbent, labelled by name", () => {
    const d = incumbentDefeat(feed);
    expect(d).not.toBeNull();
    expect(d!.candidateId).toBe("chow");
    expect(d!.name).toBe("Olivia Chow");
    expect(d!.label).toBe("Chance Olivia Chow loses to any candidate");
    expect(d!.frequencyStatement).toBe("about 1 time in 5");
  });

  it("is null when its gate fails or the race is open", () => {
    const withheld: MayoralForecastFeed = {
      ...feed,
      incumbent_defeat: card({
        quantity: "incumbent_defeat",
        availability: "Forecast Unavailable",
        band: null,
        frequency_statement: null,
        probability: null,
      }),
    };
    expect(incumbentDefeat(withheld)).toBeNull();
    expect(incumbentDefeat({ ...feed, incumbent_candidate_id: null })).toBeNull();
  });
});

describe("agnostic quantities", () => {
  it("excludes incumbent-defeat and hides the withheld close-result", () => {
    // certified fixture: close_result is withheld -> nothing candidate-agnostic
    expect(agnosticQuantities(feed)).toEqual([]);
  });

  it("shows close-result (only) when it publishes", () => {
    const published: MayoralForecastFeed = {
      ...feed,
      close_result: card({
        quantity: "close_result",
        band: "10–<30%",
        frequency_statement: "about 1 in 5",
        probability: 0.2,
      }),
    };
    const a = agnosticQuantities(published);
    expect(a.map((q) => q.key)).toEqual(["close_result"]);
    expect(a[0].frequencyStatement).toBe("about 1 time in 5");
  });
});

describe("frequencyWithUnit (display wording, ADR 0006 bands stay canonical)", () => {
  it("pluralizes a count above one", () => {
    expect(frequencyWithUnit("about 4 in 5")).toBe("about 4 times in 5");
    expect(frequencyWithUnit("about 2 in 5")).toBe("about 2 times in 5");
    expect(frequencyWithUnit("about 9 in 10")).toBe("about 9 times in 10");
  });

  it("uses the singular for a count of one", () => {
    expect(frequencyWithUnit("about 1 in 5")).toBe("about 1 time in 5");
    expect(frequencyWithUnit("less than 1 in 10")).toBe("less than 1 time in 10");
  });

  it("passes empty or non-matching statements through unchanged", () => {
    expect(frequencyWithUnit("")).toBe("");
    expect(frequencyWithUnit("about even")).toBe("about even");
  });
});

describe("viable field", () => {
  it("is the candidate_win keys", () => {
    expect(new Set(viableField(feed))).toEqual(
      new Set(["chow", "bradford", "alexander"]),
    );
  });
});

describe("evidence-basis line", () => {
  it("translates each tier to plain language without exposing the M-code", () => {
    for (const tier of [
      "M1 — Pre-Final Polling",
      "M2 — Final-Field Polling",
      "M3 — Replicated Final-Field Polling",
    ]) {
      const line = evidenceBasisLine(tier);
      expect(line.length).toBeGreaterThan(0);
      expect(line).not.toMatch(/\bM[0-3]\b/);
    }
  });
});
