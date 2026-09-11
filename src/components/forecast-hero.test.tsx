import forecastFixture from "../../fixtures/mayoral_forecast.json";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { MayoralForecastFeed } from "@/types/feeds";
import { ForecastHero } from "./forecast-hero";

describe("ForecastHero", () => {
  it("shows the simple band without exposing internal model diagnostics", () => {
    const feed = structuredClone(forecastFixture) as MayoralForecastFeed;
    const cid = "per_a4291ca7539b53e2acc1c4f108bc73e6";
    feed.candidate_win[cid] = {
      ...feed.candidate_win[cid], availability: "Forecast Available",
      band: "70–<90%", frequency_statement: "about 4 in 5", probability: .869,
      sensitivity: { kind: "model_assumptions", lower: .74, upper: .91,
        includes_monte_carlo_error: true,
        scenarios: [{ label: "bridge-base", role: "authoritative", probability: .869 }],
      },
    };
    const html = renderToStaticMarkup(<ForecastHero feed={feed} />);
    expect(html).toContain("Wins about 4 times in 5");
    expect(html).not.toContain("Across model assumptions");
    expect(html).not.toContain("74–91%");
    expect(html).not.toContain("Compare the model checks");
    expect(html).not.toContain("simulation noise");
  });
  it("names a stable favourite when candidate probability bands are partly unavailable", () => {
    const feed = structuredClone(forecastFixture) as MayoralForecastFeed;
    Object.assign(feed, {
      forecast_favourite: {
        tier: feed.evidence_tier,
        availability: "Forecast Available",
        candidate_id: "per_a4291ca7539b53e2acc1c4f108bc73e6",
        reason: "",
      },
    });
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

    expect(html).toContain("Olivia Chow is favoured to win");
    expect(html).not.toContain("The forecast cannot name a favourite yet");
    expect(html).not.toContain("Chris Alexander is favoured to win");
    expect(html).toContain("Chris Alexander");
    expect(html).toContain("Wins less than 1 time in 10");
  });
});
