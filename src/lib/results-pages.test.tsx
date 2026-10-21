import { beforeEach, describe, expect, it, vi } from "vitest";
import councilFixture from "../../fixtures/council_race_cards.json";
import forecastFixture from "../../fixtures/mayoral_forecast.json";
import trusteeFixture from "../../fixtures/trustee_race_cards.json";
import ResultsPage from "@/app/results/page";
import nextConfig from "../../next.config";
import type { CouncilRaceCardsFeed, MayoralForecastFeed, TrusteeRaceCardsFeed } from "@/types/feeds";

const mocks = vi.hoisted(() => ({
  loadCouncilRaceCards: vi.fn(),
  loadTrusteeRaceCards: vi.fn(),
  loadMayoralForecast: vi.fn(),
}));

vi.mock("@/lib/feeds", () => ({
  loadCouncilRaceCards: mocks.loadCouncilRaceCards,
  loadTrusteeRaceCards: mocks.loadTrusteeRaceCards,
  loadMayoralForecast: mocks.loadMayoralForecast,
}));

beforeEach(() => {
  mocks.loadCouncilRaceCards.mockResolvedValue(councilFixture as unknown as CouncilRaceCardsFeed);
  mocks.loadTrusteeRaceCards.mockResolvedValue(trusteeFixture as unknown as TrusteeRaceCardsFeed);
  mocks.loadMayoralForecast.mockResolvedValue(forecastFixture as unknown as MayoralForecastFeed);
});

describe("the results dashboard route (Alex, 2026-10-20)", () => {
  it("sends an old ward page link to that ward's council race on the dashboard", async () => {
    expect(await nextConfig.redirects!()).toEqual([
      { source: "/results/:ward(\\d{1,2})", destination: "/results/?race=council&open=councillor-:ward", permanent: false },
    ]);
  });

  it("gives the dashboard every ward's picker label and the map's data", async () => {
    const props = ((await ResultsPage()) as { props: { wards: unknown[]; mapData: { areas: unknown } } }).props;
    expect(props.wards).toHaveLength(25);
    expect(props.mapData.areas).toBeTruthy();
  });

  it("tells the page only whether the final forecast publishes, never its outcomes (#54)", async () => {
    type Forecast = { props: { forecast: unknown } };
    expect(((await ResultsPage()) as Forecast).props.forecast).toBe(true);
    // The props are serialized into the page: no outcome may ride along unshown.
    expect(JSON.stringify(((await ResultsPage()) as Forecast).props)).not.toMatch(/probability|ahead by/);
    mocks.loadMayoralForecast.mockResolvedValue({
      ...(forecastFixture as unknown as MayoralForecastFeed),
      election_day: null,
    });
    expect(((await ResultsPage()) as Forecast).props.forecast).toBe(false);
  });
});
