import type { CandidateEndorsement } from "@/types/feeds";

/** Where each endorsement was published. The fact itself is stated once, in the
 *  candidate's summary line; this is only its source. */
export function CandidateEndorsements({ endorsements }: { endorsements: CandidateEndorsement[] }) {
  const sourced = endorsements.filter((endorsement) => endorsement.source_url);
  if (sourced.length === 0) return null;
  return (
    <p className="candidate-row__sources">
      <span className="candidate-row__sources-label">Source</span>
      {sourced.map((endorsement) => (
        <a
          key={endorsement.endorser_id}
          className="candidate-row__campaign-link"
          href={endorsement.source_url!}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${endorsement.endorser_name} endorsement source (opens in a new tab)`}
        >
          {endorsement.endorser_name} <span aria-hidden="true">↗</span>
        </a>
      ))}
    </p>
  );
}

/** Endorsement lists are partial: absence is not a signal. */
export function EndorsementsNote() {
  return <p className="candidate-links-note">Endorsement lists are partial and still growing.</p>;
}
