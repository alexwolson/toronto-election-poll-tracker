"use client";

/**
 * The results dashboard (Alex, 2026-10-20): one citywide page for readers who follow the whole
 * city. A tab per race type, each one page to scroll (Alex, 2026-10-21): the mayor's race in
 * full, its map, its count over the night and its wards; or every race of a type at a
 * glance in a grid, sortable, with one opening in place as the full race block with its count
 * over the night, then the type's map. All of it in the URL. The pages are
 * static, so the URL is read in the browser behind a Suspense boundary; the prerendered HTML
 * shows the defaults.
 */

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, type ReactNode } from "react";
import { ContentSection } from "@/components/content-section";
import { RouteTabs } from "@/components/route-tabs";
import {
  RACE_TYPES,
  dashboardFrom,
  dashboardHref,
  racesOfType,
  sortRaces,
  type DashboardState,
  type RaceSort,
  type RaceType,
} from "@/lib/results-dashboard";
import type { ResultsMapData } from "@/lib/results-map-data";
import type { ResultsWard } from "@/lib/results-wards";
import type { LivePayload, LiveRace } from "@/types/live";
import { MayorCount, MayorWards, RaceCount } from "./live-count-view";
import { LiveMapView } from "./live-map-view";
import type { MapContest } from "@/lib/live-map-url";
import { MayorLead, MayorNotes, RaceResult, showsRaceResult } from "./mayor-lead";
import { RANGE_WORDING, RaceCard, RaceCompactTally, WORDING, raceTitle } from "./race-cards";

const DEFAULTS: DashboardState = { race: "mayor", open: null, sort: "number", jump: null };

/** The race types the Map draws; the French boards have no map. */
const MAPPED: readonly RaceType[] = ["mayor", "council", "tdsb", "tcdsb"];

const SORTS: { id: RaceSort; label: string; council?: true }[] = [
  { id: "number", label: "Ward number" },
  { id: "close", label: "Closest race" },
  { id: "counted", label: "Least counted" },
  { id: "incumbent", label: "Incumbent trailing", council: true },
];

export interface ResultsDashboardProps {
  payload: LivePayload | null;
  closed: boolean;
  /** The page's state line, staleness and pause notices, from the poller. */
  status: ReactNode;
  wards: ResultsWard[];
  /** Whether the final forecast publishes, for the mayor's pointer to it. */
  forecast: boolean;
  mapData: ResultsMapData;
}

export function ResultsDashboard(props: ResultsDashboardProps) {
  return (
    <Suspense fallback={<Dashboard {...props} state={DEFAULTS} params={new URLSearchParams()} pathname="/results/" />}>
      <DashboardFromUrl {...props} />
    </Suspense>
  );
}

function DashboardFromUrl(props: ResultsDashboardProps) {
  const params = useSearchParams();
  const pathname = usePathname();
  const state = dashboardFrom(new URLSearchParams(params.toString()));
  return <Dashboard {...props} state={state} params={new URLSearchParams(params.toString())} pathname={pathname} />;
}

function Dashboard({
  payload,
  closed,
  status,
  wards,
  forecast,
  mapData,
  state,
  params,
  pathname,
}: ResultsDashboardProps & { state: DashboardState; params: URLSearchParams; pathname: string }) {
  const href = (change: Parameters<typeof dashboardHref>[2]) => dashboardHref(pathname, params, change);
  const mayor = payload?.races.find((r) => r.id === "mayor") ?? null;

  // An old `?view=` link lands on the part of the page that view became.
  useEffect(() => {
    if (state.jump) document.getElementById(state.jump)?.scrollIntoView();
  }, [state.jump]);

  const map = MAPPED.includes(state.race) && (
    <ContentSection>
      {/* Keyed by race type, so a new tab opens its own map. It reads its selection from the URL,
          so the prerendered page (the defaults, outside the URL's boundary) leaves it to the browser. */}
      <Suspense fallback={null}>
        <LiveMapView key={state.race} data={mapData} payload={payload} wards={wards} ward={null} contest={state.race as MapContest} />
      </Suspense>
    </ContentSection>
  );

  let content: ReactNode;
  if (state.race === "mayor") {
    content = (
      <>
        {mayor &&
          (showsRaceResult(mayor) ? (
            <MayorLead race={mayor} levels={payload!.levels} closed={closed} />
          ) : (
            <ContentSection>
              <RaceCard race={mayor} levels={payload!.levels} forecast={forecast} closed={closed} />
            </ContentSection>
          ))}
        {map}
        <ContentSection>
          <MayorCount payload={payload} />
        </ContentSection>
        <ContentSection>
          <MayorWards payload={payload} wards={wards} />
        </ContentSection>
      </>
    );
  } else {
    content = (
      <>
        {/* Races first, then where they lead (Alex). */}
        {payload && (
          <RaceGrid
            type={state.race}
            races={racesOfType(payload, state.race)}
            levels={payload.levels}
            closed={closed}
            state={state}
            incumbents={state.race === "council" ? mapData.council : mapData.trustee}
            href={href}
          />
        )}
        {map}
      </>
    );
  }

  return (
    <>
      {/* The page's state; the title is for screen readers (the masthead says Results). */}
      <section className="results-bar" aria-labelledby="results-heading">
        <div className="wrap results-bar__inner">
          <h1 id="results-heading" className="visually-hidden">
            Election night results
          </h1>
          <div className="results-bar__status">{status}</div>
        </div>
      </section>
      <RouteTabs
        label="Race types"
        items={RACE_TYPES.map((t) => ({ id: t.id, href: href({ race: t.id }), label: t.label }))}
        activeId={state.race}
      />
      <div className="results-page">{content}</div>
      {/* The mayor's benchmark and disclosures: the page's very last part (Alex). */}
      {state.race === "mayor" && mayor && showsRaceResult(mayor) && (
        <MayorNotes race={mayor} levels={payload!.levels} forecast={forecast} closed={closed} />
      )}
    </>
  );
}


