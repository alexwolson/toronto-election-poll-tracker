import type { Metadata } from "next";
import { CandidateHistoryItem, CandidateLinksNote } from "@/components/candidate-history";
import { MayorTabs } from "@/components/mayor-tabs";
import { ordinal } from "@/lib/council-history";
import { loadMayoralCandidates } from "@/lib/feeds";
import type { PastElection } from "@/types/feeds";

const MAYORAL_BYELECTION_DATE = "2023-06-26";

function mayoralByelectionResult(history: PastElection[]): PastElection | undefined {
  return history.find(
    (election) =>
      election.election_date === MAYORAL_BYELECTION_DATE &&
      election.office_type === "mayor" &&
      election.represented_body === "toronto_city_council",
  );
}

function returningDetail(election: PastElection): string {
  const parts = ["2023 mayoral by-election"];
  if (election.rank !== null && election.field_size !== null) {
    parts.push(`${ordinal(election.rank)} of ${election.field_size}`);
  }
  if (election.vote_share !== null) {
    const share =
      election.vote_share < 0.001
        ? "<0.1%"
        : `${(election.vote_share * 100).toFixed(1)}%`;
    parts.push(`${share} of votes cast`);
  }
  return parts.join(" · ");
}

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
        {available && feed.coverage.methodology_note && (
          <p className="candidate-coverage-note">{feed.coverage.methodology_note}</p>
        )}
      </section>

      <MayorTabs activeTab="candidates" />

      <section className="ward-detail-section" aria-labelledby="field-heading">
        <h2 id="field-heading">
          {available
            ? `The certified field (${feed.candidates.length})`
            : "The certified field"}
        </h2>
        {available ? (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {feed.candidates.map((candidate) => {
              const byelection = mayoralByelectionResult(candidate.past_elections);
              const hasHistory = candidate.past_elections.length > 0;
              const summaryPrefix = candidate.is_incumbent
                ? "Incumbent Mayor"
                : byelection
                  ? "Returning"
                  : undefined;

              return (
                <CandidateHistoryItem
                  key={candidate.candidacy_id}
                  name={candidate.display_name}
                  campaignUrl={candidate.campaign_url}
                  history={candidate.past_elections}
                  currentOfficeType={candidate.is_incumbent ? "mayor" : undefined}
                  summaryPrefix={summaryPrefix}
                  leadDetail={
                    byelection ? (
                      <p className="candidate-row__return-detail">
                        {returningDetail(byelection)}
                      </p>
                    ) : undefined
                  }
                >
                  {hasHistory && candidate.review_limitations && (
                    <p className="candidate-row__coverage-detail">
                      <strong>Coverage note:</strong> {candidate.review_limitations}
                    </p>
                  )}
                </CandidateHistoryItem>
              );
            })}
          </ul>
        ) : (
          <p className="forecast-unavailable">
            The certified mayoral candidate list is currently unavailable.
          </p>
        )}
        {available && feed.candidates.some((candidate) => candidate.campaign_url) && (
          <CandidateLinksNote />
        )}
      </section>
    </main>
  );
}
