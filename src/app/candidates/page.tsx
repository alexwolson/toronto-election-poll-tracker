import type { Metadata } from "next";
import { CandidateBrowser } from "@/components/candidate-browser";
import { CandidateLinksNote } from "@/components/candidate-history";
import { MayorTabs } from "@/components/mayor-tabs";
import { PageHero } from "@/components/page-hero";
import { loadMayoralCandidates } from "@/lib/feeds";

export const metadata: Metadata = {
  title: "Candidates on the 2026 Mayoral Ballot — Toronto Election",
  description:
    "Every candidate on Toronto's certified 2026 mayoral ballot, with confirmed past election history where available.",
};

export default async function CandidatesPage() {
  const feed = await loadMayoralCandidates();
  const available = feed.ballot_certified && feed.candidates.length > 0;

  return (
    <main id="main-content" className="np-shell">
      <PageHero
        headingId="candidates-heading"
        title="Candidates on the 2026 mayoral ballot"
        description="Browse the certified ballot, then open a name to see verified election history."
      >
        {available && feed.coverage.methodology_note ? (
          <p className="candidate-coverage-note">{feed.coverage.methodology_note}</p>
        ) : null}
      </PageHero>

      <MayorTabs activeTab="candidates" />

      <section className="ward-detail-section" aria-label="Candidate roster">
        {available ? (
          <CandidateBrowser candidates={feed.candidates} />
        ) : (
          <p className="forecast-unavailable">
            The certified mayoral ballot is not available yet.
          </p>
        )}
        {available && feed.candidates.some((candidate) => candidate.campaign_url) && (
          <CandidateLinksNote />
        )}
      </section>
    </main>
  );
}
