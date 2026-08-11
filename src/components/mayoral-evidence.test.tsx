import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { MayoralRace } from "@/lib/mayoral-api";
import { MayoralEvidence } from "./mayoral-evidence";

const evidence = {
  availability: "available" as const,
  denominator: "poll_reported_vote_intention" as const,
  candidates: { chow: 0.47, bradford: 0.37, alexander: 0.1 },
  residual: { id: "residual" as const, label: "Other / undecided", share: 0.06 },
  poll_count: 2,
  firm_count: 2,
  latest_date: "2026-08-07",
  series: [],
};

const race = {
  current_field: evidence,
  head_to_head: { ...evidence, candidates: { chow: 0.49, bradford: 0.4 }, residual: { ...evidence.residual, share: 0.11 } },
  challenger_lane: {
    availability: "available",
    combined_share: 0.47,
    named_split: { bradford: 0.787, alexander: 0.213 },
    condition: "split",
    trend: { status: "insufficient_data", reason: "More evidence is required." },
    poll_count: 2,
    latest_date: "2026-08-07",
  },
  approval: { availability: "unavailable", readings: [] },
} as unknown as MayoralRace;

describe("MayoralEvidence", () => {
  it("starts on current field with accessible lens state and a textual equivalent", () => {
    const html = renderToStaticMarkup(<MayoralEvidence race={race} />);
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("Poll-reported vote intention");
    expect(html).toContain("Other / undecided");
    expect(html).toContain("Share of combined Bradford–Alexander support");
  });

  it("renders all three keyboard-operable native buttons", () => {
    const html = renderToStaticMarkup(<MayoralEvidence race={race} />);
    expect((html.match(/<button/g) ?? []).length).toBe(3);
    expect(html).toContain("Head-to-head");
    expect(html).toContain("Approval");
  });
});

