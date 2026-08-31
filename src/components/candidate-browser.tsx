import { CandidateHistoryItem } from "@/components/candidate-history";
import { historyHeadline, ordinal } from "@/lib/council-history";
import type { MayoralCandidate, PastElection } from "@/types/feeds";

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

export function candidateWallHint(candidate: MayoralCandidate): string | null {
  if (candidate.is_incumbent) return "Incumbent mayor";

  const headline = historyHeadline(candidate.past_elections);
  const formerOffice = headline
    ?.split(" · ")
    .find((part) => part.startsWith("Former "));
  if (formerOffice) return formerOffice;

  const raceCount = candidate.past_elections.length;
  if (raceCount === 1) return "1 past race";
  if (raceCount > 1) return `${raceCount} past races`;
  return null;
}

export function CandidateBrowser({ candidates }: { candidates: MayoralCandidate[] }) {
  return (
    <div className="candidate-browser">
      <p className="candidate-wall__count font-mono">
        {candidates.length} candidates, listed alphabetically by surname
      </p>
      <ul className="candidate-wall">
        {candidates.map((candidate) => {
          const byelection = mayoralByelectionResult(candidate.past_elections);
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
              compact
              compactHint={candidateWallHint(candidate)}
              hasAdditionalDetails={Boolean(candidate.review_limitations)}
              leadDetail={
                byelection ? (
                  <p className="candidate-row__return-detail">
                    {returningDetail(byelection)}
                  </p>
                ) : undefined
              }
            >
              {candidate.review_limitations && (
                <p className="candidate-row__coverage-detail">
                  <strong>History note:</strong> {candidate.review_limitations}
                </p>
              )}
            </CandidateHistoryItem>
          );
        })}
      </ul>
    </div>
  );
}
