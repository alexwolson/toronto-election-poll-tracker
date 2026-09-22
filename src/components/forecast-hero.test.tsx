import forecastFixture from "../../fixtures/mayoral_forecast.json";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { MayoralForecastFeed } from "@/types/feeds";
import { ForecastHero } from "./forecast-hero";

function feed(): MayoralForecastFeed {
  return structuredClone(forecastFixture) as unknown as MayoralForecastFeed;
}

describe("ForecastHero", () => {
  it("renders the margin-first hierarchy from the joint draws, names driven by the feed", () => {
    const html = renderToStaticMarkup(<ForecastHero feed={feed()} asOfDate="2026-09-17" />);
    // 1. margin first: three named outcomes with their percentages, the pair named from the feed
    expect(html).toContain('class="forecast-margin"');
    expect(html).toContain("How far apart Chow and Bradford are likely to finish");
    expect(html).toContain("Chow ahead by 2 or more");
    expect(html).toContain("Within 2 points either way");
    expect(html).toContain("Bradford ahead by 2 or more");
    // one chart grammar for all three views: 3 outcome rows + 4 vote-range rows + 4 uncertainty rows
    expect((html.match(/forecast-chart__row(?!--)/g) ?? []).length).toBe(11);
    expect((html.match(/forecast-chart__row--combined/g) ?? []).length).toBe(1);
    expect((html.match(/forecast-chart--outcomes/g) ?? []).length).toBe(1);
    expect((html.match(/forecast-chart--shares/g) ?? []).length).toBe(1);
    expect((html.match(/forecast-chart--uncertainty/g) ?? []).length).toBe(1);
    expect(html).not.toContain("forecast-outcomes__");
    expect(html).not.toContain("forecast-shares__");
    expect(html).not.toContain("forecast-uncertainty__");
    expect(html).toMatch(/Chow finishes ahead of Bradford in \d{2}% of simulated elections\./);
    expect(html).toContain("Olivia Chow is favoured to win");
    expect(html).toContain("Evidence through");
    expect(html).toContain("Forecast for election day, Oct 26, 2026.");
    expect(html).not.toContain("forecast-kicker");
    expect(html.indexOf('class="forecast-margin"')).toBeLessThan(html.indexOf('class="forecast-tabs"'));
    // 2. beneath the margin chart, two views of the same simulations as real tabs
    expect(html).toContain('role="tablist"');
    expect((html.match(/role="tab"/g) ?? []).length).toBe(2);
    expect(html).toMatch(/aria-selected="true"[^>]*>What the vote could look like/);
    expect(html).toMatch(/aria-selected="false"[^>]*>Where the uncertainty comes from/);
    expect((html.match(/role="tabpanel"/g) ?? []).length).toBe(2);
    expect((html.match(/role="tabpanel"[^>]*hidden/g) ?? []).length).toBe(1);
    // 2a. vote ranges for the three named candidates and the pool, visible first
    expect(html).toContain("Other candidates");
    expect(html).toContain("Sarah McVie");
    expect(html).toContain("the middle 80%");
    // 2b. where the uncertainty comes from: three widening ranges (ADR 0056)
    expect(html).toContain("The polls today could be off");
    expect(html).toContain("Results have landed away from final polls");
    expect(html).toContain("All three together: the forecast");
    expect(html).toContain("share of the uncertainty");
    expect(html).toContain("the three add up to 100%");
    // 3. the full-race win list is retired
    expect(html).not.toContain("Who wins the full race?");
    expect(html).not.toContain("forecast-odds");
    expect(html).not.toContain("that chance is shown below");
    // a feed without the block shows the vote ranges as a plain section and no tabs
    const plain = feed();
    delete plain.uncertainty;
    const plainHtml = renderToStaticMarkup(<ForecastHero feed={plain} />);
    expect(plainHtml).toContain('class="forecast-shares"');
    expect(plainHtml).toContain("What the vote could look like");
    expect(plainHtml).not.toContain('role="tablist"');
    expect(plainHtml).not.toContain("forecast-chart--uncertainty");
    expect(plainHtml).not.toContain("The polls today could be off");
    expect((plainHtml.match(/forecast-chart__row/g) ?? []).length).toBe(7);
    // no histogram any more
    expect(html).not.toContain("forecast-margin__bin");
    // retired vocabulary
    for (const retired of [
      "band-board",
      "← Bradford ahead",
      "times in",
      "Across model assumptions",
      "Close result",
      "Landslide",
      "R-hat",
      "divergen",
    ]) {
      expect(html).not.toContain(retired);
    }
  });

  it("falls back to an honest note when the favourite is withheld or the block is missing", () => {
    const dark = feed();
    dark.forecast_favourite = {
      ...dark.forecast_favourite,
      availability: "Forecast Unavailable",
      candidate_id: null,
    };
    dark.election_day = null;
    const html = renderToStaticMarkup(<ForecastHero feed={dark} />);
    expect(html).toContain("The forecast isn’t available yet");
    expect(html).not.toContain('class="forecast-margin"');
  });
});
