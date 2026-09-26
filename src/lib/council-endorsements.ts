import type { CandidateEndorsement } from "@/types/feeds";

/** "Endorsed by A, B and C", or null when nothing is recorded. Descriptive only. */
export function endorsementSummary(endorsements: CandidateEndorsement[] | undefined): string | null {
  const names = (endorsements ?? []).map((endorsement) => endorsement.endorser_name);
  if (names.length === 0) return null;
  const list =
    names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  return `Endorsed by ${list}`;
}
