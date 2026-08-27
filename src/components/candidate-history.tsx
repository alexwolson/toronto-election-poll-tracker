import type { ReactNode } from "react";
import {
  historyHeadline,
  officeLabel,
  partyLabel,
  resultLabel,
} from "@/lib/council-history";
import type { PastElection } from "@/types/feeds";

const SOCIAL_HOSTS = new Set([
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "tiktok.com",
  "twitter.com",
  "x.com",
  "youtube.com",
  "youtu.be",
]);

function campaignLinkLabel(url: string) {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return SOCIAL_HOSTS.has(hostname) ? "Candidate link" : "Website";
  } catch {
    return "Candidate link";
  }
}

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
  campaignUrl,
  summaryPrefix,
  leadDetail,
  hasAdditionalDetails = false,
  children,
}: {
  name: string;
  history: PastElection[];
  currentOfficeType?: string;
  campaignUrl?: string | null;
  summaryPrefix?: string | null;
  leadDetail?: ReactNode;
  hasAdditionalDetails?: boolean;
  children?: ReactNode;
}) {
  const headline = historyHeadline(history, currentOfficeType);
  const summary = [summaryPrefix, headline].filter(Boolean).join(" · ");
  const expandable = history.length > 0 || hasAdditionalDetails;
  const campaignLink = campaignUrl ? (
    <a
      className="candidate-row__campaign-link"
      href={campaignUrl}
      target="_blank"
      rel="noopener noreferrer"
    >
      {campaignLinkLabel(campaignUrl)} <span aria-hidden="true">↗</span>
    </a>
  ) : null;
  const label = (
    <>
      <span className="candidate-row__name">{name}</span>
      {summary && <span className="candidate-row__headline">{summary}</span>}
    </>
  );

  if (!expandable) {
    return (
      <li className="candidate-row candidate-row--plain">
        <div className="candidate-row__topline">
          <div>{label}</div>
          {campaignLink}
        </div>
      </li>
    );
  }

  return (
    <li className="candidate-row">
      <div className="candidate-row__topline">
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
        {campaignLink}
      </div>
    </li>
  );
}

export function CandidateLinksNote() {
  return (
    <p className="candidate-links-note">
      Campaign links were supplied by candidates to the City Clerk and are not
      reviewed or endorsed by the City. {" "}
      <a
        href="https://www.toronto.ca/city-government/elections/candidate-list/"
        target="_blank"
        rel="noopener noreferrer"
      >
        About candidate links <span aria-hidden="true">↗</span>
      </a>
    </p>
  );
}
