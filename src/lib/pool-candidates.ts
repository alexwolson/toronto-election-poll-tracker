import type { PoolModel } from "@/lib/api";

type PoolCandidate = PoolModel["candidates"][string];

/**
 * Fixed, non-cycled color per candidate slug — matches ANTI_CHOW_CANDIDATES
 * order in the backend's pool.py. A slug not yet listed here falls back to
 * RESERVE_COLOR rather than reusing (repainting) an existing candidate's color.
 * Candidate colours are shared with the polling chart and CSS design tokens.
 */
const CANDIDATE_COLORS: Record<string, string> = {
  bradford: "#2E8B57",
  alexander: "#F8C466",
};
const RESERVE_COLOR = "oklch(0.6 0.14 150)";

export function getCandidateColor(slug: string): string {
  return CANDIDATE_COLORS[slug] ?? RESERVE_COLOR;
}

const CANDIDATE_NAMES: Record<string, string> = {
  bradford: "Bradford",
  alexander: "Alexander",
  furey: "Furey",
  bailao: "Bailão",
  tory: "Tory",
  matlow: "Matlow",
  mendicino: "Mendicino",
};

export function getCandidateName(slug: string): string {
  return CANDIDATE_NAMES[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1);
}

/** The tracked candidate with the highest capture_rate, ignoring anyone with
 * zero share (unpolled). Returns null when no candidate has any share yet. */
export function getLeadingCandidate(
  candidates: Record<string, PoolCandidate>
): [string, PoolCandidate] | null {
  const entries = Object.entries(candidates).filter(([, c]) => c.share > 0);
  if (entries.length === 0) return null;
  return entries.reduce((best, cur) =>
    cur[1].capture_rate > best[1].capture_rate ? cur : best
  );
}

/** Whether a poll's field_tested string names this candidate as an exact
 * token — not a substring match. */
export function pollTestedCandidate(fieldTested: string, candidate: string): boolean {
  return fieldTested
    .split(",")
    .map((s) => s.trim())
    .includes(candidate);
}
