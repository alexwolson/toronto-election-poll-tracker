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

function campaignLinkAccessibleLabel(name: string, url: string) {
  const destination =
    campaignLinkLabel(url) === "Website" ? "campaign website" : "candidate link";
  return `${name} ${destination} (opens in a new tab)`;
}

function PastElectionRow({ election }: { election: PastElection }) {
  const party = partyLabel(election.party_name);
  const district = election.district_display_name ?? election.district_name;
  return (
    <li className="past-election">
      <span className="past-election__year">{election.year}</span>
      <span className="past-election__office">{officeLabel(election)}</span>
      {district && <span className="past-election__district">{district}</span>}
      {party && <span className="past-election__party">{party}</span>}
      <span className={`past-election__result past-election__result--${election.result}`}>
        {resultLabel(election)}
      </span>
    </li>
  );
}

export function CandidateHistoryItem({
  id,
  name,
  history,
  currentOfficeType,
  campaignUrl,
  summaryPrefix,
  leadDetail,
  hasAdditionalDetails = false,
  compact = false,
  compactHint,
  children,
}: {
  id?: string;
  name: string;
  history: PastElection[];
  currentOfficeType?: string;
  campaignUrl?: string | null;
  summaryPrefix?: string | null;
  leadDetail?: ReactNode;
  hasAdditionalDetails?: boolean;
  compact?: boolean;
  compactHint?: string | null;
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
      aria-label={campaignLinkAccessibleLabel(name, campaignUrl)}
    >
      {campaignLinkLabel(campaignUrl)} <span aria-hidden="true">↗</span>
    </a>
  ) : null;
  const label = compact ? (
    <span className="candidate-row__compact-label">
      <span className="candidate-row__name">{name}</span>
      {compactHint && <span className="candidate-row__hint">{compactHint}</span>}
    </span>
  ) : (
    <>
      <span className="candidate-row__name">{name}</span>
      {summary && <span className="candidate-row__headline">{summary}</span>}
    </>
  );

  if (!expandable && compact && campaignUrl) {
    return (
      <li id={id} className="candidate-row candidate-row--plain candidate-row--compact">
        <div className="candidate-row__topline">
          <a
            className="candidate-row__direct-link"
            href={campaignUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={campaignLinkAccessibleLabel(name, campaignUrl)}
          >
            <span className="candidate-row__compact-label">
              <span className="candidate-row__name">{name}</span>
              <span className="candidate-row__hint">
                {campaignLinkLabel(campaignUrl)} <span aria-hidden="true">↗</span>
              </span>
            </span>
          </a>
        </div>
      </li>
    );
  }

  if (!expandable) {
    return (
      <li
        id={id}
        className={`candidate-row candidate-row--plain${
          compact ? " candidate-row--compact" : ""
        }`}
      >
        <div className="candidate-row__topline">
          <div>{label}</div>
          {!compact && campaignLink}
        </div>
      </li>
    );
  }

  return (
    <li id={id} className={`candidate-row${compact ? " candidate-row--compact" : ""}`}>
      <div className="candidate-row__topline">
        <details>
          <summary className="candidate-row__summary">{label}</summary>
          <div className="candidate-row__body">
            {compact && summary && (
              <p className="candidate-row__compact-summary">{summary}</p>
            )}
            {leadDetail}
            {history.length > 0 && (
              <ul className="past-elections">
                {history.map((election) => (
                  <PastElectionRow
                    key={`${election.election_date}:${election.office_type}:${election.district_display_name ?? election.district_name ?? ""}`}
                    election={election}
                  />
                ))}
              </ul>
            )}
            {children}
            {compact && campaignLink && (
              <p className="candidate-row__compact-link">{campaignLink}</p>
            )}
          </div>
        </details>
        {!compact && campaignLink}
      </div>
    </li>
  );
}

export function CandidateLinksNote() {
  return (
    <p className="candidate-links-note">
      Campaign links come from candidate submissions to the City Clerk. The City
      does not review or endorse them. {" "}
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
