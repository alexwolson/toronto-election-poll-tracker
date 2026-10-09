import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import councilFixture from "../../fixtures/council_race_cards.json";
import WardsPage from "@/app/wards/page";
import WardPage from "@/app/wards/[ward_num]/page";
import type { CouncilRaceCardsFeed } from "@/types/feeds";

const mocks = vi.hoisted(() => ({
  loadCouncilRaceCards: vi.fn(),
}));

vi.mock("@/lib/feeds", () => ({
  loadCouncilRaceCards: mocks.loadCouncilRaceCards,
}));

const feed = councilFixture as unknown as CouncilRaceCardsFeed;

beforeEach(() => {
  mocks.loadCouncilRaceCards.mockResolvedValue(feed);
});

describe("Council ward pages", () => {
  it("uses the shared race-index hierarchy and card system", async () => {
    const html = renderToStaticMarkup(await WardsPage());

    expect(html).toContain("<h1 id=\"council-heading\">Toronto City Council</h1>");
    expect(html).toContain("<h2 id=\"council-wards-heading\">The 25 wards</h2>");
    expect(html).toMatch(/class="[^"]*\brace-index-section\b[^"]*"/);
    expect(html).toContain('class="race-index-list ward-index-grid"');
    expect(html).toContain("race-index-card ward-index-card");
  });

  it("uses the open-seat tag without restating it in the hero", async () => {
    const html = renderToStaticMarkup(
      await WardPage({ params: Promise.resolve({ ward_num: "4" }) }),
    );

    expect(html.match(/>Open seat<\/span>/g)).toHaveLength(1);
    expect(html).not.toContain("No incumbent is running");
    expect(html).not.toContain("race-hero-dek");
  });

  it("keeps incumbent detail while omitting the duplicated latest-win row", async () => {
    const html = renderToStaticMarkup(
      await WardPage({ params: Promise.resolve({ ward_num: "1" }) }),
    );

    expect(html).toContain("<h2>The incumbent</h2>");
    expect(html).toContain("Vincent Crisanti");
    expect(html).toContain("Last election (2022)");
    expect(html).not.toContain("<dt>Most recent win</dt>");
    expect(html).not.toContain("positive historical signal");
    expect(html).not.toContain("negative historical signal");
  });

  it("recognizes the same latest win when the prior feed reorders the winner's name", async () => {
    const html = renderToStaticMarkup(
      await WardPage({ params: Promise.resolve({ ward_num: "15" }) }),
    );

    expect(html).toContain("Last election (2024)");
    expect(html).not.toContain("<dt>Most recent win</dt>");
  });
});

describe("Council ward pages with an incumbent's Suspended Campaign", () => {
  function suspendedWard5(): CouncilRaceCardsFeed {
    const suspended = structuredClone(feed) as CouncilRaceCardsFeed;
    const card = suspended.wards["5"];
    card.incumbent_campaign_suspended_on = "2026-10-09";
    card.attention = { level: "suspended", score: 4000 };
    for (const candidate of card.candidates) {
      candidate.campaign_suspended_on =
        candidate.display_name === card.incumbent.name ? "2026-10-09" : null;
    }
    card.ward_polls = card.ward_polls.map((poll) => ({ ...poll, before_incumbent_suspension: true }));
    return suspended;
  }

  it("labels the ward, keeps the incumbent, dates the campaign and flags earlier polls", async () => {
    mocks.loadCouncilRaceCards.mockResolvedValue(suspendedWard5());
    const html = renderToStaticMarkup(
      await WardPage({ params: Promise.resolve({ ward_num: "5" }) }),
    );

    expect(html.match(/>Incumbent suspended campaign<\/span>/g)).toHaveLength(1);
    expect(html).toContain("<h2>The incumbent</h2>");
    expect(html).toContain("<dt>Campaign</dt>");
    expect(html).toContain("Suspended Oct. 9");
    expect(html).toContain("Campaign suspended Oct. 9");
    expect(html).toContain("Conducted before Frances Nunziata’s campaign was suspended on Oct. 9.");
  });

  it("shows the label on the council index", async () => {
    mocks.loadCouncilRaceCards.mockResolvedValue(suspendedWard5());
    const html = renderToStaticMarkup(await WardsPage());

    expect(html).toContain("ward-attn-tag--suspended");
    expect(html).toContain("Incumbent suspended campaign");
  });
});
