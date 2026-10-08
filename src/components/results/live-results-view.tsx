/**
 * The minimal live results page (#30): every race's Live Tally from the payload,
 * with Reporting Progress, the City count time, the staleness banner, the
 * rehearsal bar and the browser's can't-reach notice (#17 § On-night reader
 * wording). Pure: the poller supplies the state and the clock.
 */

import type { ReactNode } from "react";
import { ContentSection } from "@/components/content-section";
import { PageHero } from "@/components/page-hero";
import { showsUnreachableNotice, type LiveClientState } from "@/lib/live-accept";
import { TRUSTEE_BOARD_NAV } from "@/lib/trustees";
import type { LiveProgress, LiveRace } from "@/types/live";

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

function raceTitle(race: LiveRace): string {
  if (race.level === "mayor") return "Mayor";
  if (race.level === "council") return race.name ? `Ward ${race.num} ${race.name}` : `Ward ${race.num}`;
  const board = TRUSTEE_BOARD_NAV.find(({ boardId }) => race.id.startsWith(`${boardId}-`));
  return `${board?.shortName ?? "Trustee"} Ward ${race.num}`;
}

/** The thin Reporting Progress bar: the one piece with no CHW or site component. */
function ProgressLine({ progress }: { progress: LiveProgress }) {
  const fraction = progress.total > 0 ? Math.min(1, progress.received / progress.total) : 0;
  return (
    <p className="live-progress t-meta">
      <span className="live-progress__track" aria-hidden="true">
        <span className="live-progress__fill" style={{ width: `${fraction * 100}%` }} />
      </span>
      {progress.received} of {progress.total} voting areas in
    </p>
  );
}

/** The Live Tally, in the ward poll results table (`ward-polls.tsx`). */
function Tally({ race }: { race: LiveRace }) {
  return (
    <table className="ward-poll-results">
      <caption className="sr-only">{raceTitle(race)} count</caption>
      <thead>
        <tr>
          <th scope="col">Candidate</th>
          <th scope="col">Votes</th>
          <th scope="col">Share</th>
        </tr>
      </thead>
      <tbody>
        {race.candidates.map((candidate) => (
          <tr key={candidate.key}>
            <th scope="row">{candidate.full_name}</th>
            <td>{candidate.votes?.toLocaleString("en-CA") ?? "–"}</td>
            <td>{candidate.share === null ? "–" : `${candidate.share.toFixed(1)}%`}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Status({ children }: { children: ReactNode }) {
  return <p className="t-body-small">{children}</p>;
}

function RaceBody({ race }: { race: LiveRace }) {
  switch (race.state) {
    case "before_results":
      return (
        <>
          <Status>Results from 8 p.m.</Status>
          <p className="t-body-small">{race.candidates.map((candidate) => candidate.full_name).join(" · ")}</p>
        </>
      );
    case "acclaimed":
      // The bundle lists exactly one candidate for an acclaimed race (docs/payload.md).
      return (
        <Status>
          {`${race.candidates[0]?.full_name} was acclaimed: the only candidate, so there is no vote.`}
        </Status>
      );
    case "no_figures":
      return <Status>No figures from the City for this race right now</Status>;
    case "no_units_in":
      return <Status>No voting areas have reported yet</Status>;
    case "counting":
    case "all_units_in":
      return (
        <>
          {race.state === "all_units_in" ? (
            <Status>All voting areas in</Status>
          ) : race.progress ? (
            <ProgressLine progress={race.progress} />
          ) : (
            <Status>Voting areas: not available</Status>
          )}
          <Tally race={race} />
        </>
      );
  }
}

function Shell({ status, children }: { status: ReactNode; children?: ReactNode }) {
  return (
    <>
      <PageHero headingId="results-heading" title="Election night results">
        <div className="grid">{status}</div>
      </PageHero>
      {children && (
        <ContentSection aria-labelledby="results-races-heading">
          <h2 id="results-races-heading">Every race</h2>
          <div className="grid">{children}</div>
        </ContentSection>
      )}
    </>
  );
}

/** The whole page, in CHW components (PageHero, Callout, Badge, Card, `.grid`,
 *  `.t-*`): page status on the hero's paper ground, where a tint Callout shows,
 *  and a Card per race in the section below. */
export function LiveResultsView({ state, now }: { state: LiveClientState; now: number }) {
  const unreachable = showsUnreachableNotice(state) && (
    <p className="callout" role="status">
      Can&apos;t reach live results; retrying
    </p>
  );
  const results = state.results;
  if (results === null) {
    return <Shell status={unreachable || <p className="t-meta">Loading live results…</p>} />;
  }

  const { payload, heartbeat } = results;
  const counting = payload.state === "results";
  const cityCountAt = Math.min(payload.seq.all_office, payload.seq.ward_by_ward);

  const status = (
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

  return (
    <Shell status={status}>
      {payload.races.map((race) => (
        <section key={race.id} className="card" aria-labelledby={`live-race-${race.id}`}>
          <h3 id={`live-race-${race.id}`}>{raceTitle(race)}</h3>
          <RaceBody race={race} />
        </section>
      ))}
    </Shell>
  );
}
