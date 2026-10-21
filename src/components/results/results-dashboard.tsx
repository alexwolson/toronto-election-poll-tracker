"use client";

/**
 * The results dashboard (Alex, 2026-10-20): one citywide page for readers who follow the whole
 * city. A tab per race type; the mayor's race in full; every council, TDSB, TCDSB or French
 * board race at a glance in a grid, sortable, with one opening in place as the full race block;
 * your ward highlighted; and the Map, Count and Tables views. All of it in the URL. The pages are
 * static, so the URL is read in the browser behind a Suspense boundary; the prerendered HTML
 * shows the defaults.
 */

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useSyncExternalStore, type ReactNode } from "react";
import { ContentSection } from "@/components/content-section";
import { RouteTabs } from "@/components/route-tabs";
import { liveColour } from "@/lib/live-colour";
import { shortLabel } from "@/lib/live-labels";
import { rangeText } from "@/lib/live-share";
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
import { readRememberedWard } from "@/lib/ward-memory";
import type { LivePayload, LiveRace } from "@/types/live";
import { CouncilAreasTable } from "./council-areas-table";
import { LiveCountView, LiveTablesView } from "./live-count-view";
import { LiveMapView } from "./live-map-view";
import { MayorLead, MayorNotes, RaceResult, showsRaceResult } from "./mayor-lead";
import { RANGE_WORDING, RaceCard, RaceCompactTally, WORDING, countOnly, estimated, raceTitle } from "./race-cards";
import { WardPicker } from "./ward-picker";

const DEFAULTS: DashboardState = { race: "mayor", view: "races", myWard: null, open: null, sort: "number" };

const VIEW_TABS = [
  { id: "races", label: "Results" },
  { id: "map", label: "Map" },
  { id: "count", label: "Count" },
  { id: "tables", label: "Tables" },
] as const;

const SORTS: { id: RaceSort; label: string; council?: true }[] = [
  { id: "number", label: "Ward number" },
  { id: "close", label: "Closest race" },
  { id: "counted", label: "Least counted" },
  { id: "incumbent", label: "Incumbent trailing", council: true },
];

/** The remembered ward changes only through the picker, which also writes the URL. */
const subscribe = () => () => {};

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
  const state = dashboardFrom(new URLSearchParams(params.toString()), props.wards.map((w) => w.num));
  return <Dashboard {...props} state={state} params={new URLSearchParams(params.toString())} pathname={pathname} />;
}

/** A race type's race in your ward: its council race, or the trustee areas covering it. */
function mineIn(type: RaceType, ward: string | null, mapData: ResultsMapData): string | null {
  if (ward === null) return null;
  if (type === "council") return `councillor-${ward}`;
  if (type === "tdsb" || type === "tcdsb") return mapData.areas[ward]?.[type] ?? null;
  return null;
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
  const router = useRouter();
  // Null on the server and in the first hydration pass, so the markup matches.
  const remembered = useSyncExternalStore(subscribe, readRememberedWard, () => null);
  const myWard = state.myWard ?? remembered;
  const myWardRow = wards.find((w) => w.num === myWard) ?? null;
  const href = (change: Partial<DashboardState>) => dashboardHref(pathname, params, change);
  const mayor = payload?.races.find((r) => r.id === "mayor") ?? null;
  const mayorShown = state.race === "mayor" && state.view === "races";

  let content: ReactNode;
  if (state.view === "map") {
    content = (
      <ContentSection>
        <LiveMapView data={mapData} payload={payload} wards={wards} ward={myWard} />
        <CouncilAreasTable payload={payload} ward={myWard} />
      </ContentSection>
    );
  } else if (state.view === "count") {
    content = (
      <ContentSection>
        <LiveCountView payload={payload} ballot={[]} ward={null} />
      </ContentSection>
    );
  } else if (state.view === "tables") {
    content = (
      <ContentSection>
        <LiveTablesView payload={payload} wards={wards} />
      </ContentSection>
    );
  } else if (state.race === "mayor") {
    content = !mayor ? null : showsRaceResult(mayor) ? (
      <MayorLead race={mayor} levels={payload!.levels} ward={myWard} closed={closed} />
    ) : (
      <ContentSection>
        <RaceCard race={mayor} levels={payload!.levels} ward={myWard} forecast={forecast} closed={closed} />
      </ContentSection>
    );
  } else {
    content = payload && (
      <RaceGrid
        type={state.race}
        races={racesOfType(payload, state.race)}
        levels={payload.levels}
        closed={closed}
        state={state}
        mine={mineIn(state.race, myWard, mapData)}
        incumbents={state.race === "council" ? mapData.council : mapData.trustee}
        href={href}
      />
    );
  }

  return (
    <>
      {/* The page's state and your ward in one bar; the title is for screen readers (the masthead
          says Results). */}
      <section className="results-bar" aria-labelledby="results-heading">
        <div className="wrap results-bar__inner">
          <h1 id="results-heading" className="visually-hidden">
            Election night results
          </h1>
          <div className="results-bar__status">{status}</div>
          <WardPicker wards={wards} ward={myWardRow} onChoose={(num) => router.replace(href({ myWard: num }), { scroll: false })} />
        </div>
      </section>
      <RouteTabs
        label="Race types"
        items={RACE_TYPES.map((t) => ({ id: t.id, href: href({ race: t.id }), label: t.label }))}
        activeId={state.race}
      />
      <RouteTabs label="Results views" items={VIEW_TABS.map((v) => ({ id: v.id, href: href({ view: v.id }), label: v.label }))} activeId={state.view} />
      {content}
      {/* The mayor's benchmark and disclosures: the page's very last part (Alex). */}
      {mayorShown && mayor && showsRaceResult(mayor) && (
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
  mine,
  incumbents,
  href,
}: {
  type: RaceType;
  races: LiveRace[];
  levels: LivePayload["levels"];
  closed: boolean;
  state: DashboardState;
  mine: string | null;
  incumbents: Record<string, readonly string[] | null>;
  href: (change: Partial<DashboardState>) => string;
}) {
  const label = RACE_TYPES.find((t) => t.id === type)!.label;
  // Incumbents are known by ward for council; trustee races by race id, so keyed the same here.
  const byNum = type === "council" ? incumbents : Object.fromEntries(races.map((r) => [r.num, incumbents[r.id] ?? null]));
  const sorts = SORTS.filter((s) => !s.council || type === "council");
  const sort = sorts.some((s) => s.id === state.sort) ? state.sort : "number";
  const ordered = sortRaces(races, sort, byNum, mine);
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
                <RaceResult race={race} levels={levels} ward={null} closed={closed} />
              ) : (
                <RaceCard race={race} levels={levels} closed={closed} />
              )}
              <Link className="btn btn--ghost btn--sm race-grid__close" href={href({ open: null })} scroll={false}>
                <span className="live-tally__chevron" aria-hidden="true">⌃</span> Close
              </Link>
            </div>
          ) : (
            <CompactRace key={race.id} race={race} levels={levels} closed={closed} mine={race.id === mine} openHref={href({ open: race.id })} />
          ),
        )}
      </div>
    </ContentSection>
  );
}

