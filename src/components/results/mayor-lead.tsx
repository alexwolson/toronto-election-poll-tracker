"use client";

/**
 * A race's result once its count starts, the same for every race we track (Alex): the count on the
 * left (each candidate's votes large, bars scaled to the most anyone can still reach, a field of
 * more than five folded to "N other candidates"), the projected finish on the right when the
 * level's projection shows, then voting areas in and, where its electorate is known, turnout. The
 * mayor's leads the page; a ward's races follow on its page. Facts of the count and the gated
 * projection (#12).
 */

import { useState } from "react";
import type { LivePayload, LiveRace } from "@/types/live";
import { figureColour, liveColour } from "@/lib/live-colour";
import { rangeText, shareText } from "@/lib/live-share";
import type { LiveCandidate } from "@/types/live";
import { FinalForecast, MayorRecord, RaceLeadTally, estimated, hasRecord, raceTitle } from "./race-cards";
import { AboutTurnout, TurnoutBar } from "./turnout-bar";

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

/** Where the projection has the two leaders finishing (Alex): each central projection large, and
 *  both Estimated Ranges on one share axis, so the gap between the middles and how far the ranges
 *  overlap read together; every candidate with a range on asking. The payload has each
 *  candidate's range, not one for the gap. */
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
  const [all, setAll] = useState(false);
  const bands = estimated(race);
  const colour = colourOf ?? ((c: LiveCandidate) => liveColour(c, "var(--color-disengaged)"));
  const withBand = (c: LiveCandidate) => (bands?.[c.key] ? [{ c, band: bands[c.key], colour: colour(c) }] : []);
  const top = leaders.flatMap(withBand);
  if (top.length < 2) return null;
  const everyone = race.candidates.flatMap(withBand).sort((a, b) => b.band.mid - a.band.mid);
  const shown = all ? everyone : top;
  const lo = Math.max(0, Math.floor((Math.min(...shown.map((x) => x.band.low)) - 2) / 5) * 5);
  const hi = Math.min(100, Math.ceil((Math.max(...shown.map((x) => x.band.high)) + 2) / 5) * 5);
  const at = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`;
  const ticks = shareTicks(lo, hi);
  const leaderKeys = new Set(top.map((x) => x.c.key));
  return (
    <figure className="mayor-projection">
      <figcaption>
        <h3>Projected finish</h3>
      </figcaption>
      <div className="mayor-projection__plot">
        {shown.map(({ c, band, colour }) => (
          <div key={c.key} className={`mayor-projection__row${leaderKeys.has(c.key) ? "" : " mayor-projection__row--rest"}`}>
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
      {everyone.length > top.length && (
        <button type="button" className="mayor-projection__toggle" aria-expanded={all} onClick={() => setAll((v) => !v)}>
          {all ? (top.length === 3 ? "Show the top three" : "Show the top two") : `Show all ${everyone.length} candidates`}
        </button>
      )}
    </figure>
  );
}

/** One race's result: the mayor's at the head of the page (`lead`), a ward's races on its page. */
export function RaceResult({
  race,
  levels,
  closed,
  lead = false,
  tags,
}: {
  race: LiveRace;
  levels: LivePayload["levels"] | null;
  closed: boolean;
  lead?: boolean;
  /** Tags after candidates' names: Suspended Campaigns (results redesign). */
  tags?: Record<string, string>;
}) {
  const byVotes = [...race.candidates].sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0));
  const [first, second] = byVotes;
  const turnout = race.level === "mayor" || race.level === "council";
  const Heading = lead ? "h2" : "h3";
  const body = (
    <>
      <Heading id={`live-race-${race.id}`}>{lead ? "Mayor" : raceTitle(race)}</Heading>
      <div className="mayor-lead__main">
        <div className="mayor-lead__tally">
          <RaceLeadTally race={race} levels={levels} closed={closed} tags={tags} />
        </div>
        <ProjectedFinish race={race} leaders={[first, second]} />
      </div>
      <dl className="mayor-lead__facts">
        <div>
          <dt>Voting areas in</dt>
          <dd>
            {race.state === "all_units_in"
              ? "All in"
              : race.progress
                ? `${race.progress.received.toLocaleString("en-CA")} of ${race.progress.total.toLocaleString("en-CA")}`
                : "Not available"}
            {race.progress && race.progress.total > 0 && (
              <span className="mayor-lead__progress" aria-hidden="true">
                <span style={{ width: `${Math.min(100, (100 * race.progress.received) / race.progress.total)}%` }} />
              </span>
            )}
          </dd>
        </div>
        {turnout && (
          <div className="mayor-lead__turnout">
            <dt>Turnout so far</dt>
            <dd>
              {/* The voters' list bar (Alex): the mayor's citywide, a council race's for its ward. */}
              <TurnoutBar race={race} />
            </dd>
          </div>
        )}
      </dl>
    </>
  );
  return lead ? (
    <section className="mayor-lead" aria-labelledby={`live-race-${race.id}`}>
      <div className="wrap">{body}</div>
    </section>
  ) : (
    <section className="race-result" aria-labelledby={`live-race-${race.id}`}>
      {body}
    </section>
  );
}

/** The mayor's result at the head of the results pages. */
export function MayorLead(props: { race: LiveRace; levels: LivePayload["levels"] | null; closed: boolean; tags?: Record<string, string> }) {
  return <RaceResult {...props} lead />;
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
