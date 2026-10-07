import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import forecastFixture from "../../fixtures/mayoral_forecast.json";
import { MethodFlow } from "@/components/method-flow";
import HowItWorksPage from "@/app/how-it-works/page";
import type { MayoralForecastFeed } from "@/types/feeds";
import {
  forecastFlow,
  glossary,
  hintAuditSnapshot,
  hintEvidenceExamples,
  hintEvidenceFlow,
  methodologyNav,
} from "./methodology";

const mocks = vi.hoisted(() => ({ loadMayoralForecast: vi.fn() }));

vi.mock("@/lib/feeds", () => ({
  loadCouncilRaceCards: async () => ({ ward_poll_benchmark: null }),
  loadManifest: async () => ({ backend_generated_at: "2026-08-21T12:00:00Z" }),
  loadMayoralForecast: mocks.loadMayoralForecast,
}));

function forecast(alexanderMedian?: number): MayoralForecastFeed {
  const feed = structuredClone(forecastFixture) as unknown as MayoralForecastFeed;
  if (alexanderMedian !== undefined) {
    feed.election_day!.candidates.find((c) => c.display_name === "Chris Alexander")!.median = alexanderMedian;
  }
  return feed;
}

async function pageText(feed: MayoralForecastFeed = forecast()): Promise<string> {
  mocks.loadMayoralForecast.mockResolvedValue(feed);
  return renderToStaticMarkup(await HowItWorksPage()).replace(/<[^>]+>/g, "");
}

const EXIT_PARAGRAPH =
  "Chris Alexander ended his campaign on October 6. He is still on the ballot and can still receive " +
  "votes. Polls taken on or after that date enter the model as a comparison between Chow and Bradford, " +
  "whether or not they still name him; any share they report for him is set aside. When one poll asks " +
  "both the full field and a question offering only Chow and Bradford, the full-field question is the " +
  "one that counts.";

const recordParagraph = (share: string) =>
  "We found ten past cases of a Canadian mayoral candidate ending a campaign but staying on the ballot. " +
  "Those polled beforehand kept between about 3% and 25% of the support they had in their last poll. " +
  `The forecast draws Alexander\u2019s own election-day share from that record: ${share} today. ` +
  "It does not assume where the rest of his support goes. It starts from a split between Chow and " +
  "Bradford in proportion to their own support, and learns the actual split from polls taken since " +
  "October 6.";

describe("methodology content", () => {
  it("has unique navigation targets for every major section", () => {
    const ids = methodologyNav.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([
      "mayoral-forecast",
      "council-attention",
      "ward-polls",
      "limitations",
      "sources",
    ]);
  });

  it("protects the model-defining forecast claims", () => {
    const text = forecastFlow.map((step) => `${step.title} ${step.body}`).join(" ");
    expect(forecastFlow).toHaveLength(6);
    expect(text).toContain("every published poll of the certified candidate field");
    expect(text).toContain("Seven past Toronto mayoral races");
    expect(text).toContain("sixteen thousand plausible full-ballot results");
    expect(text).toContain("numerical checks pass");
    expect(text).toContain("same simulated elections");
    expect(text).not.toMatch(/band|times in/i);
  });

  it("records both published and independently withheld evidence examples", () => {
    expect(hintAuditSnapshot.tested).toBe(35);
    expect(hintAuditSnapshot.published).toBe(12);
    expect(hintAuditSnapshot.diagnosticTested).toBe(21);
    expect(hintAuditSnapshot.diagnosticCleared).toBe(10);
    expect(hintAuditSnapshot.contractVersion).toBe("2.1.0");
    expect(hintAuditSnapshot.primaryYears).toEqual([2010, 2014, 2022]);
    expect(hintEvidenceExamples.filter((item) => item.status === "published")).toHaveLength(5);
    expect(hintEvidenceExamples.filter((item) => item.status === "withheld")).toHaveLength(3);
    expect(hintEvidenceExamples.map((item) => item.title)).toEqual(
      expect.arrayContaining([
        "Previously elected trustee",
        "Won at least one previous race",
        "Previous race experience",
        "An unsuccessful council run",
        "A former councillor in an open race",
        "Previously elected MP",
        "Each additional previous victory",
        "Two or more unsuccessful council runs",
      ]),
    );
  });

  it("keeps the evidence decision path and reader glossary complete", () => {
    expect(hintEvidenceFlow.map((step) => step.title)).toEqual([
      "Name a testable idea",
      "Check coverage and identity",
      "Estimate the association",
      "Compare elections",
      "Publish, supersede, or withhold",
    ]);
    expect(glossary.map((entry) => entry.term)).toEqual(
      expect.arrayContaining([
        "LOESS trend",
        "Win probability",
        "Margin distribution",
        "Prior win",
        "Councillor Defeatability Index",
        "Historical hint",
      ]),
    );
  });
});

