/**
 * The Ward Ballot pages (#35, on #30's simple race display): the picker, the
 * mayor card, the chosen ward's races, then the 25 council tiles, with Reporting
 * Progress, the City count time, the staleness banner, the rehearsal bar and the
 * browser's can't-reach notice (#17 § On-night reader wording). Pure apart from
 * the picker: the poller supplies the state and the clock, and the page the ward.
 */

import type { ReactNode } from "react";
import { ContentSection } from "@/components/content-section";
import { PageHero } from "@/components/page-hero";
import { showsUnreachableNotice, type LiveClientState } from "@/lib/live-accept";
import type { MarginOutcomesView } from "@/lib/mayoral-forecast";
import { wardLabel, type ResultsWard } from "@/lib/results-wards";
import { CouncilTiles, FrenchBoards, RaceCard } from "./race-cards";
import { WardPicker } from "./ward-picker";

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

export interface LiveResultsViewProps {
  state: LiveClientState;
  now: number;
  /** Every City ward, for the picker and the tiles. */
  wards: ResultsWard[];
  /** The ward whose page this is; null on /results/. */
  ward: ResultsWard | null;
  /** The ward's payload race ids after the mayor (`wardBallotRaceIds`). */
  ballot: string[];
  /** The final forecast's margin outcomes for the mayor card; null when it doesn't publish. */
  forecast: MarginOutcomesView | null;
}

/** The whole page, in CHW components (PageHero, Callout, Badge, Card, `.grid`,
 *  `.field`, `.pill`, `.t-*`) and the /wards index's cards: page status on the
 *  hero's paper ground, where a tint Callout shows, then the ballot's cards and
 *  the council tiles. */
export function LiveResultsView({ state, now, wards, ward, ballot, forecast }: LiveResultsViewProps) {
  const unreachable = showsUnreachableNotice(state) && (
    <p className="callout" role="status">
      Can&apos;t reach live results; retrying
    </p>
  );
  const results = state.results;

  let status: ReactNode = unreachable || <p className="t-meta">Loading live results…</p>;
  let ballotCards: ReactNode = null;
  if (results !== null) {
    const { payload, heartbeat } = results;
    const counting = payload.state === "results";
    const cityCountAt = Math.min(payload.seq.all_office, payload.seq.ward_by_ward);
    const shown = ["mayor", ...ballot].flatMap((id) => payload.races.filter((race) => race.id === id));
    const main = shown.filter((race) => race.level !== "french_trustee");
    const french = shown.filter((race) => race.level === "french_trustee");

    status = (
      <>
        {payload.rehearsal && (
          <p>
            <span className="badge badge--soon">Rehearsal: not real results</span>
          </p>
        )}
        {now - heartbeat > STALE_AFTER_MS && (
          <p className="callout" role="status">
            We haven&apos;t been able to read the City&apos;s results since {clockTime(heartbeat)} The count below
            may be out of date.
          </p>
        )}
        {unreachable}
        <p className="t-meta">
          {counting && <>City count as of {clockTime(cityCountAt)} · </>}
          Refreshes every minute · City of Toronto unofficial results
        </p>
      </>
    );
    ballotCards = (
      <ContentSection aria-labelledby="results-ballot-heading">
        <h2 id="results-ballot-heading">{ward ? `On the Ward ${ward.num} ballot` : "Citywide"}</h2>
        <div className="grid">
          {main.map((race) => (
            <RaceCard key={race.id} race={race} ward={ward?.num ?? null} forecast={forecast} />
          ))}
          <FrenchBoards races={french} />
        </div>
      </ContentSection>
    );
  }

  return (
    <>
      <PageHero
        headingId="results-heading"
        title={ward ? wardLabel(ward) : "Election night results"}
        description={ward ? "Election night results" : undefined}
      >
        <WardPicker wards={wards} ward={ward} />
        <div className="grid">{status}</div>
      </PageHero>
      {ballotCards}
      {/* The tiles' wards are static, so they show before the first good poll. */}
      <CouncilTiles wards={wards} races={results?.payload.races ?? []} />
    </>
  );
}