/** Every race of one type at a glance, sortable, one open in place as the full race block. */
function RaceGrid({
  type,
  races,
  levels,
  closed,
  state,
  incumbents,
  href,
}: {
  type: RaceType;
  races: LiveRace[];
  levels: LivePayload["levels"];
  closed: boolean;
  state: DashboardState;
  incumbents: Record<string, readonly string[] | null>;
  href: (change: Parameters<typeof dashboardHref>[2]) => string;
}) {
  const label = RACE_TYPES.find((t) => t.id === type)!.label;
  // Incumbents are known by ward for council; trustee races by race id, so keyed the same here.
  const byNum = type === "council" ? incumbents : Object.fromEntries(races.map((r) => [r.num, incumbents[r.id] ?? null]));
  const sorts = SORTS.filter((s) => !s.council || type === "council");
  const sort = sorts.some((s) => s.id === state.sort) ? state.sort : "number";
  const ordered = sortRaces(races, sort, byNum);
  return (
    <ContentSection aria-labelledby="race-grid-heading">
      <div className="race-grid__head">
        <h2 id="race-grid-heading">{`${label}: ${races.length} ${races.length === 1 ? "race" : "races"}`}</h2>
        <nav className="ward-index-sort live-seg" aria-label="Sort the races">
          {sorts.map((s) => (
            <Link key={s.id} href={href({ sort: s.id })} scroll={false} aria-current={sort === s.id ? "true" : undefined}>
              {s.label}
            </Link>
          ))}
        </nav>
      </div>
      {type === "french" && <p className="t-body-small">{RANGE_WORDING.french}</p>}
      <div className="race-grid">
        {ordered.map((race) =>
          race.id === state.open ? (
            <div key={race.id} className="race-grid__open">
              {/* Before its count starts a race's full view is its card. */}
              {showsRaceResult(race) ? (
                <RaceResult race={race} levels={levels} closed={closed} />
              ) : (
                <RaceCard race={race} levels={levels} closed={closed} />
              )}
              <RaceCount race={race} />
              <Link className="btn btn--ghost btn--sm race-grid__close" href={href({ open: null })} scroll={false}>
                <span className="live-tally__chevron" aria-hidden="true">⌃</span> Close
              </Link>
            </div>
          ) : (
            <CompactRace key={race.id} race={race} closed={closed} openHref={href({ open: race.id })} />
          ),
        )}
      </div>
    </ContentSection>
  );
}

/** One race at a glance (Alex, 2026-10-21): its title and how much is in, one bar for the count
 *  and its two leaders. The whole card opens it in full. */
function CompactRace({
  race,
  closed,
  openHref,
}: {
  race: LiveRace;
  closed: boolean;
  openHref: string;
}) {
  const progress = race.progress;
  let body: ReactNode;
  if (race.state === "acclaimed") body = <p className="t-body-small">{`${WORDING.acclaimed}: ${race.candidates[0]?.full_name ?? ""}`}</p>;
  else if (race.state === "no_figures") body = <p className="t-body-small">No figures from the City for this race right now</p>;
  else if (showsRaceResult(race)) body = <RaceCompactTally race={race} closed={closed} />;
  else body = <p className="t-body-small">{`${race.candidates.length} candidates`}</p>;
  return (
    <article className="race-compact" aria-labelledby={`live-race-${race.id}`}>
      <div className="race-compact__head">
        <h3 id={`live-race-${race.id}`}>
          <Link href={openHref} scroll={false}>
            {/* The tab names the office, so a council race is its ward. */}
            {race.level === "council" ? raceTitle(race).replace(/^Councillor, /, "") : raceTitle(race)}
          </Link>
        </h3>
        {race.state === "counting" && !progress && <p className="race-compact__progress t-meta">{WORDING.no_progress}</p>}
        {progress && race.state !== "acclaimed" && (
          <p className="race-compact__progress t-meta">{`${progress.received.toLocaleString("en-CA")} of ${progress.total.toLocaleString("en-CA")} in`}</p>
        )}
      </div>
      {body}
    </article>
  );
}