describe("How It Works rendering", () => {
  it("renders the flow as labelled, ordered, readable content", () => {
    const html = renderToStaticMarkup(
      <MethodFlow label="Forecast publication flow" steps={forecastFlow.slice(0, 2)} />,
    );
    expect(html).toContain('<figure class="method-flow" aria-label="Forecast publication flow">');
    expect(html).toContain("<ol>");
    expect(html).toContain("Choose eligible polls");
    expect(html).toContain("Track the race");
    expect(html).toContain('aria-hidden="true"');
  });

  it("explains the Suspended Campaign under Which polling enters?, with his share read from the release", async () => {
    const text = (await pageText()).replace(/\s+/g, " ");
    const section = text.slice(text.indexOf("Which polling enters?"), text.indexOf("One model, three views"));
    expect(section).toContain(EXIT_PARAGRAPH);
    expect(section).toContain(recordParagraph("less than 1%"));
    expect((await pageText(forecast(0.026))).replace(/\s+/g, " ")).toContain(recordParagraph("about 3%"));
    expect(text).not.toContain("which would leave the odds unchanged");
  });

  it("omits the Suspended Campaign paragraphs when the release includes no such campaign", async () => {
    const none = forecast();
    none.election_day!.other_candidates.includes = [];
    const text = await pageText(none);
    expect(text).not.toContain("Chris Alexander ended his campaign");
    expect(text).not.toContain("We found ten past cases");
  });

  it("describes the polling chart's default view as polls reporting Chow and Bradford", async () => {
    const text = (await pageText()).replace(/\s+/g, " ");
    expect(text).toContain(
      "The default \u201cSince nominations closed\u201d view shows polls reporting Chow and Bradford with " +
        "fieldwork completed after the August 21 nomination deadline. Polls taken before October 6 also " +
        "report Alexander. \u201cAll polls\u201d includes the earlier history.",
    );
    expect(text).not.toContain("reporting Chow, Bradford and Alexander");
  });

  it("renders question-led entry points, technical disclosures, and accessible figures", async () => {
    mocks.loadMayoralForecast.mockResolvedValue(forecast());
    const html = renderToStaticMarkup(await HowItWorksPage());

    for (const item of methodologyNav) {
      expect(html).toContain(`href="#${item.id}"`);
      expect(html).toContain(`id="${item.id}"`);
    }

    expect(html).toContain("Why should I trust the forecast?");
    expect(html).toContain("Why is this ward marked for attention?");
    expect(html).toContain("Why might a result be withheld?");
    expect(html).toContain("Where does the data come from?");
    expect(html).toContain('<details class="how-disclosure">');
    expect(html).toContain('id="polling-trends"');
    expect(html).toContain('id="candidate-history"');
    expect(html).toContain('id="glossary"');
    expect(html).not.toContain("Choose a question");
    expect(html).not.toContain("Start with the question that matches what you saw");

    const sourceRegisterStart = html.indexOf("Full source register");
    const sourceRegisterEnd = html.indexOf("</details>", sourceRegisterStart);
    const sourceRegister = html.slice(sourceRegisterStart, sourceRegisterEnd);
    expect(sourceRegisterStart).toBeGreaterThan(-1);
    expect(sourceRegister).toContain("Election and candidate records");
    expect(sourceRegister).toContain("Candidate-history audit");

    expect(html).toContain("Six steps from eligible mayoral polls");
    expect(html).toContain("Example LOESS trend through individual polls");
    expect(html).toContain("Ward 11 index measurements");
    expect(html).toContain("35%");
    expect(html).toContain("11%");
    expect(html).toContain("8,869");
    expect(html).toContain("123-vote winning margin");
    expect(html).toContain("<strong>35</strong><span>flag definitions tested</span>");
    expect(html).toContain("<strong>12</strong><span>currently published</span>");
    expect(html).toContain("contract 2.1.0");
    expect(html).toContain("current 12-flag catalog");
    expect(html).toContain("Methodology reviewed");
    expect(html).not.toMatch(/ADR \d|M3|historical_hint_contract|feed schema/i);
  });
});
