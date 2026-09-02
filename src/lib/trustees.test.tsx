import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import councilFixture from "../../fixtures/council_race_cards.json";
import trusteeFixture from "../../fixtures/trustee_race_cards.json";
import TrusteeBoardPage from "@/app/trustees/[board]/page";
import TrusteeWardPage from "@/app/trustees/[board]/[ward]/page";
import type { CouncilRaceCardsFeed, TrusteeRaceCardsFeed } from "@/types/feeds";
import {
  cityWardAreaNames,
  cityWardsLabel,
  incumbentTrustees,
  showTrusteeRaceContextTag,
  trusteeBoard,
  trusteeFieldStatus,
  trusteeRaceContextLabel,
  trusteeWard,
} from "./trustees";

const mocks = vi.hoisted(() => ({
  loadCouncilRaceCards: vi.fn(),
  loadTrusteeRaceCards: vi.fn(),
}));

vi.mock("@/lib/feeds", () => ({
  loadCouncilRaceCards: mocks.loadCouncilRaceCards,
  loadTrusteeRaceCards: mocks.loadTrusteeRaceCards,
}));

const feed = trusteeFixture as unknown as TrusteeRaceCardsFeed;
const council = councilFixture as unknown as CouncilRaceCardsFeed;

beforeEach(() => {
  mocks.loadCouncilRaceCards.mockResolvedValue(council);
});

describe("trustee view helpers", () => {
  it("preserves official board and ward facts", () => {
    const tdsb = trusteeBoard(feed, "tdsb");
    const ward1 = trusteeWard(tdsb, "1");
    if (!ward1) throw new Error("fixture must contain TDSB Ward 1");

    expect(new Set(tdsb?.wards.map((ward) => ward.ward_id))).toEqual(
      new Set(Array.from({ length: 12 }, (_, index) => String(index + 1))),
    );
    expect(cityWardAreaNames(ward1.city_wards, council)).toEqual([
      "Etobicoke North",
      "Humber River-Black Creek",
    ]);
    expect(cityWardsLabel(ward1.city_wards, council)).toBe(
      "Etobicoke North and Humber River-Black Creek",
    );
    expect(incumbentTrustees(ward1).map((candidate) => candidate.display_name)).toEqual([
      "Matias de Dovitiis",
      "Dennis Hastings",
    ]);
  });

  it("keeps the candidate count distinct from the acclamation tag", () => {
    const tcdsb = trusteeBoard(feed, "tcdsb");
    const ward6 = trusteeWard(tcdsb, "6");
    if (!ward6) throw new Error("fixture must contain TCDSB Ward 6");

    expect(trusteeFieldStatus(ward6)).toBe("1 candidate");
    expect(ward6.comparable_prior_result).toMatchObject({
      year: 2022,
      winner_name: "Frank D'Amico",
      margin_votes: 754,
    });
  });

  it("uses backend context labels and preserves backend ward order", () => {
    const tdsb = trusteeBoard(feed, "tdsb");
    if (!tdsb) throw new Error("fixture must contain TDSB races");

    expect(tdsb.wards.map((ward) => ward.ward_id)).toEqual([
      "2",
      "5",
      "9",
      "10",
      "11",
      "1",
      "3",
      "4",
      "6",
      "7",
      "8",
      "12",
    ]);
    expect(trusteeRaceContextLabel("two_incumbents")).toBe("Two incumbents");
    expect(trusteeRaceContextLabel("won_without_majority")).toBe(
      "Previous winner below 50%",
    );
    expect(showTrusteeRaceContextTag("contested_incumbent")).toBe(false);
  });

  it("contains no trustee classification or sorting logic", () => {
    const source = readFileSync(new URL("./trustees.ts", import.meta.url), "utf8");

    expect(source).not.toContain(".sort(");
    expect(source).not.toContain("0.5");
    expect(source).not.toContain("incumbentTrustees(ward).length");
  });
});

