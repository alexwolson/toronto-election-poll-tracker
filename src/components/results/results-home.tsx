"use client";

/**
 * The citywide results page (results redesign, Alex, 2026-10-24), in the agreed order: the mayor's
 * result, the council's races to watch and the rest, the mayor's count over the night, the two
 * Chows, the mayor by ward (map, areas not yet in, the ward table), every council race, the trustee
 * races, then sources and the mayor's notes. Each race links to its own page.
 */

import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { ContentSection } from "@/components/content-section";
import { estimated } from "@/lib/race-results";
import type { HomeRace, MayorNotesData } from "@/lib/home-data";
import type { ResultsMapData } from "@/lib/results-map-data";
import type { ResultsWard } from "@/lib/results-wards";
import type { LivePayload, LiveRace } from "@/types/live";
import { CouncilOverview, CouncilTable, TrusteeOverview } from "./council-overview";
import { MayorCount, MayorWards } from "./live-count-view";
import { LiveMapView } from "./live-map-view";
import { useLiveState } from "./live-results-poller";
import { MayorLead, MayorNotes, showsRaceResult } from "./mayor-lead";
import { OutstandingAreas } from "./outstanding-areas";
import { ResultsBar, resultsStatus } from "./results-status";
import { TurnoutBar } from "./turnout-bar";
import { TwoChows } from "./two-chows";

export interface ResultsHomeProps {
  homes: HomeRace[];
  wards: ResultsWard[];
  forecast: boolean;
  mapData: ResultsMapData;
  named: string[];
  notes: MayorNotesData;
}

const DATE = new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", timeZone: "UTC" });
const shortDate = (iso: string) => DATE.format(new Date(`${iso}T12:00Z`)).replace(/^(Jan|Feb|Aug|Sep|Oct|Nov|Dec)/, "$1.").replace("Sep.", "Sept.");

/** The page's one sentence: who leads the mayor's race, by how much, and whether their ranges overlap. */
function dek(mayor: LiveRace | null): ReactNode {
  if (!mayor || !showsRaceResult(mayor)) return null;
  const [a, b] = [...mayor.candidates].sort((x, y) => (y.votes ?? 0) - (x.votes ?? 0));
  const bands = estimated(mayor);
  const overlap = bands?.[a.key] && bands?.[b.key] ? Math.min(bands[a.key].high, bands[b.key].high) - Math.max(bands[a.key].low, bands[b.key].low) : null;
  return (
    <>
      <strong>{a.full_name}</strong> leads <strong>{b.full_name}</strong> by {((a.votes ?? 0) - (b.votes ?? 0)).toLocaleString("en-CA")} votes ({((a.share ?? 0) - (b.share ?? 0)).toFixed(1)} points) for mayor.
      {overlap !== null && (overlap > 0 ? " Their estimated ranges overlap." : " Their estimated ranges don’t overlap.")}
    </>
  );
}

