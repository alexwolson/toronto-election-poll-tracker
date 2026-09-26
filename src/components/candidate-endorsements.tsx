import type { CandidateEndorsement } from "@/types/feeds";

/** Who has endorsed the candidate, shown in the expanded row only; each
 *  endorser's name links to where the endorsement was published. */
export function CandidateEndorsements({ endorsements }: { endorsements: CandidateEndorsement[] }) {
  return (
    <p className="candidate-row__sources">
      <span className="candidate-row__sources-label">Endorsed by</span>
      {endorsements.map((endorsement) =>
        endorsement.source_url ? (
          <a
            key={endorsement.endorser_id}
            className="candidate-row__campaign-link"
            href={endorsement.source_url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${endorsement.endorser_name} (endorsement source, opens in a new tab)`}
          >
            {endorsement.endorser_name} <span aria-hidden="true">↗</span>
          </a>
        ) : (
          <span key={endorsement.endorser_id} className="candidate-row__campaign-link">
            {endorsement.endorser_name}
          </span>
        ),
      )}
    </p>
  );
}

/** Endorsement lists are partial: absence is not a signal. */
export function EndorsementsNote() {
  return <p className="candidate-links-note">Endorsement lists are partial and still growing.</p>;
}
