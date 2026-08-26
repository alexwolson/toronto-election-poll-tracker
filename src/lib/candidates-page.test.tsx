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
    mocks.loadMayoralCandidates.mockResolvedValue(
      candidatesFixture as unknown as MayoralCandidatesFeed,
    );

    const html = renderToStaticMarkup(await CandidatesPage());

    expect(html).toContain("The certified field (53)");
    expect(html).toContain("Olivia Chow");
    expect(html).toContain("Chris Alexander");
    expect(html).toContain("Former MP · 8 past races");
    expect(html).not.toContain("Former Mayor");
    expect(html.match(/<details>/g)).toHaveLength(23);
    expect(html).toContain(
      '<li class="candidate-row candidate-row--plain"><span class="candidate-row__name">Chris Alexander</span>',
    );
  });

  it("shows an honest unavailable state instead of a partial field", async () => {
    mocks.loadMayoralCandidates.mockResolvedValue({
      schema_version: 1,
      election_cycle_id: "",
      ballot_certified: false,
      candidates: [],
    } satisfies MayoralCandidatesFeed);

    const html = renderToStaticMarkup(await CandidatesPage());

    expect(html).toContain("candidate list is currently unavailable");
    expect(html).not.toContain("<details>");
  });
});
