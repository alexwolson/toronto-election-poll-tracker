/**
 * The editor's set-up for each race (Alex, 2026-10-24), from `src/data/editorial-races.json`:
 * council races by ward; trustee races by their race card's category unless overridden; and the
 * mayor's Suspended Campaigns newer than the candidate feed, with endorsements. Reviewed before
 * the night; the count can still override it on the page (`promotionReasons`).
 */

import data from "@/data/editorial-races.json";
import type { EditorialRace, EditorialType } from "@/lib/race-model";
import type { MayoralCandidatesFeed, TrusteeWard } from "@/types/feeds";

interface EditorialFile {
  council: Record<string, EditorialRace>;
  trustees: Record<string, Partial<EditorialRace>>;
  mayor: { suspended: Record<string, string>; endorsed: Record<string, string> };
}

const FILE = data as unknown as EditorialFile;

/** A trustee race card's category → the page's treatment. */
const TRUSTEE_TYPE: Record<string, EditorialType> = {
  acclaimed: "acclaimed",
  two_incumbents: "head",
  one_incumbent: "incumbent",
  contested_incumbent: "incumbent",
  won_without_majority: "incumbent",
  open: "open",
};

export function councilEditorial(ward: string): EditorialRace {
  return FILE.council[ward] ?? { type: "incumbent", featured: [] };
}

/** A trustee race's set-up: its card's category, its incumbents featured (every candidate when
 *  acclaimed), then any override. */
export function trusteeEditorial(raceId: string, ward: TrusteeWard): EditorialRace {
  const incumbents = ward.candidates.filter((c) => c.is_incumbent === true).map((c) => c.display_name);
  const auto: EditorialRace = {
    type: ward.acclaimed ? "acclaimed" : (TRUSTEE_TYPE[ward.race_context.category] ?? "open"),
    featured: ward.acclaimed ? ward.candidates.map((c) => c.display_name) : incumbents,
    compare: "prior",
  };
  return { ...auto, ...(FILE.trustees[raceId] ?? {}) };
}

/** Every Suspended Campaign by candidate name, ISO date: the candidate feed's, then the editor's. */
export function suspendedCampaigns(feed: MayoralCandidatesFeed | null): Record<string, string> {
  const fromFeed = Object.fromEntries(
    (feed?.candidates ?? []).filter((c) => c.campaign_suspended_on).map((c) => [c.display_name, c.campaign_suspended_on as string]),
  );
  return { ...fromFeed, ...FILE.mayor.suspended };
}

/** Endorsements a suspended candidate made, by name. */
export function endorsements(): Record<string, string> {
  return FILE.mayor.endorsed;
}

export const EDITORIAL_COUNCIL = FILE.council;
