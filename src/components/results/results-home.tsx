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
import { RaceCard } from "./race-cards";
import { ResultsBar, resultsStatus } from "./results-status";
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
      <section className="race-hero" id="mayor" aria-labelledby="results-h">
        <div className="wrap">
          <h1 id="results-h">Toronto election results</h1>
          {dek(mayor) && <p className="race-hero-dek">{dek(mayor)}</p>}
          <p className="race-hero-meta">These are the City of Toronto’s unofficial results. We update them through the night. The estimates come from our election-night model.</p>
        </div>
      </section>
      <div className="results-page">
        {mayor &&
          (showsRaceResult(mayor) ? (
            <MayorLead race={mayor} levels={payload!.levels} closed={closed} tags={tags} />
          ) : (
            <ContentSection>
              <RaceCard race={mayor} levels={payload!.levels} forecast={props.forecast} closed={closed} />
            </ContentSection>
          ))}
        {suspendedNames.length > 0 && (
          <ContentSection>
            <p className="t-meta">
              {`Suspended campaigns: ${suspendedNames.map((n) => `${n} (${shortDate(props.notes.suspended[n])}${props.notes.endorsed[n] ? `, endorsed ${props.notes.endorsed[n]}` : ""})`).join("; ")}.`}
            </p>
          </ContentSection>
        )}
        <ContentSection id="council" aria-labelledby="council-h">
          <h2 id="council-h">Council: 25 races</h2>
          <p className="race-hero-dek">Toronto elects one councillor in each of its 25 wards.</p>
          <CouncilOverview homes={props.homes} payload={payload} />
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
            <h2 id="outstanding-h">Voting areas not yet in</h2>
            <p className="race-hero-dek">Some voting areas are much bigger than others. A few squares can hold a lot of votes.</p>
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
          <CouncilTable homes={props.homes} payload={payload} />
        </ContentSection>
        <ContentSection id="boards" aria-labelledby="boards-h">
          <h2 id="boards-h">School board trustees: 29 races</h2>
          <TrusteeOverview homes={props.homes} payload={payload} />
        </ContentSection>
        <ContentSection aria-labelledby="about-h">
          <h2 id="about-h">Sources and methods</h2>
          <div className="grid grid--3">
            <div>
              <h3>The count</h3>
              <p className="t-body-small">Every figure is the City of Toronto’s unofficial count. We read the City’s results files about once a minute. “Voting areas in” is the share of areas the City has reported.</p>
            </div>
            <div>
              <h3>The estimates</h3>
              <p className="t-body-small">The council and trustee ranges come from a model that had to beat simply reading the count in replays of past elections before it could appear. The mayor’s estimate did not pass that test; it shows on our editor’s approval, with its record below.</p>
            </div>
            <div>
              <h3>The end of the night</h3>
              <p className="t-body-small">When the count stops, we mark each race’s leader as elected (unofficial). The City certifies the results in the days after the vote.</p>
            </div>
          </div>
          <p className="t-meta"><Link href="/how-it-works/">How the estimates work →</Link></p>
        </ContentSection>
      </div>
      {mayor && showsRaceResult(mayor) && <MayorNotes race={mayor} levels={payload!.levels} forecast={props.forecast} closed={closed} />}
    </main>
  );
}
