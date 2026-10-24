"use client";

/**
 * The mayor's result at the head of the citywide page and the projected finish every race page
 * shares (results redesign, Alex, the prototype): the count as a table, the projection beside it.
 * Facts of the count and the gated projection (#12).
 */

import type { ReactNode } from "react";
import type { LivePayload, LiveRace } from "@/types/live";
import { figureColour, liveColour } from "@/lib/live-colour";
import { rangeText, shareText } from "@/lib/live-share";
import type { LiveCandidate } from "@/types/live";
import { FinalForecast, MayorRecord, RangeNotes, estimated, hasRecord } from "./race-cards";
import { CandidateTable } from "./race-parts";
import { AboutTurnout } from "./turnout-bar";

/** Whether a race shows as a result: once its count has started. */
export function showsRaceResult(race: LiveRace | null | undefined): boolean {
  return !!race && (race.state === "counting" || race.state === "all_units_in") && race.candidates.length >= 2;
}

/** Axis ticks for a span of shares: the widest of 5, 10, 20 or 25 points that keeps to six labels. */
function shareTicks(lo: number, hi: number): number[] {
  const step = [5, 10, 20, 25].find((s) => (hi - lo) / s <= 5) ?? 25;
  const first = Math.ceil(lo / step) * step;
  return Array.from({ length: Math.floor((hi - first) / step) + 1 }, (_, i) => first + i * step);
}

/** Where the projection has the race's leaders finishing (Alex, the prototype): each central
 *  projection large, their Estimated Ranges on one share axis, so the gap between the middles and
 *  how far the ranges overlap read together; then the next three in a small table and everyone
 *  else in one row. The payload has each candidate's range, not one for the gap. */
