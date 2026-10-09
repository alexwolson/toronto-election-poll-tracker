import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import forecastFixture from "../../fixtures/mayoral_forecast.json";
import pollingFixture from "../../fixtures/mayoral_polling.json";
import Home from "@/app/page";
import type { MayoralForecastFeed, MayoralPollingFeed } from "@/types/feeds";

const mocks = vi.hoisted(() => ({
  loadMayoralForecast: vi.fn(),
  loadMayoralPolling: vi.fn(),
}));

vi.mock("@/lib/feeds", () => ({
  loadMayoralForecast: mocks.loadMayoralForecast,
  loadMayoralPolling: mocks.loadMayoralPolling,
}));

const CHOW = "per_a4291ca7539b53e2acc1c4f108bc73e6";
const BRADFORD = "per_d8dfddfb642358e299f4b428292666bf";

async function renderHome(): Promise<string> {
  mocks.loadMayoralForecast.mockResolvedValue(
    structuredClone(forecastFixture) as unknown as MayoralForecastFeed,
  );
  mocks.loadMayoralPolling.mockResolvedValue(polling());
  return renderToStaticMarkup(await Home());
}

async function render(polling: MayoralPollingFeed): Promise<string> {
  mocks.loadMayoralForecast.mockResolvedValue(
    structuredClone(forecastFixture) as unknown as MayoralForecastFeed,
  );
  mocks.loadMayoralPolling.mockResolvedValue(polling);
  const html = renderToStaticMarkup(await Home());
  const section = html.split('aria-labelledby="poll-snapshot-heading"')[1].split("</section>")[0];
  return section.replace(/<[^>]+>/g, "");
}

function polling(): MayoralPollingFeed {
  return structuredClone(pollingFixture) as unknown as MayoralPollingFeed;
}

describe("Homepage latest poll", () => {
  it("shows the latest poll's shares as reported, then its head-to-head reading for reference", async () => {
    const text = await render(polling());
    expect(text).toContain(
      "Mainstreet Research ↗, Sep 29, 2026, 1,000 respondents by interactive voice response (IVR), " +
        "decided and leaning voters: Olivia Chow 45%, Brad Bradford 38%, Chris Alexander 9%",
    );
    expect(text).toContain(
      "Mainstreet Research’s Sept. 29 poll also asked the same respondents to choose between only " +
        "Chow and Bradford. Of all respondents: Chow 47%, Bradford 41%, undecided 12%. " +
        "It is shown for reference and not counted as a separate poll.",
    );
    expect(text).not.toContain("Chow or Bradford only");
  });

  it("adds no head-to-head sentence when the latest poll has no such reading", async () => {
    const feed = polling();
    feed.head_to_head = feed.head_to_head!.map((reading) => ({ ...reading, poll_id: "pallas-2026-08-21" }));
    const text = await render(feed);
    expect(text).toContain("Mainstreet Research ↗, Sep 29, 2026");
    expect(text).not.toContain("also asked the same respondents");
    delete feed.head_to_head;
    expect(await render(feed)).not.toContain("also asked the same respondents");
  });

  it("labels a latest poll that offered only Chow or Bradford next to its denominator", async () => {
    const feed = polling();
    const latest = {
      ...feed.polls[0],
      head_to_head: true,
      shares: { [CHOW]: 0.52, [BRADFORD]: 0.44, "response:undecided": 0.04 },
      field_tested: [CHOW, BRADFORD, "response:undecided"],
    };
    feed.polls[0] = latest;
    feed.latest = latest;
    delete feed.head_to_head;
    const text = await render(feed);
    expect(text).toContain(
      "decided and leaning voters (Chow or Bradford only): Olivia Chow 52%, Brad Bradford 44%, undecided 4%.",
    );
  });
});

describe("Homepage on the way to election night", () => {
  it("leads with the election night results panel, then the final pre-election forecast", async () => {
    const html = await renderHome();
    const panel = html.indexOf(">Election night results</h2>");
    expect(panel).toBeGreaterThan(-1);
    expect(html).toContain('href="/results"');
    expect(panel).toBeLessThan(html.indexOf('id="forecast-heading"'));
    expect(html).toContain("Final pre-election forecast for election day");
  });
});
