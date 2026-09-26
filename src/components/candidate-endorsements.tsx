import type { CandidateEndorsement } from "@/types/feeds";

/** The endorsers behind a candidate, each linked to its published source. */
export function CandidateEndorsements({ endorsements }: { endorsements: CandidateEndorsement[] }) {
  return (
    <p className="candidate-row__endorsements">
      Endorsed by{" "}
      {endorsements.map((endorsement, index) => (
        <span key={endorsement.endorser_id}>
          {index > 0 && (index === endorsements.length - 1 ? " and " : ", ")}
          {endorsement.source_url ? (
            <a href={endorsement.source_url} target="_blank" rel="noopener noreferrer">
              {endorsement.endorser_name} <span aria-hidden="true">↗</span>
            </a>
          ) : (
            endorsement.endorser_name
          )}
        </span>
      ))}
    </p>
  );
}

/** Endorsement lists are partial: absence is not a signal. */
export function EndorsementsNote() {
  return (
    <p className="candidate-links-note">
      Endorsements come from each group&rsquo;s own published list. Lists are partial and grow
      during the campaign, so a candidate without one may simply not be listed yet.
    </p>
  );
}