describe("Trustees pages", () => {
  it("renders four board tabs and the board's complete ward index", async () => {
    mocks.loadTrusteeRaceCards.mockResolvedValue(feed);

    const html = renderToStaticMarkup(
      await TrusteeBoardPage({ params: Promise.resolve({ board: "tdsb" }) }),
    );

    expect(html).toContain("Toronto District School Board");
    expect(html).toContain("The 12 wards");
    expect(html).toContain('class="race-index-section"');
    expect(html).toContain('class="race-index-list trustee-ward-list"');
    expect(html).toContain("race-index-card trustee-ward-link");
    expect(html).toContain('<span class="race-index-card__eyebrow">Ward 2</span>');
    expect(html).toContain(
      '<h3 class="race-index-card__heading trustee-ward-link__heading">Etobicoke Centre; Etobicoke-Lakeshore</h3>',
    );
    expect(html).toContain('href="/trustees/tdsb"');
    expect(html).toContain('href="/trustees/tcdsb"');
    expect(html).toContain('href="/trustees/viamonde"');
    expect(html).toContain('href="/trustees/monavenir"');
    expect(html).not.toContain("2 incumbent trustees on the ballot");
    expect(html).toContain(">Open race</span>");
    expect(html).toContain(">Two incumbents</span>");
    expect(html).toContain(">One incumbent</span>");
    expect(html).not.toContain("Race type ·");
    expect(html).not.toContain("trustee-ward-link__area");
    expect(html).toContain("TDSB wards were redrawn for 2026");
    expect(html).not.toContain("The labels show whether a race is open");
    expect(html).not.toContain("Candidate histories cover verified Toronto");
    expect(html.indexOf('href="/trustees/tdsb/2"')).toBeLessThan(
      html.indexOf('href="/trustees/tdsb/1"'),
    );
    expect(html.indexOf('href="/trustees/tdsb/1"')).toBeLessThan(
      html.indexOf('href="/trustees/tdsb/3"'),
    );
  });

  it("keeps the TDSB surrogate off the other board indexes", async () => {
    mocks.loadTrusteeRaceCards.mockResolvedValue(feed);

    const html = renderToStaticMarkup(
      await TrusteeBoardPage({ params: Promise.resolve({ board: "tcdsb" }) }),
    );

    expect(html).toContain("Previous winner below 50%");
    expect(html).toContain("lowest previous winning share appear first");
    expect(html).toContain("not a forecast");
    expect(html).not.toContain("TDSB wards were redrawn for 2026");
    expect(html.indexOf('href="/trustees/tcdsb/1"')).toBeLessThan(
      html.indexOf('href="/trustees/tcdsb/4"'),
    );
    expect(html.indexOf('href="/trustees/tcdsb/4"')).toBeLessThan(
      html.indexOf('href="/trustees/tcdsb/2"'),
    );
    expect(html.indexOf('href="/trustees/tcdsb/2"')).toBeLessThan(
      html.indexOf('href="/trustees/tcdsb/6"'),
    );
  });

  it("renders verified histories, vote shares, and plain no-history candidates", async () => {
    mocks.loadTrusteeRaceCards.mockResolvedValue(feed);

    const html = renderToStaticMarkup(
      await TrusteeWardPage({
        params: Promise.resolve({ board: "tdsb", ward: "1" }),
      }),
    );

    expect(html).toContain("<h1>Ward 1 — Etobicoke North; Humber River-Black Creek</h1>");
    expect(html).not.toContain("trustee-ward-area");
    expect(html).toContain("Candidate histories cover verified Toronto");
    expect(html).toContain("Incumbent Trustee");
    expect(html).toContain("won · 27.8%");
    expect(html).toContain("Ward 4 — Humber River-Black Creek");
    expect(html).toContain("Ward 4 — York West");
    expect(html).toContain("Ward 12 — Scarborough Southwest; Scarborough-Guildwood");
    expect(html).toContain("Amberley Ryan Henry");
    expect(html).toContain(">Two incumbents</span>");
    expect(html).not.toContain("Race type ·");
    expect(html).not.toContain("No verified history");
    expect(html).not.toContain("No verified prior candidacy");
  });

  it("organizes broad French-board coverage as a readable area list", async () => {
    mocks.loadTrusteeRaceCards.mockResolvedValue(feed);

    const html = renderToStaticMarkup(
      await TrusteeBoardPage({ params: Promise.resolve({ board: "viamonde" }) }),
    );

    expect(html).toContain("Areas covered");
    expect(html).toContain("trustee-ward-link__area");
    expect(html).toContain('class="trustee-ward-coverage__areas"');
    expect(html).toContain("Etobicoke North");
    expect(html).toContain("Scarborough-Rouge Park");
    expect(html).not.toContain("City Wards");
  });

  it("retains expanded area coverage when a French-board heading does not name it", async () => {
    mocks.loadTrusteeRaceCards.mockResolvedValue(feed);

    const html = renderToStaticMarkup(
      await TrusteeWardPage({
        params: Promise.resolve({ board: "viamonde", ward: "2" }),
      }),
    );

    expect(html).toContain("<h1>Ward 2 — Est</h1>");
    expect(html).toContain("trustee-ward-area");
    expect(html).toContain("Areas covered");
    expect(html).toContain("Scarborough-Rouge Park");
  });

  it("states the official acclamation and omits a made-up vote total", async () => {
    mocks.loadTrusteeRaceCards.mockResolvedValue(feed);

    const html = renderToStaticMarkup(
      await TrusteeWardPage({
        params: Promise.resolve({ board: "tcdsb", ward: "6" }),
      }),
    );

    expect(html).toContain("Frank D&#x27;Amico");
    expect(html).toContain("Re-elected · Incumbent Trustee · 5 past races");
    expect(html).not.toContain("<h2>The 2026 election</h2>");
    expect(html).not.toContain("No vote will be held");
    expect(html).not.toContain("seeking another term");
    expect(html).toContain("Last comparable election (2022)");
    expect(html).toContain("Frank D&#x27;Amico · 54%");
    expect(html).toContain("lost · 24th of 102 · &lt;0.1%");
    expect(html).not.toContain("Votes cast");
  });

  it("explains an under-majority prior win without predictive language", async () => {
    mocks.loadTrusteeRaceCards.mockResolvedValue(feed);

    const html = renderToStaticMarkup(
      await TrusteeWardPage({
        params: Promise.resolve({ board: "tcdsb", ward: "5" }),
      }),
    );

    expect(html).toContain("Previous winner below 50%");
    expect(html).not.toContain("Maria Rizzo won this ward in 2022 with 45.2% of votes cast.");
    expect(html).toContain("Maria Rizzo · 45%");
    expect(html).not.toContain("vulnerable");
    expect(html).not.toContain("Defeatability");
  });

  it("gives an ordinary continuous-board incumbent no context badge", async () => {
    mocks.loadTrusteeRaceCards.mockResolvedValue(feed);

    const html = renderToStaticMarkup(
      await TrusteeWardPage({
        params: Promise.resolve({ board: "tcdsb", ward: "2" }),
      }),
    );

    expect(html).toContain("Markus de Domenico");
    expect(html).toContain("Incumbent Trustee");
    expect(html).not.toContain("is a sitting trustee");
    expect(html).not.toContain("trustee-race-context");
    expect(html).not.toContain("Previous winner below 50%");
  });
});
