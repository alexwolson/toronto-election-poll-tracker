/**
 * The minimal live results page (#30): every race's Live Tally from the payload,
 * with Reporting Progress, the City count time, the staleness banner, the
 * rehearsal bar and the browser's can't-reach notice (#17 § On-night reader
 * wording). Pure: the poller supplies the state and the clock.
 */

import { showsUnreachableNotice, type LiveClientState } from "@/lib/live-accept";
import { TRUSTEE_BOARD_NAV } from "@/lib/trustees";
import type { LiveCandidate, LiveProgress, LiveRace } from "@/types/live";

/** The banner shows once the newest heartbeat is older than this (#17 § Staleness). */
const STALE_AFTER_MS = 5 * 60_000;

const CLOCK = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Toronto",
  hour: "numeric",
  minute: "2-digit",
});

/** Epoch ms as Toronto wall-clock time: "9:46 p.m.". */
function clockTime(ms: number): string {
  return CLOCK.format(ms);
}

/** "9:46 p.m." already ends a sentence; "21:46" would not. */
function endSentence(text: string): string {
  return text.endsWith(".") ? text : `${text}.`;
}

function raceTitle(race: LiveRace): string {
  if (race.level === "mayor") return "Mayor";
  if (race.level === "council") return race.name ? `Ward ${race.num} ${race.name}` : `Ward ${race.num}`;
  const board = TRUSTEE_BOARD_NAV.find(({ boardId }) => race.id.startsWith(`${boardId}-`));
  return `${board?.shortName ?? "Trustee"} Ward ${race.num}`;
}

function ProgressLine({ progress }: { progress: LiveProgress }) {
  const fraction = progress.total > 0 ? Math.min(1, progress.received / progress.total) : 0;
  return (
    <p className="live-progress">
      <span className="live-progress__track" aria-hidden="true">
        <span className="live-progress__fill" style={{ width: `${fraction * 100}%` }} />
      </span>
      <span className="font-mono">
        {progress.received} of {progress.total} voting areas in
      </span>
    </p>
  );
}

function Tally({ race, candidates }: { race: LiveRace; candidates: LiveCandidate[] }) {
  return (
    <table className="live-tally">
      <caption className="sr-only">{raceTitle(race)} count</caption>
      <thead>
        <tr>
          <th scope="col">Candidate</th>
          <th scope="col" className="live-num">Votes</th>
          <th scope="col" className="live-num">Share</th>
        </tr>
      </thead>
      <tbody>
        {candidates.map((candidate) => (
          <tr key={candidate.key}>
            <th scope="row">{candidate.full_name}</th>
            <td className="live-num">{candidate.votes?.toLocaleString("en-CA") ?? "–"}</td>
            <td className="live-num">{candidate.share === null ? "–" : `${candidate.share.toFixed(1)}%`}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RaceBody({ race }: { race: LiveRace }) {
  switch (race.state) {
    case "before_results":
      return (
        <>
          <p className="live-race__status">Results from 8 p.m.</p>
          <ul className="live-ballot">
            {race.candidates.map((candidate) => (
              <li key={candidate.key}>{candidate.full_name}</li>
            ))}
          </ul>
        </>
      );
    case "acclaimed":
      return (
        <p className="live-race__status">
          {race.candidates[0]?.full_name ?? "The only candidate"} was acclaimed: the only candidate, so there
          is no vote.
        </p>
      );
    case "no_figures":
      return <p className="live-race__status">No figures from the City for this race right now</p>;
    case "no_units_in":
      return <p className="live-race__status">No voting areas have reported yet</p>;
    case "counting":
    case "all_units_in":
      return (
        <>
          {race.state === "all_units_in" ? (
            <p className="live-race__status">All voting areas in</p>
          ) : (
            race.progress && <ProgressLine progress={race.progress} />
          )}
          <Tally race={race} candidates={race.candidates} />
        </>
      );
  }
}

export function LiveResultsView({ state, now }: { state: LiveClientState; now: number }) {
  const unreachable = showsUnreachableNotice(state) && (
    <p className="live-notice" role="status">
      Can&apos;t reach live results; retrying
    </p>
  );
  const results = state.results;
  if (results === null) {
    return unreachable || <p className="live-loading">Loading live results…</p>;
  }

  const { payload, heartbeat } = results;
  const counting = payload.state === "results";
  const cityCountAt = Math.min(payload.seq.all_office, payload.seq.ward_by_ward);

  return (
    <div className="live-results">
      {payload.rehearsal && <p className="live-rehearsal">Rehearsal: not real results</p>}
      {now - heartbeat > STALE_AFTER_MS && (
        <p className="live-stale" role="status">
          We haven&apos;t been able to read the City&apos;s results since {endSentence(clockTime(heartbeat))} The
          count below may be out of date.
        </p>
      )}
      {unreachable}
      <p className="live-status font-mono">
        {counting && <>City count as of {clockTime(cityCountAt)} · </>}
        Refreshes every minute · City of Toronto unofficial results
      </p>
      {payload.races.map((race) => (
        <section key={race.id} className="live-race" aria-labelledby={`live-race-${race.id}`}>
          <h3 id={`live-race-${race.id}`}>{raceTitle(race)}</h3>
          <RaceBody race={race} />
        </section>
      ))}
    </div>
  );
}
