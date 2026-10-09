/**
 * The race cards and council tiles of the Ward Ballot pages (#38; #17 § Results
 * pages and site changes, § On-night reader wording), as #7's prototype drew
 * them: each race's Live Tally as bars in the forecast pages' chart rows, the
 * mayor card's folded field, its ward's mayoral vote and the collapsed final
 * forecast, and one tile per ward. Never chance-to-win wording, and nothing
 * that compares the count with the forecast (#12).
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { ContentSection } from "@/components/content-section";
import { MarginOutcomes } from "@/components/forecast/margin-outcomes";
import { candidateMeta } from "@/lib/candidates";
import type { MarginOutcomesView } from "@/lib/mayoral-forecast";
import { TRUSTEE_BOARD_NAV } from "@/lib/trustees";
import type { ResultsWard } from "@/lib/results-wards";
import type { LiveCandidate, LiveMayoralWard, LiveProgress, LiveRace } from "@/types/live";

/** The counted mayoral field shows this many, then "N other candidates" (#7). */
const MAYOR_SHOWN = 4;
/** Each ward's mayoral line names this many. */
const WARD_VOTE_SHOWN = 3;
const NEUTRAL = "var(--color-disengaged)";

/** The race states' fixed reader wording (#17 § On-night reader wording). */
const WORDING = {
  before_results: "Results from 8 p.m.",
  no_units_in: "No voting areas have reported yet",
  all_units_in: "All voting areas in",
  no_progress: "Voting areas: not available",
} as const;

function progressText(progress: LiveProgress): string {
  return `${progress.received} of ${progress.total} voting areas in`;
}

export function raceTitle(race: LiveRace): string {
  if (race.level === "mayor") return "Mayor";
  if (race.level === "council") return race.name ? `Councillor, Ward ${race.num} ${race.name}` : `Councillor, Ward ${race.num}`;
  const board = TRUSTEE_BOARD_NAV.find(({ boardId }) => race.id.startsWith(`${boardId}-`));
  return `${board?.shortName ?? "Trustee"} Ward ${race.num}`;
}

/** The short label (#16): the registry last name, or the full Ballot Name. */
function shortLabel(candidate: LiveCandidate): string {
  return candidate.short_label ?? candidate.full_name;
}

/** Payload shares are already percent (0..100), unlike `formatSharePct`'s fractions. */
function percent(share: number | null): string {
  return share === null ? "–" : `${share.toFixed(1)}%`;
}

/** Whether the race shows its Live Tally: counting, or every voting area in. */
function hasTally(race: LiveRace): boolean {
  return race.state === "counting" || race.state === "all_units_in";
}

/** The thin Reporting Progress bar: the one piece with no CHW or site component. */
function ProgressLine({ progress }: { progress: LiveProgress }) {
  const fraction = progress.total > 0 ? Math.min(1, progress.received / progress.total) : 0;
  return (
    <p className="live-progress t-meta">
      <span className="live-progress__track" aria-hidden="true">
        <span className="live-progress__fill" style={{ width: `${fraction * 100}%` }} />
      </span>
      {progressText(progress)}
    </p>
  );
}

function Progress({ progress }: { progress: LiveProgress | null }) {
  return progress ? <ProgressLine progress={progress} /> : <Status>{WORDING.no_progress}</Status>;
}

function Status({ children }: { children: ReactNode }) {
  return <p className="t-body-small">{children}</p>;
}

interface TallyRow {
  key: string;
  name: string;
  /** The forecast pages' marker, on forecast-named mayoral rows only. */
  slug: string | null;
  color: string;
  votes: number | null;
  share: number | null;
}

function tallyRow(candidate: LiveCandidate): TallyRow {
  const meta = candidate.candidate_id ? candidateMeta(candidate.candidate_id) : null;
  return {
    key: candidate.key,
    name: candidate.full_name,
    slug: meta?.slug ?? null,
    color: meta?.colorVar ?? NEUTRAL,
    votes: candidate.votes,
    share: candidate.share,
  };
}

