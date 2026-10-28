import { beforeEach, describe, expect, it, vi } from "vitest";
import councilFixture from "../../fixtures/council_race_cards.json";
import forecastFixture from "../../fixtures/mayoral_forecast.json";
import trusteeFixture from "../../fixtures/trustee_race_cards.json";
import ResultsPage from "@/app/results/page";
import vercelConfig from "../../vercel.json";
import type { CouncilRaceCardsFeed, MayoralForecastFeed, TrusteeRaceCardsFeed } from "@/types/feeds";

const mocks = vi.hoisted(() => ({
  loadCouncilRaceCards: vi.fn(),
  loadTrusteeRaceCards: vi.fn(),
  loadMayoralForecast: vi.fn(),
  loadMayoralCandidates: vi.fn(),
}));

vi.mock("@/lib/feeds", () => ({
  loadCouncilRaceCards: mocks.loadCouncilRaceCards,
  loadTrusteeRaceCards: mocks.loadTrusteeRaceCards,
  loadMayoralForecast: mocks.loadMayoralForecast,
  loadMayoralCandidates: mocks.loadMayoralCandidates,
}));

beforeEach(() => {
  mocks.loadCouncilRaceCards.mockResolvedValue(councilFixture as unknown as CouncilRaceCardsFeed);
  mocks.loadTrusteeRaceCards.mockResolvedValue(trusteeFixture as unknown as TrusteeRaceCardsFeed);
  mocks.loadMayoralForecast.mockResolvedValue(forecastFixture as unknown as MayoralForecastFeed);
  mocks.loadMayoralCandidates.mockRejectedValue(new Error("not in this test"));
});

type Redirect = { source: string; destination: string; has?: { type: string; key: string; value: string }[] };

/** Where vercel.json sends a path and query, by Vercel's rules for these simple patterns. */
function follow(redirects: Redirect[], path: string, query: Record<string, string> = {}): string | null {
  for (const r of redirects) {
    const names: string[] = [];
    const pattern = r.source.replace(/\/$/, "").replace(/:(\w+)\(([^)]+)\)/g, (_, name: string, re: string) => {
      names.push(name);
      return "(" + re + ")";
    });
    const m = path.replace(/\/$/, "").match(new RegExp("^" + pattern + "$"));
    if (!m) continue;
    const params: Record<string, string> = Object.fromEntries(names.map((n, i) => [n, m[i + 1]]));
    const ok = (r.has ?? []).every((h) => {
      const hm = query[h.key]?.match(new RegExp("^(?:" + h.value + ")$"));
      if (hm) Object.assign(params, hm.groups ?? {});
      return Boolean(hm);
    });
    if (ok) return r.destination.replace(/:(\w+)/g, (_, n: string) => params[n] ?? ":" + n);
  }
  return null;
}

describe("the results routes (results redesign, Alex, 2026-10-24)", () => {
  it("sends old ward pages and old dashboard links to each race's own page", async () => {
    // The static export can't carry next.config redirects, so vercel.json holds them.
    const redirects = vercelConfig.redirects as Redirect[];
    expect(follow(redirects, "/results/4")).toBe("/parkdale-high-park/");
    expect(follow(redirects, "/results/12/")).toBe("/toronto-st-pauls/");
    expect(follow(redirects, "/results/", { race: "council", open: "councillor-25" })).toBe("/scarborough-rouge-park/");
    expect(follow(redirects, "/results/", { race: "trustee", open: "tdsb-5" })).toBe("/tdsb/5/");
    expect(follow(redirects, "/results/", { race: "trustee", open: "tcdsb-12" })).toBe("/tcdsb/12/");
    expect(follow(redirects, "/results/", { race: "trustee", open: "viamonde-3" })).toBe("/conseils-scolaires/#viamonde-3");
    // The page itself, and anything it doesn't know, stay put.
    expect(follow(redirects, "/results/")).toBeNull();
    expect(follow(redirects, "/results/", { open: "mayor" })).toBeNull();
    expect(follow(redirects, "/results/26")).toBeNull();
  });

  it("gives the page every race, every ward's label and the map's data", async () => {
    const props = ((await ResultsPage()) as { props: { homes: unknown[]; wards: unknown[]; mapData: { areas: unknown } } }).props;
    expect(props.homes).toHaveLength(54);
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
