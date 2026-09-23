import forecastFixture from "../../fixtures/mayoral_forecast.json";
import { describe, expect, it } from "vitest";
import { formatDate, isoDayNumber } from "@/lib/format";
import type { MayoralForecastFeed } from "@/types/feeds";
import {
  chance,
  electionDayShares,
  forecastAvailable,
  forecastHistorySummaryRows,
  forecastHistoryTrends,
  leadForecast,
  marginOutcomes,
  residualPoolNote,
  uncertaintyBreakdown,
  viableField,
  wholePercent,
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

describe("wholePercent", () => {
  it("prints a set-rounded whole percent, guarding the tails like chance()", () => {
    expect(wholePercent(67, 0.665875)).toBe("67%");
    expect(wholePercent(0, 0.004)).toBe("<1%");
    expect(wholePercent(0, 0)).toBe("0%");
    expect(wholePercent(100, 0.996)).toBe(">99%");
    expect(wholePercent(100, 1)).toBe("100%");
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

describe("marginOutcomes", () => {
  it("returns the three named outcomes, leader first, with feed-driven labels", () => {
    const view = marginOutcomes(feed())!;
    const source = feed().election_day!.pairwise_margin.outcomes;
    expect(view.thresholdPoints).toBe(2);
    expect(view.rows.map((r) => r.key)).toEqual(["leader_ahead", "close", "challenger_ahead"]);
    expect(view.rows.map((r) => r.label)).toEqual([
      "Chow ahead by 2 or more",
      "Within 2 points either way",
      "Bradford ahead by 2 or more",
    ]);
    expect(view.rows[0].probability).toBe(source.leader_ahead);
    expect(view.rows[1].probability).toBe(source.close);
    expect(view.rows[2].probability).toBe(source.challenger_ahead);
    expect(view.rows[0].colorVar).toBe("var(--color-chow)");
    expect(view.rows[2].colorVar).toBe("var(--color-bradford)");
    // Displayed whole percentages are rounded as a set so they add to 100 (plain rounding gives 101).
    expect(view.rows.map((r) => r.percent)).toEqual([67, 7, 26]);
    expect(view.rows.reduce((a, r) => a + r.percent, 0)).toBe(100);
    // The caption's pairwise split counts every draw by who is ahead, from the feed.
    expect(view.challengerAhead).toBe(feed().election_day!.pairwise_margin.probability_challenger_ahead);
    expect(view.leaderAhead).toBeCloseTo(1 - view.challengerAhead, 6);
  });
  it("is null when the election-day block is absent", () => {
    const dark = feed();
    dark.election_day = null;
    expect(marginOutcomes(dark)).toBeNull();
  });
});

describe("uncertaintyBreakdown", () => {
  it("returns each source on its own, then the combined row, on one axis that contains the tie", () => {
    const view = uncertaintyBreakdown(feed())!;
    const block = feed().uncertainty!;
    expect(view.leader.surname).toBe("Chow");
    expect(view.challenger.surname).toBe("Bradford");
    expect(view.rows.map((r) => r.key)).toEqual([
      "polls_today",
      "campaign_movement",
      "election_day",
      "combined",
    ]);
    expect(view.rows.map((r) => r.label)).toEqual([
      "The polls today could be off",
      `Support could shift before ${formatDate(feed().election_date)}`,
      "Results have landed away from final polls",
      "All three together: the forecast",
    ]);
    expect(view.rows.map((r) => r.combined)).toEqual([false, false, false, true]);
    expect(view.rows[1].median).toBe(block.sources[1].median);
    // Shares of the uncertainty: the three sources' add to 1, the combined row is the whole.
    expect(view.rows.slice(0, 3).map((r) => r.share)).toEqual(
      block.sources.map((s) => s.share_of_uncertainty),
    );
    expect(view.rows.slice(0, 3).reduce((a, r) => a + r.share, 0)).toBeCloseTo(1, 4);
    expect(view.rows[3].share).toBe(1);
    // Displayed shares are rounded as a set so the three sources add to 100; the combined row is 100.
    expect(view.rows.map((r) => r.sharePercent)).toEqual([9, 19, 72, 100]);
    expect(view.rows.slice(0, 3).reduce((a, r) => a + r.sharePercent, 0)).toBe(100);
    // The combined row is the published margin's own pairwise split.
    expect(view.rows[3].challengerAhead).toBe(
      feed().election_day!.pairwise_margin.probability_challenger_ahead,
    );
    const widths = view.rows.map((r) => r.upper - r.lower);
    for (const width of widths.slice(0, 3)) expect(width).toBeLessThan(widths[3]);
    expect(view.axisMin).toBeLessThan(Math.min(0, ...view.rows.map((r) => r.lower)));
    expect(view.axisMax).toBeGreaterThan(Math.max(0, ...view.rows.map((r) => r.upper)));
    expect(Math.abs(view.axisMin % 10)).toBe(0);
    expect(Math.abs(view.axisMax % 10)).toBe(0);
  });
  it("is null when the feed does not carry the block", () => {
    const plain = feed();
    delete plain.uncertainty;
    expect(uncertaintyBreakdown(plain)).toBeNull();
  });
});

describe("forecast history", () => {
  it("turns each release into one point per candidate, joined by a line, oldest first", () => {
    const f = feed();
    const trends = forecastHistoryTrends(f, [CHOW, BRADFORD, ALEXANDER])!;
    expect(trends.map((t) => t.id)).toEqual([CHOW, BRADFORD, ALEXANDER]);
    const chow = trends[0];
    expect(chow.markers).toHaveLength(7);
    expect(chow.markers.map((m) => m.x)).toEqual([...chow.markers.map((m) => m.x)].sort((a, b) => a - b));
    expect(chow.markers[0].x).toBe(isoDayNumber("2026-07-30"));
    expect(chow.markers.at(-1)?.y).toBe(f.candidate_win[CHOW].probability);
    expect(chow.markers[0].poll_id).toBe("forum-2026-07-29");
    // The line runs through the points themselves; nothing is smoothed.
    expect(chow.curve).toEqual(chow.markers.map(({ x, y }) => ({ x, y })));
  });
  it("is null when the feed carries no history", () => {
    const f = feed();
    delete f.history;
    expect(forecastHistoryTrends(f, [CHOW])).toBeNull();
  });
  it("summarizes each candidate's first and latest chance for screen readers", () => {
    const f = feed();
    const rows = forecastHistorySummaryRows(f, [{ id: CHOW, name: "Olivia Chow" }]);
    expect(rows).toEqual([
      "Olivia Chow: 68.5% after the poll published Jul 30, 2026; 70.4% after the latest, published Sep 22, 2026; 7 releases.",
    ]);
  });
});
