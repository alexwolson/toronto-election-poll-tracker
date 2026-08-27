import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import candidatesFixture from "../../fixtures/mayoral_candidates.json";
import CandidatesPage from "@/app/candidates/page";
import type { MayoralCandidatesFeed } from "@/types/feeds";

const mocks = vi.hoisted(() => ({
  loadMayoralCandidates: vi.fn(),
}));

vi.mock("@/lib/feeds", () => ({
  loadMayoralCandidates: mocks.loadMayoralCandidates,
}));

describe("Candidates page", () => {
  it("renders the complete certified field with ward-style history rows", async () => {
    const feed = structuredClone(candidatesFixture) as unknown as MayoralCandidatesFeed;
    const chow = feed.candidates.find((candidate) => candidate.display_name === "Olivia Chow");
    if (!chow) throw new Error("fixture is missing Olivia Chow");
    chow.campaign_url = "https://www.oliviachow.ca";
    mocks.loadMayoralCandidates.mockResolvedValue(feed);

    const html = renderToStaticMarkup(await CandidatesPage());

    expect(html).toContain("The certified field (53)");
    expect(html).toContain("Olivia Chow");
    expect(html).toContain("Chris Alexander");
    expect(html).toContain("Former MP · 2 past races");
    expect(html).not.toContain("Former Mayor");
    expect(html).toContain("nationwide with no year cutoff");
    expect(html).toContain("Identity evidence standards are the same");
    expect(html).toContain('href="https://www.oliviachow.ca"');
    expect(html).toContain("Campaign links were supplied by candidates");
    expect(html).toContain("1991");
    expect(html).toContain("Ward 20 — Trinity-Spadina");
    expect(html).toContain("Coverage note:");
    expect(html).toContain(
      "We identified a Toronto school trustee candidacy in 1985 but could not recover authoritative results.",
    );
    expect(html).toContain(
      "We identified Toronto council by-election candidacies in 1998 and 2001 but could not recover authoritative results.",
    );
    expect(html).not.toContain("institutionally confirmed");
    expect(html).not.toContain("no explicit bridge");
  });

  it("shows an honest unavailable state instead of a partial field", async () => {
    mocks.loadMayoralCandidates.mockResolvedValue({
      schema_version: 5,
      event_id: "",
      contest_id: "",
      election_date: "",
      ballot_certified: false,
      coverage: {
        policy: "full_verified_canadian_electoral_career",
        jurisdiction: "Canada",
        year_cutoff: null,
        cohort_id: "",
        source_release: "",
        review_date: "",
        methodology_note: "",
      },
      candidates: [],
    } satisfies MayoralCandidatesFeed);

    const html = renderToStaticMarkup(await CandidatesPage());

    expect(html).toContain("candidate list is currently unavailable");
    expect(html).not.toContain("<details>");
  });
});
