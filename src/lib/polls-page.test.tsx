import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import forecastFixture from "../../fixtures/mayoral_forecast.json";
import pollingFixture from "../../fixtures/mayoral_polling.json";
import PollsPage from "@/app/polls/page";
import type { MayoralForecastFeed, MayoralPollingFeed } from "@/types/feeds";

const mocks = vi.hoisted(() => ({
  loadMayoralForecast: vi.fn(),
  loadMayoralPolling: vi.fn(),
}));

vi.mock("@/lib/feeds", () => ({
  loadMayoralForecast: mocks.loadMayoralForecast,
  loadMayoralPolling: mocks.loadMayoralPolling,
}));

describe("Polls page", () => {
  it("explains the common basis, identifies excluded polls and preserves the source archive", async () => {
    const polling = structuredClone(pollingFixture) as unknown as MayoralPollingFeed;
    const chow = "per_a4291ca7539b53e2acc1c4f108bc73e6";
    const bradford = "per_d8dfddfb642358e299f4b428292666bf";
    const alexander = "per_345dd6a9ee645c0bb5a8ade615f91579";
    polling.polls = [{ ...polling.polls[0], firm: "Ipsos", denominator: "All respondents",
      shares: { [chow]: 0.36, [bradford]: 0.21, [alexander]: 0.04,
        "response:other": 0.05, "response:undecided": 0.3, "response:would_not_vote": 0.03 },
    }, { ...polling.polls[1], firm: "Unknown basis firm", denominator: "Not stated" }];
    mocks.loadMayoralForecast.mockResolvedValue(forecastFixture);
    mocks.loadMayoralPolling.mockResolvedValue(polling);
    const html = renderToStaticMarkup(await PollsPage());
    expect(html).toContain("Support among respondents naming a candidate");
    expect(html).toContain("derived and published percentages");
    expect(html).toContain("1 poll is excluded");
    expect(html).toContain("Unknown basis firm");
    expect(html).toContain("54.5%");
    expect(html).toMatch(/data-label="Olivia Chow"[^>]*>36%/);
    expect(html).toContain("All respondents");
    expect(html).toContain("Forecast history summary");
    expect(html).toContain("Alexander included");
  });
  it("shows one empty state without empty archive or source scaffolding", async () => {
    const polling = structuredClone(pollingFixture) as unknown as MayoralPollingFeed;
    polling.polls = [];
    polling.latest = null;
    mocks.loadMayoralForecast.mockResolvedValue(
      forecastFixture as unknown as MayoralForecastFeed,
    );
    mocks.loadMayoralPolling.mockResolvedValue(polling);

    const html = renderToStaticMarkup(await PollsPage());

    expect(html).toContain("No public mayoral polls are available yet.");
    expect(html).not.toContain("Polling support over time");
    expect(html).not.toContain("Poll archive");
    expect(html).not.toContain("Pollsters in the archive");
  });
});
