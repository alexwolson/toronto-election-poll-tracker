/**
 * The Ward Ballot pages (#35, on #30's simple race display): the picker, the
 * mayor card, the chosen ward's races, then the 25 council tiles, with Reporting
 * Progress, the City count time, the staleness banner, the rehearsal bar and the
 * browser's can't-reach notice (#17 § On-night reader wording), and the final state
 * at Night Close (#51). Pure apart from
 * the picker: the poller supplies the state and the clock, and the page the ward.
 */

import type { ReactNode } from "react";
import { ContentSection } from "@/components/content-section";
import { showsUnreachableNotice, type LiveClientState } from "@/lib/live-accept";
import type { ResultsMapData } from "@/lib/results-map-data";
import { wardLabel, type ResultsWard } from "@/lib/results-wards";
import { CouncilAreasTable } from "./council-areas-table";
import { LiveCountView, LiveTablesView } from "./live-count-view";
import { LiveMapView } from "./live-map-view";
import { MayorLead, showsMayorLead } from "./mayor-lead";
import { CouncilTiles, FrenchBoards, RaceCard, WORDING } from "./race-cards";
import { ResultsViews } from "./results-views";
import { WardPicker } from "./ward-picker";

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
  /** Every City ward, for the picker and the tiles. */
  wards: ResultsWard[];
  /** The ward whose page this is; null on /results/. */
  ward: ResultsWard | null;
  /** The ward's payload race ids after the mayor (`wardBallotRaceIds`). */
  ballot: string[];
  /** Whether the final forecast publishes, for the mayor card's pointer to it. */
  forecast: boolean;
  /** The Map's ward shapes, trustee areas and incumbents (live-projection #103). */
  mapData: ResultsMapData;
}

/** Trustee race id → the city wards it covers, from the map data's ward → area. */
function areaWards(mapData: ResultsMapData): Record<string, string[]> {
  const areas: Record<string, string[]> = {};
  for (const [ward, { tdsb, tcdsb }] of Object.entries(mapData.areas)) {
    for (const id of [tdsb, tcdsb]) if (id) (areas[id] ??= []).push(ward);
  }
  return areas;
}

/** The whole page, in CHW components (PageHero, Callout, Badge, Card, `.grid`,
 *  `.field`, `.pill`, `.t-*`) and the /wards index's cards: page status on the
 *  hero's paper ground, where a tint Callout shows, then the ballot's cards and
 *  the council tiles. */
export function LiveResultsView({ state, now, wards, ward, ballot, forecast, mapData }: LiveResultsViewProps) {
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
  let ballotCards: ReactNode = null;
  let mayorLead: ReactNode = null;
  if (results !== null) {
    const { payload, heartbeat, closed } = results;
    const counting = payload.state === "results";
    const cityCountAt = Math.min(payload.seq.all_office, payload.seq.ward_by_ward);
    // From 8 p.m. until the first voting area anywhere.
    const nothingIn = counting && !payload.races.some((race) => race.state === "counting" || race.state === "all_units_in");
    const shown = ["mayor", ...ballot].flatMap((id) => payload.races.filter((race) => race.id === id));
    // Once the count starts the mayor leads the page, above the views; its card folds there.
    const leadRace = shown.find((race) => race.id === "mayor");
    mayorLead = showsMayorLead(leadRace) ? (
      <MayorLead race={leadRace} levels={payload.levels} ward={ward?.num ?? null} forecast={forecast} closed={closed} />
    ) : null;
    const main = shown.filter((race) => race.level !== "french_trustee" && !(mayorLead && race.id === "mayor"));
    const french = shown.filter((race) => race.level === "french_trustee");

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
    ballotCards =
      main.length + french.length === 0 ? null : (
        <ContentSection aria-labelledby="results-ballot-heading">
          <h2 id="results-ballot-heading">{ward ? `On the Ward ${ward.num} ballot` : "Citywide"}</h2>
          <div className="grid">
            {main.map((race) => (
              <RaceCard
                key={race.id}
                race={race}
                levels={payload.levels}
                ward={ward?.num ?? null}
                forecast={forecast}
                closed={closed}
              />
            ))}
            <FrenchBoards races={french} closed={closed} />
          </div>
        </ContentSection>
      );
  }

  return (
    <>
      {/* The page's state and the ward picker in one bar; the title is for screen readers (the
          masthead says Results, and a ward page's picker shows its ward). */}
      <section className="results-bar" aria-labelledby="results-heading">
        <div className="wrap results-bar__inner">
          <h1 id="results-heading" className="visually-hidden">
            {ward ? wardLabel(ward) : "Election night results"}
          </h1>
          <div className="results-bar__status">{status}</div>
          <WardPicker wards={wards} ward={ward} />
        </div>
      </section>
      {mayorLead}
      <ResultsViews
        races={
          <>
            {ballotCards}
            {/* The tiles' wards are static, so they show before the first good poll. */}
            <CouncilTiles
              wards={wards}
              races={results?.payload.races ?? []}
              levels={results?.payload.levels ?? null}
              closed={results?.closed ?? false}
            />
          </>
        }
        map={
          <ContentSection>
            <LiveMapView data={mapData} payload={results?.payload ?? null} wards={wards} ward={ward?.num ?? null} />
            <CouncilAreasTable payload={results?.payload ?? null} ward={ward?.num ?? null} />
          </ContentSection>
        }
        count={
          <ContentSection>
            <LiveCountView payload={results?.payload ?? null} ballot={ballot} ward={ward?.num ?? null} />
          </ContentSection>
        }
        tables={
          <ContentSection>
            <LiveTablesView payload={results?.payload ?? null} wards={wards} areas={areaWards(mapData)} />
          </ContentSection>
        }
      />
    </>
  );
}
