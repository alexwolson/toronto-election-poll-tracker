/**
 * Display helpers for a candidate's past election history (ADR 0050 feed). The
 * feed carries raw office/party strings; the public labels live here (our
 * translate-in-the-frontend pattern).
 */

import type { PastElection } from "@/types/feeds";

export function officeLabel(election: PastElection): string {
  switch (election.office_type) {
    case "mp":
      return "MP";
    case "mpp":
      return "MPP";
    case "councillor":
      return "Councillor";
    case "mayor":
      return "Mayor";
    case "trustee":
      if (election.represented_body === "toronto_district_school_board") {
        return "TDSB Trustee";
      }
      if (election.represented_body === "toronto_catholic_district_school_board") {
        return "TCDSB Trustee";
      }
      return "School Trustee";
    default:
      return (
        election.office_type.charAt(0).toUpperCase() + election.office_type.slice(1)
      );
  }
}

/** Shorten common party names; null for non-partisan (municipal) races. */
export function partyLabel(party: string | null): string | null {
  if (!party) return null;
  const p = party.toLowerCase();
  if (p.includes("progressive conservative")) return "PC";
  if (p.includes("liberal")) return "Liberal";
  if (p.includes("new democratic") || p.includes("ndp")) return "NDP";
  if (p.includes("green")) return "Green";
  if (p.includes("people's") || p.includes("peoples")) return "PPC";
  if (p.includes("bloc")) return "Bloc";
  if (p.includes("conservative")) return "Conservative";
  return party;
}

export function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/** "won", or "lost · 2nd of 7" when the placement is known. */
export function resultLabel(election: PastElection): string {
  if (election.result === "won") return "won";
  if (election.rank != null && election.field_size != null) {
    return `lost · ${ordinal(election.rank)} of ${election.field_size}`;
  }
  return "lost";
}

const OFFICE_SENIORITY: Record<string, number> = {
  mayor: 5,
  mp: 4,
  mpp: 3,
  councillor: 2,
  trustee: 1,
};

/** Collapsed-row summary: the top *former* office held + race count. For the
 *  sitting incumbent, councillor wins are their current seat, not a "former"
 *  office, so they don't produce a "Former Councillor" label. Null for empty. */
export function historyHeadline(
  history: PastElection[],
  isIncumbent = false,
): string | null {
  if (history.length === 0) return null;
  const formerWins = history.filter(
    (e) => e.result === "won" && !(isIncumbent && e.office_type === "councillor"),
  );
  const races = history.length;
  const racesLabel = `${races} past ${races === 1 ? "race" : "races"}`;
  if (formerWins.length > 0) {
    const top = formerWins.reduce((a, b) =>
      (OFFICE_SENIORITY[b.office_type] ?? 0) > (OFFICE_SENIORITY[a.office_type] ?? 0)
        ? b
        : a,
    );
    const label = `Former ${officeLabel(top)}`;
    return races > 1 ? `${label} · ${racesLabel}` : label;
  }
  return racesLabel;
}
