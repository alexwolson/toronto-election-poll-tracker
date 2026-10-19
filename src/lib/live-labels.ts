/**
 * A candidate's short label on the results pages (#16): the registry last name, or the full
 * Ballot Name. Brad Bradford reads in full (#121, Alex), so the two front-runners match: Olivia
 * Chow's label is her full name because Braeden Chow shares her last name. Found by candidacy
 * id, never by name, as Chow is (#108).
 */

import type { LiveCandidate } from "@/types/live";

/** Candidacies whose short label is their full Ballot Name. */
const FULL_NAME = new Set(["can_b71a736235545b8f8df2a3e196126428"]); // Brad Bradford

export function shortLabel(candidate: Pick<LiveCandidate, "short_label" | "full_name" | "candidacy_id">): string {
  if (candidate.candidacy_id && FULL_NAME.has(candidate.candidacy_id)) return candidate.full_name;
  return candidate.short_label ?? candidate.full_name;
}
