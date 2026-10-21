/**
 * The results Map's selection in the URL (live-projection #126): its race, measure, candidate and
 * held ward, beside the results views' `?view=`, so a shared link opens the same map. Values that
 * don't exist, or a measure the race doesn't offer, fall back to the defaults.
 */

export type MapContest = "mayor" | "council" | "tdsb" | "tcdsb" | "viamonde" | "monavenir";
export type MapMeasure = "leader" | "share" | "reporting" | "vs2023";

export interface MapSelection {
  contest: MapContest;
  measure: MapMeasure;
  /** The candidate-share measure's candidate, by Ballot Name; null with every other measure. */
  candidate: string | null;
  /** The held ward; null when the URL names none (or one that doesn't exist). */
  ward: string | null;
}

const CONTESTS: readonly MapContest[] = ["mayor", "council", "tdsb", "tcdsb"];
const MEASURES: readonly MapMeasure[] = ["leader", "share", "reporting", "vs2023"];
/** Measures only the mayor offers; council and trustee races show these by leader. */
const MAYOR_ONLY: readonly MapMeasure[] = ["share", "vs2023"];

/** The measure the map shows: council and trustee races show a mayor-only measure by leader. */
export function shownMeasure(contest: MapContest, measure: MapMeasure): MapMeasure {
  return contest !== "mayor" && MAYOR_ONLY.includes(measure) ? "leader" : measure;
}

function oneOf<T extends string>(value: string | null, options: readonly T[], fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback;
}

export function mapSelectionFrom(params: URLSearchParams, wardNums: readonly string[]): MapSelection {
  const contest = oneOf(params.get("race"), CONTESTS, "mayor");
  const measure = shownMeasure(contest, oneOf(params.get("show"), MEASURES, "leader"));
  const ward = params.get("ward");
  return {
    contest,
    measure,
    candidate: measure === "share" ? params.get("candidate") : null,
    ward: ward !== null && wardNums.includes(ward) ? ward : null,
  };
}

/** The page's URL with this selection, keeping its other parameters and leaving out defaults. On a
 *  race type's page the page owns `race`, so `writeContest` is false and the map leaves it alone. */
export function mapSelectionHref(pathname: string, params: URLSearchParams, selection: MapSelection, writeContest = true): string {
  const next = new URLSearchParams(params);
  const put = (key: string, value: string | null) => (value === null ? next.delete(key) : next.set(key, value));
  if (writeContest) put("race", selection.contest === "mayor" ? null : selection.contest);
  put("show", selection.measure === "leader" ? null : selection.measure);
  put("candidate", selection.measure === "share" ? selection.candidate : null);
  // Set last so the held ward always ends the query, whatever order the page's URL had.
  next.delete("ward");
  put("ward", selection.ward);
  const query = next.toString();
  return query ? `${pathname}?${query}` : pathname;
}
