/**
 * Every results page's state line (#17 § On-night reader wording), the same on the citywide page,
 * each race page and the French-language boards' page: the City count time, the staleness banner,
 * the rehearsal badge, the browser's can't-reach notice, the page pause (#49) and the final state
 * at Night Close (#51). Pure: the poller supplies the state and the clock.
 */

import type { ReactNode } from "react";
import { showsUnreachableNotice, type LiveClientState } from "@/lib/live-accept";
import { WORDING } from "@/lib/race-results";
import type { LiveResults } from "@/types/live";

/** The City's own results page, for the page pause (#49). */
export const CITY_RESULTS_URL = "https://www.toronto.ca/city-government/elections/election-results-reports/election-results/";

/** The banner shows once the newest heartbeat is older than this (#17 § Staleness). */
const STALE_AFTER_MS = 5 * 60_000;

const CLOCK = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", hour: "numeric", minute: "2-digit" });

/** Epoch ms as Toronto wall-clock time: "9:46 p.m.", which ends its own sentence. */
export function clockTime(ms: number): string {
  return CLOCK.format(ms);
}

function RehearsalBadge() {
  return <span className="badge badge--soon">Rehearsal: not real results</span>;
}

/** The results the page draws (none while paused or loading) and its state line. */
export function resultsStatus(state: LiveClientState, now: number): { results: LiveResults | null; status: ReactNode } {
  const unreachable = showsUnreachableNotice(state) && (
    <p className="callout" role="status">
      Can&apos;t reach live results; retrying
    </p>
  );
  const paused = state.results?.paused === true;
  const results = paused ? null : state.results;
  if (results === null) {
    return {
      results: null,
      status: paused ? (
        <>
          {state.results?.payload.rehearsal && <RehearsalBadge />}
          <p className="callout" role="status">
            Live results are paused. See the City of Toronto&apos;s results: <a href={CITY_RESULTS_URL}>toronto.ca election results</a>
          </p>
          {unreachable}
        </>
      ) : (
        unreachable || <p className="t-meta">Loading live results…</p>
      ),
    };
  }
  const { payload, heartbeat, closed } = results;
  const counting = payload.state === "results";
  const cityCountAt = Math.min(payload.seq.all_office, payload.seq.ward_by_ward);
  // From 8 p.m. until the first voting area anywhere.
  const nothingIn = counting && !payload.races.some((race) => race.state === "counting" || race.state === "all_units_in");
  return {
    results,
    status: (
      <>
        {payload.rehearsal && <RehearsalBadge />}
        {/* After Night Close the apps are shut down, so an old heartbeat is expected. */}
        {!closed && now - heartbeat > STALE_AFTER_MS && (
          <p className="callout" role="status">
            We haven&apos;t been able to read the City&apos;s results since {clockTime(heartbeat)} The count below may be out of date.
          </p>
        )}
        {unreachable}
        <p className="results-bar__count">
          {closed && counting ? (
            <>Final unofficial count as of {clockTime(cityCountAt)}</>
          ) : (
            <>
              {!counting && <>{WORDING.before_results}</>}
              {counting && <><span className="results-bar__pulse" aria-hidden="true" />City count as of {clockTime(cityCountAt)}</>}
              {nothingIn && <> · {WORDING.no_units_in}</>}
              {/* Phones drop the source here; the page's opening names it. */}
              <span className="results-bar__suffix"> · City of Toronto unofficial results</span>
            </>
          )}
        </p>
      </>
    ),
  };
}

/** The state line under the masthead. */
export function ResultsBar({ status, links }: { status: ReactNode; links?: ReactNode }) {
  return (
    <section className="results-bar" aria-label="Live results status">
      <div className="wrap results-bar__inner">
        <div className="results-bar__status">{status}</div>
        {links}
      </div>
    </section>
  );
}
