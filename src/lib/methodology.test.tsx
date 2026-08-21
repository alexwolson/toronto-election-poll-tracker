import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MethodFlow } from "@/components/method-flow";
import HowItWorksPage from "@/app/how-it-works/page";
import {
  forecastFlow,
  glossary,
  hintAuditSnapshot,
  hintEvidenceExamples,
  hintEvidenceFlow,
  methodologyNav,
} from "./methodology";

vi.mock("@/lib/feeds", () => ({
  loadManifest: async () => ({ generated_at: "2026-08-21T12:00:00Z" }),
}));

describe("methodology content", () => {
  it("has unique navigation targets for every major section", () => {
    const ids = methodologyNav.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([
      "mayoral-forecast",
      "polling-trends",
      "council-attention",
      "candidate-history",
      "limitations",
      "glossary",
      "sources",
    ]);
  });

  it("protects the model-defining forecast claims", () => {
    const text = forecastFlow.map((step) => `${step.title} ${step.body}`).join(" ");
    expect(text).toContain("newest eligible reading from each pollster");
    expect(text).toContain("each represented pollster equal weight");
    expect(text).toContain("Missing never means zero");
    expect(text).toContain("Stress-test");
    expect(text).toContain("Publish a stable band");
  });

  it("records both published and independently withheld evidence examples", () => {
    expect(hintAuditSnapshot.tested).toBe(34);
    expect(hintAuditSnapshot.published).toBe(2);
    expect(hintAuditSnapshot.diagnosticTested).toBe(18);
    expect(hintAuditSnapshot.diagnosticCleared).toBe(7);
    expect(hintAuditSnapshot.contractVersion).toBe("2.0.0");
    expect(hintAuditSnapshot.primaryYears).toEqual([2010, 2014, 2022]);
    expect(hintEvidenceExamples.filter((item) => item.status === "published")).toHaveLength(2);
    expect(hintEvidenceExamples.filter((item) => item.status === "withheld")).toHaveLength(3);
    expect(hintEvidenceExamples.map((item) => item.title)).toEqual(
      expect.arrayContaining([
        "Previously elected trustee",
        "Won at least one previous race",
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
        "Win-chance band",
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
    expect(html).toContain("Balance the pollsters");
    expect(html).toContain('aria-hidden="true"');
  });

  it("renders every deep-link target, worked example, and accessible figure", async () => {
    const html = renderToStaticMarkup(await HowItWorksPage());

    for (const item of methodologyNav) {
      expect(html).toContain(`href="#${item.id}"`);
      expect(html).toContain(`id="${item.id}"`);
    }

    expect(html).toContain("Six steps from eligible mayoral polls");
    expect(html).toContain("Example LOESS trend through individual polls");
    expect(html).toContain("Ward 11 index measurements");
    expect(html).toContain("35%");
    expect(html).toContain("11%");
    expect(html).toContain("8,869");
    expect(html).toContain("123-vote winning margin");
    expect(html).toContain("tested 34 candidate-facing flag definitions");
    expect(html).toContain("<strong>2</strong><span>currently published</span>");
    expect(html).toContain("contract 2.0.0");
    expect(html).toContain("Methodology reviewed");
    expect(html).not.toMatch(/ADR \d|M3|historical_hint_contract|feed schema/i);
  });
});