export function ProjectedFinish({
  race,
  leaders,
  colourOf,
}: {
  race: LiveRace;
  leaders: LiveCandidate[];
  /** A race page's colours (results redesign), so the card matches its panels; else the campaign colour. */
  colourOf?: (c: LiveCandidate) => string;
}) {
  const bands = estimated(race);
  const colour = colourOf ?? ((c: LiveCandidate) => liveColour(c, "var(--color-disengaged)"));
  const withBand = (c: LiveCandidate) => (bands?.[c.key] ? [{ c, band: bands[c.key], colour: colour(c) }] : []);
  const top = leaders.flatMap(withBand);
  if (top.length < 2) return null;
  const leaderKeys = new Set(top.map((x) => x.c.key));
  const rest = race.candidates.flatMap(withBand).filter((x) => !leaderKeys.has(x.c.key)).sort((a, b) => b.band.mid - a.band.mid);
  const next = rest.slice(0, 3);
  const others = rest.slice(3);
  const lo = Math.max(0, Math.floor((Math.min(...top.map((x) => x.band.low)) - 2) / 5) * 5);
  const hi = Math.min(100, Math.ceil((Math.max(...top.map((x) => x.band.high)) + 2) / 5) * 5);
  const at = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`;
  const ticks = shareTicks(lo, hi);
  const ceiling = others.length ? Math.ceil(Math.max(...others.map((x) => x.band.mid))) : 0;
  return (
    <figure className="mayor-projection">
      <figcaption>
        <h3>Projected finish</h3>
        <p className="mayor-projection__sub">Our estimate of where each candidate will finish.</p>
      </figcaption>
      <div className="mayor-projection__plot">
        {top.map(({ c, band, colour }) => (
          <div key={c.key} className="mayor-projection__row">
            <span className="mayor-projection__name">{c.full_name}</span>
            <p className="mayor-projection__figures">
              <strong style={{ color: figureColour(colour) }}>{shareText(band.mid)}</strong>
              <span className="mayor-projection__span">{rangeText(band.low, band.high)}</span>
            </p>
            <span className="mayor-projection__track" aria-hidden="true">
              <span className="mayor-projection__range" style={{ left: at(band.low), width: `calc(${at(band.high)} - ${at(band.low)})`, borderColor: colour, background: `color-mix(in srgb, ${colour} 22%, transparent)` }} />
              <span className="mayor-projection__mid" style={{ left: at(band.mid), background: colour }} />
            </span>
          </div>
        ))}
        <div className="mayor-projection__ticks" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t} style={{ left: at(t) }}>{`${t}%`}</span>
          ))}
        </div>
      </div>
      <p className="mayor-projection__note">99% confidence interval</p>
      {next.length > 0 && (
        <table className="mayor-projection__rest">
          <thead>
            <tr>
              <th scope="col">Candidate</th>
              <th scope="col" className="live-num">Estimate</th>
              <th scope="col" className="live-num">Range</th>
            </tr>
          </thead>
          <tbody>
            {next.map(({ c, band, colour }) => (
              <tr key={c.key}>
                <th scope="row">
                  <span className="live-table__swatch" style={{ background: colour }} aria-hidden="true" />
                  {c.full_name}
                </th>
                <td className="live-num mayor-projection__est">{shareText(band.mid)}</td>
                <td className="live-num">{rangeText(band.low, band.high)}</td>
              </tr>
            ))}
            {others.length > 0 && (
              <tr className="mayor-projection__others">
                <th scope="row">{`${others.length} other candidate${others.length === 1 ? "" : "s"}`}</th>
                <td colSpan={2} className="live-num">{ceiling <= 1 ? "each under 1%" : `each under ${ceiling}%`}</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </figure>
  );
}

/** The mayor's result at the head of the page (Alex, the prototype): the count as a table, its top
 *  five and the rest in one row, the projected finish beside it, and any gate note. Voting areas in
 *  and turnout sit in the page's opening. */
export function RaceResult({
  race,
  levels,
  closed,
  tags,
  children,
}: {
  race: LiveRace;
  levels: LivePayload["levels"] | null;
  closed: boolean;
  /** Tags after candidates' names: Suspended Campaigns (results redesign). */
  tags?: Record<string, string>;
  /** Notes under the table, such as the suspended campaigns. */
  children?: ReactNode;
}) {
  const counting = showsRaceResult(race);
  const byVotes = [...race.candidates].sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0));
  const [first, second] = byVotes;
  const named = race.candidates.filter((c) => c.candidate_id).length;
  const colourOf = (c: LiveCandidate) => liveColour(c, "var(--color-disengaged)");
  const setupOf = (c: LiveCandidate) => (tags?.[c.key] ? { name: c.full_name, line: null, tag: tags[c.key], past: [], url: null } : null);
  return (
    <section className="mayor-lead" aria-labelledby={`live-race-${race.id}`}>
      <div className="wrap mayor-lead__main">
        <div className="mayor-lead__tally">
          <div className="results-race-title">
            <h2 id={`live-race-${race.id}`}>Mayor</h2>
          </div>
          <CandidateTable race={race} colourOf={colourOf} setupOf={setupOf} closed={closed} fold={counting ? 5 : Math.max(2, named)} top={2} />
          <RangeNotes race={race} levels={levels} />
          {children}
        </div>
        {counting && <ProjectedFinish race={race} leaders={[first, second]} />}
      </div>
    </section>
  );
}

/** The mayor's result at the head of the results pages. */
export function MayorLead(props: { race: LiveRace; levels: LivePayload["levels"] | null; closed: boolean; tags?: Record<string, string>; children?: ReactNode }) {
  return <RaceResult {...props} />;
}

/** The mayor's notes, at the very bottom of the results pages, after every view (Alex): the 2023
 *  benchmark and the disclosures about turnout, the estimate's record and the final forecast. */
export function MayorNotes({
  race,
  levels,
  forecast,
  closed,
}: {
  race: LiveRace;
  levels: LivePayload["levels"] | null;
  forecast: boolean;
  closed: boolean;
}) {
  const finalForecast = forecast && !closed && race.state !== "all_units_in";
  return (
    <section className="mayor-notes" aria-label="About the mayor's count">
      <div className="wrap">
        <div className="live-card-more">
          <AboutTurnout />
          {hasRecord(race, levels) && <MayorRecord />}
          {finalForecast && <FinalForecast />}
        </div>
      </div>
    </section>
  );
}

/** Whether the mayor leads the page: once its count has started. */
export function showsMayorLead(race: LiveRace | null | undefined): race is LiveRace {
  return showsRaceResult(race);
}
