/**
 * Display helpers for a candidate's past election history (ADR 0050 feed). The
 * feed carries raw office/party strings; the public labels live here (our
 * translate-in-the-frontend pattern).
 */

import type { CouncilCandidate, PastElection, PriorResult } from "@/types/feeds";

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

// Exact canonical party name -> concise public label. Exact matching only, so an
// unrelated party whose name merely contains "Liberal"/"Green"/etc. is never
// collapsed. Unknown parties keep their canonical name; non-partisan races (empty
// party) get no label.
const PARTY_LABELS: Record<string, string> = {
  // Federal
  "Conservative Party of Canada": "Conservative",
  "Liberal Party of Canada": "Liberal",
  "New Democratic Party": "NDP",
  "Green Party of Canada": "Green",
  "People's Party - PPC": "PPC",
  "People's Party of Canada": "PPC",
  // Ontario
  "Progressive Conservative Party of Ontario": "PC",
  "Ontario Liberal Party": "Liberal",
  "New Democratic Party of Ontario": "NDP",
  "Green Party of Ontario": "Green",
  "New Blue Party of Ontario": "New Blue",
  "Ontario Party": "Ontario Party",
};

/** Concise public party label by exact canonical name; the canonical name itself
 *  for parties without an approved label; null for non-partisan (municipal). */
export function partyLabel(party: string | null): string | null {
  if (!party) return null;
  return PARTY_LABELS[party] ?? party;
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

function electionShareLabel(share: number): string {
  return share < 0.001 ? "<0.1%" : `${(share * 100).toFixed(1)}%`;
}

/** Result, placement when known, and vote share when available. */
export function resultLabel(election: PastElection): string {
  const parts: string[] = [election.result];
  if (election.result === "lost" && election.rank != null && election.field_size != null) {
    parts.push(`${ordinal(election.rank)} of ${election.field_size}`);
  }
  if (election.vote_share != null) parts.push(electionShareLabel(election.vote_share));
  return parts.join(" · ");
}

export interface SameWardReturnSummary {
  topline: "Returning";
  detail: string;
}

/** Display context for a challenger who also contested this exact 25-ward
 * council district in its most recent election. For wards with a by-election,
 * that newer contest replaces 2022 entirely. */
export function sameWardReturnSummary(
  candidate: CouncilCandidate,
  ward: string,
  prior: PriorResult | null,
  isIncumbent = false,
): SameWardReturnSummary | null {
  if (isIncumbent || !prior) return null;
  const electionYear = prior.year;

  const ranHere = candidate.biography?.appearances.some(
    (appearance) =>
      appearance.year === electionYear &&
      appearance.boundary_era === "25-ward" &&
      appearance.ward === ward,
  );
  if (!ranHere) return null;

  const election = candidate.past_elections.find(
    (race) =>
      race.year === electionYear &&
      race.office_type === "councillor" &&
      race.represented_body === "toronto_city_council",
  );

  if (candidate.display_name === prior.winner_name) {
    return null;
  }

  if (election?.rank === 2) {
    if (
      candidate.display_name === prior.runner_up_name &&
      prior.margin_votes !== null
    ) {
      const votes = prior.margin_votes.toLocaleString("en-CA");
      return {
        topline: "Returning",
        detail: `${electionYear} runner-up in this ward · lost by ${votes} ${prior.margin_votes === 1 ? "vote" : "votes"}`,
      };
    }
    return { topline: "Returning", detail: `${electionYear} runner-up in this ward` };
  }

  if (election?.rank != null && election.field_size != null) {
    return {
      topline: "Returning",
      detail: `Ran in this ward in ${electionYear} · ${ordinal(election.rank)} of ${election.field_size}`,
    };
  }

  return { topline: "Returning", detail: `Ran in this ward in ${electionYear}` };
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
  currentOfficeType?: string,
): string | null {
  if (history.length === 0) return null;
  const formerWins = history.filter(
    (e) => e.result === "won" && e.office_type !== currentOfficeType,
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
