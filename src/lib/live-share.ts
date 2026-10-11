/**
 * A candidate's share on the results pages: one decimal, but never "0.0%" (Alex, 2026-10-11).
 * A share that rounds to 0.0% shows "<0.1%" while the candidate has votes, and "0%" only with
 * none. Shares are percent (0..100). Pass the votes where known: the payload rounds shares, so a
 * handful of votes can arrive as a share of 0.
 */
export function shareText(share: number | null | undefined, votes?: number | null): string {
  if (share === null || share === undefined) return "–";
  if (share >= 0.05) return `${share.toFixed(1)}%`;
  const hasVotes = votes === undefined || votes === null ? share > 0 : votes > 0;
  return hasVotes ? "<0.1%" : "0%";
}
