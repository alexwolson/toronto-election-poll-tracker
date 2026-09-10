import forecastFixture from "../../fixtures/mayoral_forecast.json";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { MayoralForecastFeed } from "@/types/feeds";
import { ForecastHero } from "./forecast-hero";

describe("ForecastHero", () => {
  it("does not name a favourite when candidate forecasts are only partly available", () => {
    const feed = structuredClone(forecastFixture) as MayoralForecastFeed;
    for (const candidateId of [
      "per_a4291ca7539b53e2acc1c4f108bc73e6",
      "per_d8dfddfb642358e299f4b428292666bf",
    ]) {
      feed.candidate_win[candidateId] = {
        ...feed.candidate_win[candidateId],
        availability: "Forecast Unavailable",
        band: null,
        frequency_statement: null,
        probability: null,
        reason: "Sensitivity variants do not agree on the published band.",
      };
    }

    const html = renderToStaticMarkup(<ForecastHero feed={feed} />);

    expect(html).toContain("The forecast cannot name a favourite yet");
    expect(html).not.toContain("Chris Alexander is favoured to win");
    expect(html).toContain("Chris Alexander");
    expect(html).toContain("Wins less than 1 time in 10");
  });
});