/** The race's rows: the mayor's counted field folds to its top four and one
 *  "N other candidates" row, unless that row would stand for a single name. */
function tallyRows(race: LiveRace): TallyRow[] {
  const rows = race.candidates.map(tallyRow);
  if (race.level !== "mayor" || rows.length <= MAYOR_SHOWN + 1) return rows;
  const rest = race.candidates.slice(MAYOR_SHOWN);
  const sum = (values: (number | null)[]) => values.reduce<number>((a, b) => a + (b ?? 0), 0);
  return [
    ...rows.slice(0, MAYOR_SHOWN),
    {
      key: "other-candidates",
      name: `${rest.length} other candidates`,
      slug: null,
      color: NEUTRAL,
      votes: sum(rest.map((c) => c.votes)),
      share: sum(rest.map((c) => c.share)),
    },
  ];
}

/** The Live Tally: the forecast pages' chart rows, a counted-share bar on a
 *  0–100% track. Phone widths put each name above its bar. */
function Tally({ race }: { race: LiveRace }) {
  return (
    <div className="forecast-chart live-tally" role="list" aria-label={`${raceTitle(race)} count`}>
      {tallyRows(race).map((row) => (
        <div className="forecast-chart__row" role="listitem" key={row.key}>
          <span className="forecast-chart__label">
            {row.slug && <span className={`candidate-marker candidate-marker--${row.slug}`} aria-hidden="true" />}
            <span className="live-tally__name">{row.name}</span>
          </span>
          <span className="forecast-chart__track" aria-hidden="true">
            <span className="forecast-chart__bar" style={{ width: `${row.share ?? 0}%`, background: row.color }} />
          </span>
          <span className="live-tally__value">
            <strong className="forecast-chart__value">{percent(row.share)}</strong>
            <span className="t-meta">{row.votes === null ? "–" : `${row.votes.toLocaleString("en-CA")} votes`}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function BallotOrder({ race }: { race: LiveRace }) {
  return <p className="t-body-small">{race.candidates.map((candidate) => candidate.full_name).join(" · ")}</p>;
}

function RaceBody({ race }: { race: LiveRace }) {
  switch (race.state) {
    case "before_results":
      return (
        <>
          <Status>{WORDING.before_results}</Status>
          <BallotOrder race={race} />
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
      return (
        <>
          <Status>{WORDING.no_units_in}</Status>
          <BallotOrder race={race} />
        </>
      );
    case "counting":
    case "all_units_in":
      return (
        <>
          {race.state === "all_units_in" ? <Status>{WORDING.all_units_in}</Status> : <Progress progress={race.progress} />}
          <Tally race={race} />
        </>
      );
  }
}

/** The ward's mayoral vote from the ward-by-ward file: its top three by votes,
 *  each as a share of the ward's counted votes. */
function WardVote({ race, ward }: { race: LiveRace; ward: LiveMayoralWard }) {
  if (ward.votes === null) return null;
  const entries = Object.entries(ward.votes);
  const total = ward.votes_counted ?? entries.reduce((sum, [, votes]) => sum + votes, 0);
  const top = [...entries].sort((a, b) => b[1] - a[1]).slice(0, WARD_VOTE_SHOWN);
  return (
    <div className="live-ward-vote">
      <p className="t-body-small">
        <strong>Mayoral vote in Ward {ward.num}</strong>
      </p>
      <Progress progress={ward.progress} />
      <p className="t-body-small">
        {top.map(([key, votes], i) => {
          const candidate = race.candidates.find((c) => c.key === key);
          const slug = candidate?.candidate_id ? candidateMeta(candidate.candidate_id).slug : null;
          return (
            <span key={key}>
              {i > 0 && " · "}
              {slug && <span className={`candidate-marker candidate-marker--${slug}`} aria-hidden="true" />}
              {`${candidate ? shortLabel(candidate) : key} ${total > 0 ? percent((votes / total) * 100) : "–"}`}
            </span>
          );
        })}
      </p>
    </div>
  );
}

/** The final Mayoral Forecast, collapsed and kept apart from the count (#7, #12):
 *  the forecast pages' own margin outcomes, with their own labels (#16). */
function FinalForecast({ forecast }: { forecast: MarginOutcomesView }) {
  return (
    <div className="faq">
      <details className="live-forecast">
        <summary>The final pre-election forecast</summary>
        <div className="faq__a">
          <p className="t-body-small">
            How far apart {forecast.leader.surname} and {forecast.challenger.surname} were expected to finish:
          </p>
          <MarginOutcomes view={forecast} />
          <p className="forecast-caption">
            The final pre-election forecast, kept for reference. It is not the count and not the projection.
          </p>
        </div>
      </details>
    </div>
  );
}

export function RaceCard({
  race,
  ward = null,
  forecast = null,
}: {
  race: LiveRace;
  /** The page's ward, for the mayor card's ward vote. */
  ward?: string | null;
  /** The mayor card's forecast panel; hidden once the count is complete. */
  forecast?: MarginOutcomesView | null;
}) {
  const wardVote = race.level === "mayor" && ward !== null && hasTally(race) ? race.wards?.find((w) => w.num === ward) : null;
  return (
    <section className="card" aria-labelledby={`live-race-${race.id}`}>
      <h3 id={`live-race-${race.id}`}>{raceTitle(race)}</h3>
      <RaceBody race={race} />
      {wardVote && <WardVote race={race} ward={wardVote} />}
      {race.level === "mayor" && forecast && race.state !== "all_units_in" && <FinalForecast forecast={forecast} />}
    </section>
  );
}

/** Viamonde and MonAvenir, folded behind one disclosure (#7). */
export function FrenchBoards({ races }: { races: LiveRace[] }) {
  if (races.length === 0) return null;
  return (
    <div className="faq">
      <details className="live-french">
        <summary>Voting for a French-language board?</summary>
        <div className="faq__a grid">
          {races.map((race) => (
            <RaceCard key={race.id} race={race} />
          ))}
        </div>
      </details>
    </div>
  );
}

/** One line of a council tile: the race's state in a few words. */
function tileStatus(race: LiveRace): string {
  switch (race.state) {
    case "before_results":
    case "no_units_in":
    case "all_units_in":
      return WORDING[race.state];
    case "acclaimed":
      return "Acclaimed";
    case "no_figures":
      return "No figures from the City right now";
    case "counting":
      return race.progress ? progressText(race.progress) : WORDING.no_progress;
  }
}

function TileBody({ race }: { race: LiveRace }) {
  if (!hasTally(race)) return <p className="t-meta">{tileStatus(race)}</p>;
  const leader = race.candidates[0];
  return (
    <>
      {leader && leader.share !== null && (
        <p className="t-body-small live-tile__leader">{`${shortLabel(leader)} ${percent(leader.share)}`}</p>
      )}
      {race.state === "counting" && race.progress ? <ProgressLine progress={race.progress} /> : <p className="t-meta">{tileStatus(race)}</p>}
      {/* The top two candidates' ranges go here (#45). */}
      <p className="live-tile__ranges" data-ranges="" />
    </>
  );
}

/** "Council across the city": a link per ward, in the /wards index's cards. A
 *  tap opens that ward from the payload already held; it never changes the
 *  remembered ward. */
export function CouncilTiles({ wards, races }: { wards: ResultsWard[]; races: LiveRace[] }) {
  return (
    <ContentSection aria-labelledby="results-council-heading">
      <h2 id="results-council-heading">Council across the city</h2>
      <ul className="race-index-list ward-index-grid live-tiles">
        {wards.map((w) => {
          const race = races.find((r) => r.id === `councillor-${w.num}`);
          return (
            <li key={w.num}>
              <Link href={`/results/${w.num}`} className="race-index-card ward-index-card">
                <h3 className="race-index-card__heading ward-index-card__name">
                  Ward {w.num}
                  {w.name && (
                    <>
                      {" · "}
                      <span>{w.name}</span>
                    </>
                  )}
                </h3>
                {race && <TileBody race={race} />}
              </Link>
            </li>
          );
        })}
      </ul>
    </ContentSection>
  );
}