export function ResultsHome(props: ResultsHomeProps) {
  const { state, now } = useLiveState();
  const { results, status } = resultsStatus(state, now);
  const payload: LivePayload | null = results?.payload ?? null;
  const closed = results?.closed ?? false;
  const mayor = payload?.races.find((r) => r.id === "mayor") ?? null;
  const tags = Object.fromEntries(Object.entries(props.notes.suspended).map(([name, iso]) => [mayor?.candidates.find((c) => c.full_name === name)?.key ?? name, `Suspended ${shortDate(iso)}`]));
  const suspendedNames = Object.keys(props.notes.suspended).filter((name) => mayor?.candidates.some((c) => c.full_name === name));
  return (
    <main id="main-content" className="np-shell">
      <ResultsBar
        status={status}
        links={
          <nav className="results-jump" aria-label="Sections">
            <a href="#mayor">Mayor</a> <a href="#council">Council</a> <a href="#map">Mayor by ward</a> <a href="#boards">School boards</a>
          </nav>
        }
      />
      <section className="race-hero results-opening" id="mayor" aria-labelledby="results-h">
        <div className="wrap">
          <h1 id="results-h">Toronto election results</h1>
          <div className="results-opening__grid">
            <div>
              {dek(mayor) && <p className="race-hero-dek">{dek(mayor)}</p>}
              <p className="results-source">These are the City of Toronto’s unofficial results. We update them through the night. The estimates come from our election-night model.</p>
            </div>
            {mayor && payload && <Meters mayor={mayor} />}
          </div>
        </div>
      </section>
      {/* Paused, or before the first poll: the status line says why, and nothing claims a count. */}
      {payload && (
        <div className="results-page">
          {mayor && mayor.state !== "no_figures" && (
            <MayorLead race={mayor} levels={payload.levels} closed={closed} tags={tags}>
              {suspendedNames.length > 0 && (
                <p className="results-note">
                  {`Suspended campaigns: ${suspendedNames.map((n) => `${n} (${shortDate(props.notes.suspended[n])}${props.notes.endorsed[n] ? `, endorsed ${props.notes.endorsed[n]}` : ""})`).join("; ")}.`}
                </p>
              )}
            </MayorLead>
          )}
          {mayor?.state === "no_figures" && (
            <ContentSection>
              <h2 id="live-race-mayor">Mayor</h2>
              <p className="live-empty">No figures from the City for this race right now</p>
            </ContentSection>
          )}
          <ContentSection id="council" aria-labelledby="council-h">
            <BlockHead id="council-h" title="Council: 25 races" dek="Toronto elects one councillor in each of its 25 wards." />
            <CouncilOverview homes={props.homes} payload={payload} closed={closed} />
          </ContentSection>
          <ContentSection>
            <MayorCount payload={payload} lead={false} />
          </ContentSection>
          {mayor && showsRaceResult(mayor) && (
            <ContentSection>
              <TwoChows mayor={mayor} named={props.named} />
            </ContentSection>
          )}
          <ContentSection>
            <Suspense fallback={null}>
              <LiveMapView data={props.mapData} payload={payload} wards={props.wards} ward={null} contests={["mayor"]} title="Mayor by ward" anchor="map" />
            </Suspense>
          </ContentSection>
          {mayor && showsRaceResult(mayor) && (
            <ContentSection aria-labelledby="outstanding-h">
              <BlockHead id="outstanding-h" title="Voting areas not yet in" dek="Some voting areas are much bigger than others. A few squares can hold a lot of votes." />
              <OutstandingAreas mayor={mayor} wards={props.wards} />
            </ContentSection>
          )}
          <ContentSection>
            <MayorWards payload={payload} wards={props.wards} />
          </ContentSection>
          <ContentSection>
            <Suspense fallback={null}>
              <LiveMapView key="council" data={props.mapData} payload={payload} wards={props.wards} ward={null} contests={["council"]} title="All 25 council races" anchor="council-map" />
            </Suspense>
            <CouncilTable homes={props.homes} payload={payload} closed={closed} />
          </ContentSection>
          <ContentSection id="boards" aria-labelledby="boards-h">
            <BlockHead id="boards-h" title="School board trustees: 29 races" />
            <TrusteeOverview homes={props.homes} payload={payload} closed={closed} />
          </ContentSection>
          <ContentSection aria-labelledby="about-h">
            <BlockHead id="about-h" title="Sources and methods" />
            <div className="results-about">
              <div>
                <h3>The count</h3>
                <p>Every figure is the City of Toronto’s unofficial count. We read the City’s results files about once a minute. “Voting areas in” is the share of areas the City has reported.</p>
              </div>
              <div>
                <h3>The estimates</h3>
                <p>The council and trustee ranges come from a model that had to beat simply reading the count in replays of past elections before it could appear. The mayor’s estimate did not pass that test; it shows on our editor’s approval, with its record below.</p>
              </div>
              <div>
                <h3>The end of the night</h3>
                <p>When the count stops, we mark each race’s leader as elected (unofficial). The City certifies the results in the days after the vote.</p>
              </div>
            </div>
            <p className="results-note"><Link href="/how-it-works/">How the estimates work →</Link></p>
          </ContentSection>
        </div>
      )}
      {mayor && payload && <MayorNotes race={mayor} levels={payload.levels} forecast={props.forecast} closed={closed} />}
    </main>
  );
}

/** A section's heading and its one sentence (the prototype's block head). */
function BlockHead({ id, title, dek }: { id: string; title: string; dek?: string }) {
  return (
    <div className="results-block-head">
      <h2 id={id}>{title}</h2>
      {dek && <p>{dek}</p>}
    </div>
  );
}

/** The citywide figures beside the opening sentence: voting areas in and turnout so far. */
function Meters({ mayor }: { mayor: LiveRace }) {
  const p = mayor.progress;
  const share = p && p.total > 0 ? Math.min(100, (100 * p.received) / p.total) : null;
  return (
    <dl className="results-meters">
      <div>
        <dt>Voting areas in</dt>
        <dd>
          {mayor.state === "all_units_in" ? (
            "All in"
          ) : p ? (
            <>
              {`${Math.floor(share ?? 0)}%`} <small>{`${p.received.toLocaleString("en-CA")} of ${p.total.toLocaleString("en-CA")}`}</small>
            </>
          ) : mayor.state === "before_results" ? (
            <small>From 8 p.m.</small>
          ) : (
            <small>Not available</small>
          )}
        </dd>
        {share !== null && (
          <span className="results-meters__track" aria-hidden="true">
            <span style={{ width: `${share}%` }} />
          </span>
        )}
      </div>
      <div className="results-meters__turnout">
        <dt>Turnout</dt>
        <dd>
          <TurnoutBar race={mayor} />
        </dd>
      </div>
    </dl>
  );
}
