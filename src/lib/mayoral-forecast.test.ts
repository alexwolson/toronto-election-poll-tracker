import { describe, expect, it } from "vitest";
import forecastFixture from "../../fixtures/mayoral_forecast.json";
import type { ForecastQuantityCard, MayoralForecastFeed } from "@/types/feeds";
import {
  agnosticQuantities,
  evidenceBasisLine,
  frequencyWithUnit,
  incumbentDefeat,
  leadForecast,
  marginDistribution,
  publishedCandidateWins,
  viableField,
} from "./mayoral-forecast";

const feed = forecastFixture as unknown as MayoralForecastFeed;
const CHOW = "per_a4291ca7539b53e2acc1c4f108bc73e6";
const BRADFORD = "per_d8dfddfb642358e299f4b428292666bf";
const ALEXANDER = "per_345dd6a9ee645c0bb5a8ade615f91579";

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
      CHOW,
      BRADFORD,
      ALEXANDER,
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
    expect(lead!.candidateId).toBe(CHOW);
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
    expect(d!.candidateId).toBe(CHOW);
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
  it("excludes incumbent-defeat and hides a withheld close-result", () => {
    const withheld = {
      ...feed,
      close_result: card({
        quantity: "close_result",
        availability: "Forecast Unavailable",
        band: null,
        frequency_statement: null,
        probability: null,
      }),
    };
    expect(agnosticQuantities(withheld)).toEqual([]);
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

describe("margin distribution", () => {
  const published: MayoralForecastFeed = {
    ...feed,
    close_result: card({
      quantity: "close_result",
      band: "10–<30%",
      frequency_statement: "about 1 in 5",
      probability: 0.2,
    }),
    margin_distribution: {
      unit: "share_gap",
      x: [0, 0.05, 0.1, 0.2],
      density: [1, 3, 2, 0.5],
      close_threshold: 0.05,
      by_winner: {
        [CHOW]: { density: [0.7, 2, 1.4, 0.3], draw_weight: 3 },
        [BRADFORD]: { density: [0.3, 1, 0.6, 0.2], draw_weight: 1 },
      },
    },
  };

  it("is null when close_result is withheld", () => {
    const withheld = {
      ...feed,
      close_result: card({
        quantity: "close_result",
        availability: "Forecast Unavailable",
        band: null,
        frequency_statement: null,
        probability: null,
      }),
    };
    expect(marginDistribution(withheld)).toBeNull();
  });

  it("maps the feed to a pp-scaled, marker-annotated view when published", () => {
    const view = marginDistribution(published)!;
    expect(view.points[1].pp).toBeCloseTo(5);
    expect(view.points[1].density).toBe(3);
    expect(view.closeThresholdPp).toBeCloseTo(5);
    expect(view.segments.map((segment) => segment.id)).toEqual([CHOW, BRADFORD]);
    // all seven past races, closest first (the reference scale)
    expect(view.markers).toHaveLength(7);
    expect(view.markers[0].year).toBe(2023);
    const margins = view.markers.map((m) => m.marginPp);
    expect(margins).toEqual([...margins].sort((a, b) => a - b));
  });

  it("re-checks the gate: no view if the shape rides on a withheld close_result", () => {
    const withheld = card({
      quantity: "close_result",
      availability: "Forecast Unavailable",
      band: null,
      frequency_statement: null,
      probability: null,
    });
    expect(marginDistribution({ ...published, close_result: withheld })).toBeNull();
  });

  it("splits the density into weighted margin bands, Close cut at the feed threshold", () => {
    const view = marginDistribution(published)!;
    expect(view.bands.map((b) => b.name)).toEqual([
      "Close",
      "Clear win",
      "Comfortable",
      "Landslide",
    ]);
    // the Close band ends exactly at the model's published close threshold (5 pts)
    expect(view.bands[0].loPp).toBe(0);
    expect(view.bands[0].hiPp).toBeCloseTo(5);
    expect(view.bands[1].loPp).toBeCloseTo(5);
    // weight is ordinal: non-negative, normalized so the likeliest band is 1
    expect(Math.max(...view.bands.map((b) => b.weight))).toBe(1);
    view.bands.forEach((b) => expect(b.weight).toBeGreaterThanOrEqual(0));
    // this density piles up just past the threshold -> Clear win carries the most
    const top = view.bands.reduce((a, b) => (b.weight > a.weight ? b : a));
    expect(top.name).toBe("Clear win");
  });

  it("keeps winner bands on the aggregate scale", () => {
    const view = marginDistribution(published)!;
    const chow = view.segments[0];
    const bradford = view.segments[1];
    expect(Math.max(...view.bands.map((band) => band.weight))).toBe(1);
    chow.bands.forEach((band, index) => {
      expect(band.weight).toBeLessThanOrEqual(view.bands[index].weight);
    });
    bradford.bands.forEach((band, index) => {
      expect(band.weight).toBeLessThanOrEqual(view.bands[index].weight);
      expect(chow.bands[index].weight + band.weight).toBeCloseTo(
        view.bands[index].weight,
      );
    });
  });

  it("discovers Alexander and Other automatically when they have winning draws", () => {
    const future: MayoralForecastFeed = {
      ...published,
      candidate_win: {
        ...published.candidate_win,
        [ALEXANDER]: card({ candidate_id: ALEXANDER, probability: 0.01 }),
      },
      margin_distribution: {
        ...published.margin_distribution!,
        by_winner: {
          ...published.margin_distribution!.by_winner,
          [ALEXANDER]: { density: [0.01, 0.01, 0.01, 0.01], draw_weight: 2 },
          other: { density: [0.01, 0.01, 0.01, 0.01], draw_weight: 1 },
        },
      },
    };
    const view = marginDistribution(future)!;
    expect(view.segments.map((segment) => segment.id)).toEqual([
      CHOW,
      BRADFORD,
      ALEXANDER,
      "other",
    ]);
    expect(view.segments.map((segment) => segment.label)).toEqual([
      "Chow wins",
      "Bradford wins",
      "Alexander wins",
      "Other candidate wins",
    ]);
    expect(view.segments.find((segment) => segment.id === ALEXANDER)?.hatch).toBe(true);
  });

  it("falls back to the aggregate when winner decomposition is absent or malformed", () => {
    const legacy = {
      ...published,
      margin_distribution: {
        ...published.margin_distribution!,
        by_winner: undefined,
      },
    };
    expect(marginDistribution(legacy)!.segments.map((segment) => segment.id)).toEqual([
      "all",
    ]);

    const malformed = {
      ...published,
      margin_distribution: {
        ...published.margin_distribution!,
        by_winner: {
          [CHOW]: { density: [1, 2], draw_weight: 3 },
          [BRADFORD]: { density: [0.3, Number.NaN, 0.6, 0.2], draw_weight: 1 },
        },
      },
    };
    expect(marginDistribution(malformed)!.segments.map((segment) => segment.id)).toEqual([
      "all",
    ]);
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
      new Set([CHOW, BRADFORD, ALEXANDER]),
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
