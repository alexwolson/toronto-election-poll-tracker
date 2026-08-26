import type { Metadata } from "next";
import { CandidateHistoryItem } from "@/components/candidate-history";
import { loadMayoralCandidates } from "@/lib/feeds";

export const metadata: Metadata = {
  title: "Mayoral Candidates — Toronto 2026 Election",
  description:
    "Every candidate on Toronto's certified 2026 mayoral ballot, with confirmed past election history where available.",
};

export default async function CandidatesPage() {
  const feed = await loadMayoralCandidates();
  const available = feed.ballot_certified && feed.candidates.length > 0;

  return (
    <main id="main-content" className="np-shell">
      <section className="race-hero" aria-labelledby="candidates-heading">
        <p className="np-kicker">Mayor · 2026</p>
        <h1 id="candidates-heading">The 2026 mayoral field</h1>
        <p className="race-hero-dek">
          Every candidate on the certified ballot. Select an expandable name to
          see their confirmed history in municipal, provincial, federal, and
          school-board elections.
        </p>
      </section>

      <section className="ward-detail-section" aria-labelledby="field-heading">
        <h2 id="field-heading">
          {available
            ? `The certified field (${feed.candidates.length})`
            : "The certified field"}
        </h2>
        {available ? (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {feed.candidates.map((candidate) => (
              <CandidateHistoryItem
                key={candidate.candidate_id}
                name={candidate.display_name}
                history={candidate.past_elections}
                currentOfficeType={candidate.is_incumbent ? "mayor" : undefined}
              />
            ))}
          </ul>
        ) : (
          <p className="forecast-unavailable">
            The certified mayoral candidate list is currently unavailable.
          </p>
        )}
      </section>
    </main>
  );
}
