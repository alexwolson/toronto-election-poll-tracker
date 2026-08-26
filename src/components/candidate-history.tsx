import type { ReactNode } from "react";
import {
  historyHeadline,
  officeLabel,
  partyLabel,
  resultLabel,
} from "@/lib/council-history";
import type { PastElection } from "@/types/feeds";

function PastElectionRow({ election }: { election: PastElection }) {
  const party = partyLabel(election.party_name);
  return (
    <li className="past-election">
      <span className="past-election__year">{election.year}</span>
      <span className="past-election__office">
        {officeLabel(election)}
        {election.district_name ? `, ${election.district_name}` : ""}
      </span>
      {party && <span className="past-election__party">{party}</span>}
      <span className={`past-election__result past-election__result--${election.result}`}>
        {resultLabel(election)}
      </span>
    </li>
  );
}

export function CandidateHistoryItem({
  name,
  history,
  currentOfficeType,
  summaryPrefix,
  leadDetail,
  hasAdditionalDetails = false,
  children,
}: {
  name: string;
  history: PastElection[];
  currentOfficeType?: string;
  summaryPrefix?: string | null;
  leadDetail?: ReactNode;
  hasAdditionalDetails?: boolean;
  children?: ReactNode;
}) {
  const headline = historyHeadline(history, currentOfficeType);
  const summary = [summaryPrefix, headline].filter(Boolean).join(" · ");
  const expandable = history.length > 0 || hasAdditionalDetails;
  const label = (
    <>
      <span className="candidate-row__name">{name}</span>
      {summary && <span className="candidate-row__headline">{summary}</span>}
    </>
  );

  if (!expandable) {
    return <li className="candidate-row candidate-row--plain">{label}</li>;
  }

  return (
    <li className="candidate-row">
      <details>
        <summary className="candidate-row__summary">{label}</summary>
        <div className="candidate-row__body">
          {leadDetail}
          {history.length > 0 && (
            <ul className="past-elections">
              {history.map((election) => (
                <PastElectionRow
                  key={`${election.election_date}:${election.office_type}:${election.district_name ?? ""}`}
                  election={election}
                />
              ))}
            </ul>
          )}
          {children}
        </div>
      </details>
    </li>
  );
}
