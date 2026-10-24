/**
 * What the citywide results page needs from the feeds (results redesign): each race's card facts,
 * trimmed from its race page's setup, the candidates the forecast and its polls name (the
 * comparison group for the two Chows), and the mayor's Suspended Campaigns.
 */

import { endorsements, suspendedCampaigns } from "@/lib/editorial-races";
import type { EditorialRace } from "@/lib/race-model";
import type { RaceKind, RaceSetup } from "@/lib/race-setup";
import type { MayoralCandidatesFeed, MayoralForecastFeed } from "@/types/feeds";

export interface HomeRace {
  id: string;
  kind: RaceKind;
  num: string;
  href: string;
  title: string;
  boardId: string | null;
  boardShort: string | null;
  areaName: string | null;
  ed: Pick<EditorialRace, "type" | "featured" | "outside" | "compare"> & { poll: string | null };
  /** By candidate name. */
  lines: Record<string, string>;
  tags: Record<string, string>;
  /** "2022: Nunziata beat Padovani by 94 votes (0.4 points)", for a head-to-head's card. */
  prior: string | null;
  incumbents: string[];
  acclaimed: boolean;
}

const last = (name: string) => name.split(" ").slice(-1)[0];

export function homeRaces(setups: RaceSetup[]): HomeRace[] {
  return setups.map((s) => {
    const p = s.prior;
    const q = s.ed.polls?.[0];
    const poll = s.ed.compare === "poll" && q ? `${q.firm} poll, ${q.dates} (${q.n.toLocaleString("en-CA")} respondents): ${q.shares.slice(0, 2).map((x) => `${last(x.name)} ${x.share.toFixed(0)}`).join(", ")}` : null;
    const twoIncumbents = !p && s.incumbents.length === 2 && s.ed.type === "head";
    return {
      id: s.id,
      kind: s.kind,
      num: s.num,
      href: s.href,
      title: s.title,
      boardId: s.boardId,
      boardShort: s.boardShort,
      areaName: s.areaName,
      ed: { type: s.ed.type, featured: s.ed.featured, outside: s.ed.outside, compare: s.ed.compare, poll },
      lines: Object.fromEntries(Object.values(s.candidates).filter((c) => c.line).map((c) => [c.name, c.line!])),
      tags: Object.fromEntries(Object.values(s.candidates).filter((c) => c.tag).map((c) => [c.name, c.tag!])),
      prior:
        p && p.runner_up_name && p.margin_votes !== null
          ? `${p.year === 2022 ? "2022" : `${p.year} by-election`}: ${last(p.winner_name)} beat ${last(p.runner_up_name)} by ${p.margin_votes.toLocaleString("en-CA")} ${p.margin_votes === 1 ? "vote" : "votes"} (${((p.margin_share ?? 0) * 100).toFixed(1)} points)`
          : twoIncumbents
            ? "Both are sitting TDSB trustees"
            : null,
      incumbents: s.incumbents,
      acclaimed: s.acclaimed,
    };
  });
}

/** Everyone the forecast or its polls name: the rest of the mayoral field is the "unknown"
 *  comparison group for Braeden Chow's count. */
export function namedMayoralCandidates(forecast: MayoralForecastFeed): string[] {
  const day = forecast.election_day;
  if (!day) return [];
  return [
    ...day.candidates.map((c) => c.display_name),
    ...day.other_candidates.includes.map((c) => c.display_name),
    ...day.residual_pool.named_in_polls.map((c) => c.display_name),
  ];
}

export interface MayorNotesData {
  /** Candidate name → ISO date. */
  suspended: Record<string, string>;
  endorsed: Record<string, string>;
}

export function mayorNotes(candidates: MayoralCandidatesFeed | null): MayorNotesData {
  return { suspended: suspendedCampaigns(candidates), endorsed: endorsements() };
}
