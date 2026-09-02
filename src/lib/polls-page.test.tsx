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
