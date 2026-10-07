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
  it("adds minor candidate dots without narrowing the recent polls or inventing forecast history", async () => {
    const forecast = structuredClone(forecastFixture) as unknown as MayoralForecastFeed;
    const polling = structuredClone(pollingFixture) as unknown as MayoralPollingFeed;
    const [chow, bradford, alexander] = [
      "per_a4291ca7539b53e2acc1c4f108bc73e6",
      "per_d8dfddfb642358e299f4b428292666bf",
      "per_345dd6a9ee645c0bb5a8ade615f91579",
    ];
    const mcvie = "per_95cd5c92c035574ab823643b45e8a5ae";
    const parker = "per_56060d2725565733b8f3a78855fc0c25";
    forecast.election_day!.residual_pool.named_in_polls = [
      { candidate_id: mcvie, display_name: "Sarah McVie", latest_polled_share: 0.024, poll_id: "latest" },
      { candidate_id: parker, display_name: "Odessa Paloma Parker", latest_polled_share: 0.021, poll_id: "latest" },
    ];
    const reading = { ...polling.polls[0], denominator: "Decided and leaning voters",
      shares: { [chow]: 0.454, [bradford]: 0.383, [alexander]: 0.085 } };
    polling.polls = [
      { ...reading, poll_id: "latest", date_conducted: "2026-09-29",
        shares: { ...reading.shares, [mcvie]: 0.024, [parker]: 0.021, "response:other": 0.033 } },
      { ...reading, poll_id: "three-names", date_conducted: "2026-09-27" },
      { ...reading, poll_id: "first", date_conducted: "2026-09-17",
        shares: { ...reading.shares, [mcvie]: 0.025, [parker]: 0.019, "response:other": 0.024 } },
    ];
    mocks.loadMayoralForecast.mockResolvedValue(forecast);
    mocks.loadMayoralPolling.mockResolvedValue(polling);
    const html = renderToStaticMarkup(await PollsPage());
    const support = html.split('aria-labelledby="trend-heading"')[1].split('</section>')[0];
    const history = html.split('aria-labelledby="forecast-history-heading"')[1].split('</section>')[0];
    expect(support).toContain("3 polls");
    expect(support).toContain("Sarah McVie: 2 polls shown, from 2.5%");
    expect(support).toContain("to 2.4%");
    expect(support).toContain("Odessa Paloma Parker: 2 polls shown, from 1.9%");
    expect(support).toContain("to 2.1%");
    expect(support).toContain("Only reported points are shown, without a trend line.");
    expect(history).not.toContain("McVie");
    expect(history).not.toContain("Parker");
  });

  it("shows post-exit polls reporting only Chow and Bradford by default, and ends Alexander's line at his last poll", async () => {
    const forecast = structuredClone(forecastFixture) as unknown as MayoralForecastFeed;
    const polling = structuredClone(pollingFixture) as unknown as MayoralPollingFeed;
    const [chow, bradford, alexander] = [
      "per_a4291ca7539b53e2acc1c4f108bc73e6",
      "per_d8dfddfb642358e299f4b428292666bf",
      "per_345dd6a9ee645c0bb5a8ade615f91579",
    ];
    const reading = { ...polling.polls[0], denominator: "Decided and leaning voters" };
    polling.polls = [
      // after Oct. 6, the poll's own record offers only Chow or Bradford
      { ...reading, poll_id: "post-exit-head-to-head", date_conducted: "2026-10-09", date_published: "2026-10-10",
        head_to_head: true, shares: { [chow]: 0.54, [bradford]: 0.46 }, field_tested: [chow, bradford] },
      // after Oct. 6, a full-field question that no longer names Alexander
      { ...reading, poll_id: "post-exit-full-field", date_conducted: "2026-10-08", date_published: "2026-10-09",
        shares: { [chow]: 0.5, [bradford]: 0.44, "response:other": 0.06 } },
      // before Oct. 6 and after the nomination deadline: all three, as before
      { ...reading, poll_id: "pre-exit", date_conducted: "2026-09-29",
        shares: { [chow]: 0.454, [bradford]: 0.383, [alexander]: 0.085 } },
      // fieldwork ending on nomination day stays out of the default view
      { ...reading, poll_id: "nomination-day", date_conducted: "2026-08-21",
        shares: { [chow]: 0.5, [bradford]: 0.39, [alexander]: 0.08 } },
    ];
    polling.latest = polling.polls[0];
    delete polling.head_to_head;
    mocks.loadMayoralForecast.mockResolvedValue(forecast);
    mocks.loadMayoralPolling.mockResolvedValue(polling);
    const html = renderToStaticMarkup(await PollsPage());
    const support = html.split('aria-labelledby="trend-heading"')[1].split("</section>")[0];
    expect(support).toContain("3 polls since nominations closed.");
    expect(support).toContain("Olivia Chow: 3 polls shown");
    expect(support).toContain("Brad Bradford: 3 polls shown");
    // His line ends at the last poll that reported him; nothing is inferred after it.
    expect(support).toContain("Chris Alexander: 1 poll shown at 8.5%");
  });

  it("explains the common basis, identifies excluded polls and preserves the source archive", async () => {
    const polling = structuredClone(pollingFixture) as unknown as MayoralPollingFeed;
    const chow = "per_a4291ca7539b53e2acc1c4f108bc73e6";
    const bradford = "per_d8dfddfb642358e299f4b428292666bf";
    const alexander = "per_345dd6a9ee645c0bb5a8ade615f91579";
    polling.polls = [{ ...polling.polls[0], firm: "Ipsos", denominator: "All respondents",
      date_conducted: "2026-09-08",
      shares: { [chow]: 0.36, [bradford]: 0.21, [alexander]: 0.04,
        "response:other": 0.05, "response:undecided": 0.3, "response:would_not_vote": 0.03 },
    }, { ...polling.polls[1], firm: "Unknown basis firm", denominator: "Not stated" }];
    mocks.loadMayoralForecast.mockResolvedValue(forecastFixture);
    mocks.loadMayoralPolling.mockResolvedValue(polling);
    const html = renderToStaticMarkup(await PollsPage());
    expect(html).toContain("Shares among respondents naming a candidate");
    expect(html).toContain("1 poll");
    expect(html).toContain("Unknown basis firm");
    expect(html).toContain("54.5%");
    expect(html).toMatch(/data-label="Olivia Chow"[^>]*>36%/);
    expect(html).toContain("All respondents");
    expect(html).toContain("Forecast history summary");
    expect(html).toContain("Since nominations closed");
  });
  it("filters forecast history by publication date and updates its accessible summary", async () => {
    const forecast = structuredClone(forecastFixture) as unknown as MayoralForecastFeed;
    const sample = forecast.history![0];
    forecast.history = ["2026-07-30", "2026-08-21", "2026-08-25", "2026-09-29"]
      .map((date) => ({ ...sample, date }));
    mocks.loadMayoralForecast.mockResolvedValue(forecast);
    mocks.loadMayoralPolling.mockResolvedValue(pollingFixture);
    const html = renderToStaticMarkup(await PollsPage());
    expect(html).toContain("2 poll releases");
    expect(html).toContain("after the poll published Aug 25, 2026");
    expect(html).toContain("2 releases.");
    expect(html).not.toContain("4 releases.");
    expect(html.match(/Poll releases shown in the forecast history chart/g)).toHaveLength(1);
  });
  it("shows a poll's head-to-head reading beneath it and labels Chow-or-Bradford-only records", async () => {
    mocks.loadMayoralForecast.mockResolvedValue(forecastFixture);
    mocks.loadMayoralPolling.mockResolvedValue(pollingFixture);
    const html = renderToStaticMarkup(await PollsPage());
    const archive = html.split('aria-labelledby="archive-heading"')[1].split("</section>")[0];
    expect((archive.match(/poll-archive__row--head-to-head/g) ?? []).length).toBe(1);
    expect(archive).toContain("Not counted separately");
    expect(archive).toContain(">All respondents (Chow or Bradford only)<");
    // The older fixture carries a pre-exit Chow-or-Bradford reading as its own record.
    expect(archive).toContain(">Chow or Bradford only<");
    // A Head-to-Head Reading is not a separate poll.
    expect(html).toContain(`${pollingFixture.polls.length} public polls`);
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
