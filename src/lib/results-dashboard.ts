/**
 * The results dashboard's state (Alex, 2026-10-20): one citywide page with a tab per race type,
 * every race of that type at a glance, one open in full, a sort, and your ward highlighted. All
 * of it in the URL, so a view can be shared. The race type shares the Map's `race` parameter
 * (the same values), so the two follow each other; your ward is `myward`, apart from the Map's
 * held `ward`.
 */

import type { LivePayload, LiveRace } from "@/types/live";
import { raceLead, reportedFraction } from "./live-map";

export type RaceType = "mayor" | "council" | "tdsb" | "tcdsb" | "french";
export type DashboardView = "races" | "map" | "count" | "tables";
export type RaceSort = "number" | "close" | "counted" | "incumbent";

export interface DashboardState {
  race: RaceType;
  view: DashboardView;
  /** The reader's ward, highlighted; null when none is set. */
  myWard: string | null;
  /** The race shown in full in its type's grid, by payload id. */
  open: string | null;
  sort: RaceSort;
}

export const RACE_TYPES: readonly { id: RaceType; label: string }[] = [
  { id: "mayor", label: "Mayor" },
  { id: "council", label: "Council" },
  { id: "tdsb", label: "TDSB" },
  { id: "tcdsb", label: "TCDSB" },
  { id: "french", label: "French boards" },
];
const VIEWS: readonly DashboardView[] = ["races", "map", "count", "tables"];
const SORTS: readonly RaceSort[] = ["number", "close", "counted", "incumbent"];

function oneOf<T extends string>(value: string | null, options: readonly T[], fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback;
}

export function dashboardFrom(params: URLSearchParams, wardNums: readonly string[]): DashboardState {
  const myWard = params.get("myward");
  return {
    race: oneOf(params.get("race"), RACE_TYPES.map((t) => t.id), "mayor"),
    view: oneOf(params.get("view"), VIEWS, "races"),
    myWard: myWard !== null && wardNums.includes(myWard) ? myWard : null,
    open: params.get("open"),
    sort: oneOf(params.get("sort"), SORTS, "number"),
  };
}

/** The page's URL with these changes, keeping its other parameters and leaving defaults out. A
 *  new race type closes the open race. */
export function dashboardHref(pathname: string, params: URLSearchParams, change: Partial<DashboardState>): string {
  const next = new URLSearchParams(params);
  const put = (key: string, value: string | null) => (value === null ? next.delete(key) : next.set(key, value));
  if (change.race !== undefined) {
    put("race", change.race === "mayor" ? null : change.race);
    if (change.open === undefined) next.delete("open");
  }
  if (change.view !== undefined) put("view", change.view === "races" ? null : change.view);
  if (change.myWard !== undefined) put("myward", change.myWard);
  if (change.open !== undefined) put("open", change.open);
  if (change.sort !== undefined) put("sort", change.sort === "number" ? null : change.sort);
  const query = next.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function racesOfType(payload: LivePayload, type: RaceType): LiveRace[] {
  return payload.races.filter((race) => {
    switch (type) {
      case "mayor":
        return race.level === "mayor";
      case "council":
        return race.level === "council";
      case "tdsb":
      case "tcdsb":
        return race.level === "trustee" && race.id.startsWith(`${type}-`);
      case "french":
        return race.level === "french_trustee";
    }
  });
}

/** A race's tab on the dashboard. */
export function raceTypeOf(race: Pick<LiveRace, "id" | "level">): RaceType {
  if (race.level === "council") return "council";
  if (race.level === "french_trustee") return "french";
  if (race.level === "trustee") return race.id.startsWith("tcdsb-") ? "tcdsb" : "tdsb";
  return "mayor";
}

/** A link that opens a race in full on the dashboard. */
export function raceHref(race: Pick<LiveRace, "id" | "level">): string {
  const type = raceTypeOf(race);
  return type === "mayor" ? "/results/" : `/results/?race=${type}&open=${race.id}`;
}

/** A link to the dashboard with a ward as yours. */
export function myWardHref(ward: string): string {
  return `/results/?myward=${ward}`;
}

const byNumber = (a: LiveRace, b: LiveRace) => a.id.localeCompare(b.id, "en-CA", { numeric: true });

/** Races in the grid's order, your ward's first. Facts of the count only: the closest race is the
 *  smallest counted lead, never a call. A race with nothing counted sorts last on the count. */
export function sortRaces(
  races: LiveRace[],
  sort: RaceSort,
  incumbents?: Record<string, readonly string[] | null>,
  mine?: string | null,
): LiveRace[] {
  const margin = (race: LiveRace) => raceLead(race).margin ?? Infinity;
  const counted = (race: LiveRace) => reportedFraction(race.progress) ?? Infinity;
  const trailing = (race: LiveRace) => {
    const known = incumbents?.[race.num];
    const lead = raceLead(race);
    if (!known || known.length === 0 || lead.leader === null || lead.tied) return false;
    const leader = race.candidates.find((c) => c.key === lead.leader);
    return !(leader?.candidacy_id && known.includes(leader.candidacy_id));
  };
  const order: Record<RaceSort, (a: LiveRace, b: LiveRace) => number> = {
    number: byNumber,
    close: (a, b) => margin(a) - margin(b) || byNumber(a, b),
    counted: (a, b) => counted(a) - counted(b) || byNumber(a, b),
    incumbent: (a, b) => Number(trailing(b)) - Number(trailing(a)) || byNumber(a, b),
  };
  return [...races].sort((a, b) => Number(b.id === mine) - Number(a.id === mine) || order[sort](a, b));
}
