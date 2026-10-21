"use client";

/**
 * A race's result once its count starts, the same for every race we track (Alex): the count on the
 * left (each candidate's votes large, bars scaled to the most anyone can still reach, a field of
 * more than five folded to "N other candidates"), the projected finish on the right when the
 * level's projection shows, then voting areas in and, where its electorate is known, turnout. The
 * mayor's leads the page; a ward's races follow on its page. Facts of the count and the gated
 * projection (#12).
 */

import type { LivePayload, LiveRace } from "@/types/live";
import { liveColour } from "@/lib/live-colour";
import { rangeText, shareText } from "@/lib/live-share";
import type { LiveCandidate } from "@/types/live";
import { ChowBenchmark, FinalForecast, MayorRecord, RaceLeadTally, estimated, hasRecord, raceTitle } from "./race-cards";
import { AboutTurnout, TurnoutBar } from "./turnout-bar";

/** Whether a race shows as a result: once its count has started. */
export function showsRaceResult(race: LiveRace | null | undefined): boolean {
  return !!race && (race.state === "counting" || race.state === "all_units_in") && race.candidates.length >= 2;
}

/** Where the projection has the two leaders finishing (Alex): each central projection large, and
 *  both Estimated Ranges on one share axis, so the gap between the middles and how far the ranges
 *  overlap read together. The payload has each candidate's range, not one for the gap. */
function ProjectedFinish({ race, leaders }: { race: LiveRace; leaders: LiveCandidate[] }) {
  const bands = estimated(race);
  const shown = leaders.flatMap((c) => (bands?.[c.key] ? [{ c, band: bands[c.key], colour: liveColour(c, "var(--color-disengaged)") }] : []));
  if (shown.length < 2) return null;
  const lo = Math.max(0, Math.floor((Math.min(...shown.map((x) => x.band.low)) - 2) / 5) * 5);
  const hi = Math.min(100, Math.ceil((Math.max(...shown.map((x) => x.band.high)) + 2) / 5) * 5);
  const at = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`;
  const ticks = Array.from({ length: Math.floor((hi - lo) / 5) + 1 }, (_, i) => lo + i * 5);
  return (
    <figure className="mayor-projection">
      <figcaption>
        <h3>Projected finish</h3>
      </figcaption>
      <div className="mayor-projection__plot">
        {shown.map(({ c, band, colour }) => (
          <div key={c.key} className="mayor-projection__row">
            <span className="mayor-projection__name">{c.full_name}</span>
            <p className="mayor-projection__figures">
              <strong style={{ color: colour }}>{shareText(band.mid)}</strong>
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
      <p className="mayor-projection__note">90% confidence interval</p>
    </figure>
  );
}

/** One race's result: the mayor's at the head of the page (`lead`), a ward's races on its page. */
export function RaceResult({
  race,
  levels,
  closed,
  lead = false,
}: {
  race: LiveRace;
  levels: LivePayload["levels"] | null;
  closed: boolean;
  lead?: boolean;
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
          <RaceLeadTally race={race} levels={levels} closed={closed} />
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
export function MayorLead(props: { race: LiveRace; levels: LivePayload["levels"] | null; closed: boolean }) {
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
        {/* A benchmark for reading early returns: gone once Night Close declares the count final (Alex). */}
        {race.state === "counting" && !closed && <ChowBenchmark race={race} />}
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
