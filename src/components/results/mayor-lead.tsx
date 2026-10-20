"use client";

/**
 * The mayor's race, first on the results pages once the count starts, and its only view: the two
 * leaders large with their Estimated Ranges and out-of-reach zones, the rest of the field
 * expandable in place, the key, the count lead over the night, the facts that read the count, the
 * 2023 benchmark and the card's disclosures. Facts of the count and the gated projection (#12).
 */

import type { LivePayload, LiveRace } from "@/types/live";
import { LeadChart } from "./live-count-view";
import { useLiveHistoryIfProvided } from "./live-results-poller";
import { ChowBenchmark, FinalForecast, MayorLeadTally, MayorRecord, hasRecord } from "./race-cards";
import { AboutTurnout, TurnoutBar } from "./turnout-bar";

/** Whether the mayor leads the page: once its count has started. */
export function showsMayorLead(race: LiveRace | null | undefined): race is LiveRace {
  return !!race && (race.state === "counting" || race.state === "all_units_in") && race.candidates.length >= 2;
}

export function MayorLead({
  race,
  levels,
  ward,
  forecast,
  closed,
}: {
  race: LiveRace;
  levels: LivePayload["levels"] | null;
  ward: string | null;
  forecast: boolean;
  closed: boolean;
}) {
  const history = useLiveHistoryIfProvided();
  const byVotes = [...race.candidates].sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0));
  const [first, second] = byVotes;
  const lead = (first.share ?? 0) - (second.share ?? 0);
  const wardRow = ward ? (race.wards?.find((w) => w.num === ward) ?? null) : null;
  const finalForecast = forecast && !closed && race.state !== "all_units_in";
  return (
    <section className="mayor-lead" aria-labelledby="live-race-mayor">
      <div className="wrap">
        <h2 id="live-race-mayor">Mayor</h2>
        <div className="mayor-lead__main">
          <div className="mayor-lead__tally">
            <MayorLeadTally race={race} levels={levels} closed={closed} ward={ward} />
          </div>
          {history && (
            <div className="mayor-lead__chart">
              <LeadChart race={{ ...race, candidates: byVotes }} history={history} axis="clock" />
            </div>
          )}
        </div>
        <dl className="mayor-lead__facts">
          <div>
            <dt>In the count</dt>
            <dd>{lead === 0 ? "Tied" : `${first.full_name} leads by ${lead.toFixed(1)} points`}</dd>
          </div>
          <div>
            <dt>Voting areas in</dt>
            <dd>
              {race.state === "all_units_in" || !race.progress
                ? "All in"
                : `${race.progress.received.toLocaleString("en-CA")} of ${race.progress.total.toLocaleString("en-CA")}`}
              {wardRow?.progress && (
                <span className="mayor-lead__sub">{`Ward ${ward}: ${wardRow.progress.received} of ${wardRow.progress.total}`}</span>
              )}
            </dd>
          </div>
          <div className="mayor-lead__turnout">
            <dt className="visually-hidden">Turnout</dt>
            <dd>
              {/* The voters' list bar (Alex): the page's ward's, or the city's. */}
              <TurnoutBar race={race} ward={ward} />
            </dd>
          </div>
        </dl>
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