/** One race at a glance: title, voting areas in, its leaders and the rest, and its projected
 *  finish in a line. The title opens it in full. */
function CompactRace({
  race,
  levels,
  closed,
  mine,
  openHref,
}: {
  race: LiveRace;
  levels: LivePayload["levels"];
  closed: boolean;
  mine: boolean;
  openHref: string;
}) {
  const progress = race.progress;
  let body: ReactNode;
  if (race.state === "acclaimed") body = <p className="t-body-small">{`${WORDING.acclaimed}: ${race.candidates[0]?.full_name ?? ""}`}</p>;
  else if (race.state === "no_figures") body = <p className="t-body-small">No figures from the City for this race right now</p>;
  else if (showsRaceResult(race))
    body = (
      <>
        <RaceCompactTally race={race} closed={closed} />
        {/* While the level shows the count, the block says so in place of the projected line. */}
        {race.state === "counting" && countOnly(race, levels) ? <p className="race-compact__projected t-body-small">Count only</p> : <ProjectedLine race={race} />}
      </>
    );
  else body = <p className="t-body-small">{`${race.candidates.length} candidates`}</p>;
  return (
    <article className={`race-compact${mine ? " is-mine" : ""}`} aria-labelledby={`live-race-${race.id}`}>
      <h3 id={`live-race-${race.id}`}>
        <Link href={openHref} scroll={false}>
          {/* The tab names the office, so a council race is its ward. */}
          {race.level === "council" ? raceTitle(race).replace(/^Councillor, /, "") : raceTitle(race)}
        </Link>
        {mine && <span className="badge badge--status">Your ward</span>}
      </h3>
      {race.state === "counting" && !progress && <p className="race-compact__progress t-meta">{WORDING.no_progress}</p>}
      {progress && race.state !== "acclaimed" && (
        <p className="race-compact__progress t-meta">
          <span className="mayor-lead__progress" aria-hidden="true">
            <span style={{ width: `${progress.total > 0 ? Math.min(100, (100 * progress.received) / progress.total) : 0}%` }} />
          </span>
          {`${progress.received.toLocaleString("en-CA")} of ${progress.total.toLocaleString("en-CA")} voting areas in`}
        </p>
      )}
      {body}
      <Link className="race-compact__open" href={openHref} scroll={false}>
        Full result <span aria-hidden="true">⌄</span>
      </Link>
    </article>
  );
}

/** The projected finish in a line, for the two leaders, when the level's projection shows. */
function ProjectedLine({ race }: { race: LiveRace }) {
  const bands = estimated(race);
  const leaders = [...race.candidates].sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0)).slice(0, 2);
  if (!bands || leaders.some((c) => !bands[c.key])) return null;
  return (
    <p className="race-compact__projected t-body-small">
      {"Projected finish (90%): "}
      {leaders.map((c, i) => (
        <span key={c.key}>
          {i > 0 && " · "}
          <span style={{ color: liveColour(c, "var(--color-disengaged)") }}>{shortLabel(c)}</span>{" "}
          {rangeText(bands[c.key].low, bands[c.key].high)}
        </span>
      ))}
    </p>
  );
}
