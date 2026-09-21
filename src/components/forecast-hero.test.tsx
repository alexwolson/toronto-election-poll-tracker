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
    // 1. margin first, with the compared pair named from the feed
    expect(html).toContain('class="forecast-margin"');
    expect(html).toContain("Bradford finishes ahead of Chow");
    expect(html).toContain("Olivia Chow is favoured to win");
    expect(html).toContain("Forecast evidence through");
    expect(html.indexOf('class="forecast-margin"')).toBeLessThan(html.indexOf('class="forecast-shares"'));
    expect(html.indexOf('class="forecast-shares"')).toBeLessThan(html.indexOf('class="forecast-odds"'));
    // 2. vote ranges for the three named candidates and the pool
    expect(html).toContain("What the vote could look like");
    expect(html).toContain("Other candidates");
    expect(html).toContain("Sarah McVie");
    expect(html).toContain("central 80%");
    // 3. full-race win probabilities as whole percentages, pool guarded
    expect(html).toContain("Who wins the full race?");
    expect(html).toMatch(/Olivia Chow<\/span><strong>\d{2}%/);
    expect(html).toContain("&lt;1%");
    // the margin chart is an accessible SVG with forty bins
    expect(html).toContain("<svg");
    expect((html.match(/forecast-margin__bin/g) ?? []).length).toBe(40);
    // retired vocabulary
    for (const retired of [
      "band-board",
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
