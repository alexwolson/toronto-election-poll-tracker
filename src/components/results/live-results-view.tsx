/**
 * The results page (#30, #35; the dashboard since 2026-10-20, Alex): the page's state (the City
 * count time, the staleness banner, the rehearsal bar, the browser's can't-reach notice and the
 * page pause; #17 § On-night reader wording) and the final state at Night Close (#51), handed to
 * the dashboard with the payload. Pure: the poller supplies the state and the clock.
 */

import type { ReactNode } from "react";
import { showsUnreachableNotice, type LiveClientState } from "@/lib/live-accept";
import type { ResultsMapData } from "@/lib/results-map-data";
import type { ResultsWard } from "@/lib/results-wards";
import { WORDING } from "./race-cards";
import { ResultsDashboard } from "./results-dashboard";

/** The City's own results page, for the page pause (#49). */
const CITY_RESULTS_URL = "https://www.toronto.ca/city-government/elections/election-results-reports/election-results/";

/** The banner shows once the newest heartbeat is older than this (#17 § Staleness). */
const STALE_AFTER_MS = 5 * 60_000;

const CLOCK = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Toronto",
  hour: "numeric",
  minute: "2-digit",
});

/** Epoch ms as Toronto wall-clock time: "9:46 p.m.", which ends its own sentence. */
function clockTime(ms: number): string {
  return CLOCK.format(ms);
}

function RehearsalBar() {
  return <span className="badge badge--soon">Rehearsal: not real results</span>;
}

export interface LiveResultsViewProps {
  state: LiveClientState;
  now: number;
  /** Every City ward, for your ward and the Map. */
  wards: ResultsWard[];
  /** Whether the final forecast publishes, for the mayor's pointer to it. */
  forecast: boolean;
  /** The Map's ward shapes, trustee areas and incumbents (live-projection #103). */
  mapData: ResultsMapData;
}


/** The whole page, in CHW components (PageHero, Callout, Badge, Card, `.grid`,
 *  `.field`, `.pill`, `.t-*`) and the /wards index's cards: page status on the
 *  hero's paper ground, where a tint Callout shows, then the ballot's cards and
 *  the council tiles. */
export function LiveResultsView({ state, now, wards, forecast, mapData }: LiveResultsViewProps) {
  const unreachable = showsUnreachableNotice(state) && (
    <p className="callout" role="status">
      Can&apos;t reach live results; retrying
    </p>
  );
  // The page pause replaces live results; the tiles stay as plain links to each ward.
  const paused = state.results?.paused === true;
  const results = paused ? null : state.results;

  let status: ReactNode = paused ? (
    <>
      {state.results?.payload.rehearsal && <RehearsalBar />}
      <p className="callout" role="status">
        Live results are paused. See the City of Toronto&apos;s results:{" "}
        <a href={CITY_RESULTS_URL}>toronto.ca election results</a>
      </p>
      {unreachable}
    </>
  ) : (
    unreachable || <p className="t-meta">Loading live results…</p>
  );
  if (results !== null) {
    const { payload, heartbeat, closed } = results;
    const counting = payload.state === "results";
    const cityCountAt = Math.min(payload.seq.all_office, payload.seq.ward_by_ward);
    // From 8 p.m. until the first voting area anywhere.
    const nothingIn = counting && !payload.races.some((race) => race.state === "counting" || race.state === "all_units_in");
    status = (
      <>
        {payload.rehearsal && <RehearsalBar />}
        {/* After Night Close the apps are shut down, so an old heartbeat is expected. */}
        {!closed && now - heartbeat > STALE_AFTER_MS && (
          <p className="callout" role="status">
            We haven&apos;t been able to read the City&apos;s results since {clockTime(heartbeat)} The count below
            may be out of date.
          </p>
        )}
        {unreachable}
        <p className="results-bar__count">
          {closed && counting ? (
            // "unofficial" once is enough (#54).
            <>Final unofficial count as of {clockTime(cityCountAt)}</>
          ) : (
            <>
              {/* The page's state, said once here rather than on every card (#115). */}
              {!counting && <>{WORDING.before_results} · </>}
              {counting && <>City count as of {clockTime(cityCountAt)} · </>}
              {nothingIn && <>{WORDING.no_units_in} · </>}
              City of Toronto unofficial results
            </>
          )}
        </p>
      </>
    );
  }

  return (
    <ResultsDashboard
      payload={results?.payload ?? null}
      closed={results?.closed ?? false}
      status={status}
      wards={wards}
      forecast={forecast}
      mapData={mapData}
    />
  );
}
