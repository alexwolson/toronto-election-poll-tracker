/**
 * What each race page needs from the build-time feeds and the editor's set-up, and nothing more
 * (the Council feed alone is ~480 KB): the race's names and URL, who the incumbents are, the last
 * comparable result, the race card's polls and risk factors, and each candidate's background and
 * past races. Built on the server; the count arrives in the browser.
 */

import { incumbentWard } from "@/lib/council-incumbents";
import { councilEditorial, trusteeEditorial } from "@/lib/editorial-races";
import { slugify, trusteeSlug, type EditorialRace } from "@/lib/race-model";
import { TRUSTEE_BOARD_NAV } from "@/lib/trustees";
import type { CouncilRaceCardsFeed, PastElection, PriorResult, TrusteeRaceCardsFeed, WardPoll } from "@/types/feeds";

export type RaceKind = "council" | "trustee" | "french";

export interface CandidateSetup {
  name: string;
  /** The editor's one line of background, if any. */
  line: string | null;
  /** "Incumbent", "Previous councillor for University-Rosedale" or "Former councillor". */
  tag: string | null;
  past: PastElection[];
  url: string | null;
}

export interface RaceSetup {
  /** The payload's race id: "councillor-4", "tdsb-5", "viamonde-3". */
  id: string;
  kind: RaceKind;
  num: string;
  /** The page's path, with the site's trailing slash. */
  href: string;
  /** "Parkdale-High Park", "TDSB Ward 5", "Viamonde, Ward 3 (Centre)". */
  title: string;
  /** Above the title: "Ward 4", or the board's full name. */
  kicker: string;
  boardId: string | null;
  boardShort: string | null;
  /** A trustee area's own name: "Centre", or its wards for TDSB and TCDSB. */
  areaName: string | null;
  /** The City wards the race covers. */
  cityWards: string[];
  open: boolean;
  acclaimed: boolean;
  incumbents: string[];
  ed: EditorialRace;
  prior: PriorResult | null;
  /** The race card's risk factors for the incumbent, by key. */
  exposure: string[];
  polls: WardPoll[];
  /** By candidacy id, else by name. */
  candidates: Record<string, CandidateSetup>;
  /** The pre-election page with every candidate's full history. */
  profileHref: string;
}

/** Which boards have their own page per race; the French boards share one bilingual page. */
const FRENCH = new Set(["viamonde", "monavenir"]);

/** Sitting councillors by name → their ward, so one running elsewhere is never tagged "former". */
function sittingCouncillors(council: CouncilRaceCardsFeed): Map<string, string> {
  return new Map(
    Object.entries(council.wards)
      .filter(([, card]) => card.incumbent?.name)
      .map(([num, card]) => [card.incumbent.name, num]),
  );
}

export function raceSetups(council: CouncilRaceCardsFeed, trustees: TrusteeRaceCardsFeed): RaceSetup[] {
  const sitting = sittingCouncillors(council);
  const wardName = (num: string) => council.wards[num]?.ward_name?.trim() ?? `Ward ${num}`;
  const setups: RaceSetup[] = [];

  for (const [num, card] of Object.entries(council.wards).sort((a, b) => Number(a[0]) - Number(b[0]))) {
    const ed = councilEditorial(num);
    const name = wardName(num);
    // The running incumbent by candidacy id: the feed's when published, else the incumbents table.
    const incumbent = card.is_open_seat
      ? null
      : (card.candidates.find((c) => c.candidacy_id && (c.candidacy_id === card.incumbent_candidacy_id || incumbentWard(c.candidacy_id) === num)) ?? null);
    const candidates: Record<string, CandidateSetup> = {};
    for (const c of card.candidates) {
      const elsewhere = sitting.get(c.display_name);
      const tag =
        c === incumbent
          ? "Incumbent"
          : elsewhere && elsewhere !== num
            ? `Previous councillor for ${wardName(elsewhere)}`
            : c.is_former_councillor && !elsewhere
              ? "Former councillor"
              : null;
      candidates[c.candidacy_id ?? c.display_name] = { name: c.display_name, line: ed.lines?.[c.display_name] ?? null, tag, past: c.past_elections, url: c.campaign_url };
    }
    setups.push({
      id: `councillor-${num}`,
      kind: "council",
      num,
      href: `/${slugify(name)}/`,
      title: name,
      kicker: `Ward ${num}`,
      boardId: null,
      boardShort: null,
      areaName: null,
      cityWards: [num],
      open: card.is_open_seat,
      acclaimed: false,
      incumbents: incumbent ? [incumbent.display_name] : [],
      ed,
      prior: card.prior_result,
      exposure: (card.incumbent?.exposure_triggers ?? []).map((t) => t.key),
      polls: card.ward_polls ?? [],
      candidates,
      profileHref: `/wards/${num}/`,
    });
  }

  for (const nav of TRUSTEE_BOARD_NAV) {
    const board = trustees.boards.find((b) => b.board_id === nav.boardId);
    for (const ward of [...(board?.wards ?? [])].sort((a, b) => Number(a.ward_id) - Number(b.ward_id))) {
      const id = `${nav.boardId}-${ward.ward_id}`;
      const areaName = ward.district_name.replace(/^Ward \d+\s*[—–-]\s*/, "");
      const french = FRENCH.has(nav.boardId);
      const slug = trusteeSlug(nav.boardId, ward.ward_id, areaName);
      const candidates: Record<string, CandidateSetup> = {};
      for (const c of ward.candidates) {
        candidates[c.candidacy_id] = { name: c.display_name, line: null, tag: c.is_incumbent ? "Incumbent" : null, past: c.past_elections, url: c.campaign_url };
      }
      setups.push({
        id,
        kind: french ? "french" : "trustee",
        num: ward.ward_id,
        href: french ? `/conseils-scolaires/#${slug.replace("/", "-")}` : `/${slug}/`,
        title: french ? `${nav.shortName}, Ward ${ward.ward_id} (${areaName})` : `${nav.shortName} Ward ${ward.ward_id}`,
        kicker: board?.display_name ?? nav.shortName,
        boardId: nav.boardId,
        boardShort: nav.shortName,
        areaName,
        cityWards: ward.city_wards.map(String),
        open: ward.race_context.category === "open",
        acclaimed: ward.acclaimed,
        incumbents: ward.candidates.filter((c) => c.is_incumbent === true).map((c) => c.display_name),
        ed: trusteeEditorial(id, ward),
        prior: ward.comparable_prior_result,
        exposure: [],
        polls: [],
        candidates,
        profileHref: `/trustees/${nav.boardId}/${ward.ward_id}/`,
      });
    }
  }
  return setups;
}

/** A candidate's set-up by candidacy id, falling back to their name. */
export function candidateSetup(setup: RaceSetup, candidate: { candidacy_id: string | null; full_name: string }): CandidateSetup | null {
  return (
    (candidate.candidacy_id && setup.candidates[candidate.candidacy_id]) ||
    Object.values(setup.candidates).find((c) => c.name === candidate.full_name) ||
    null
  );
}
