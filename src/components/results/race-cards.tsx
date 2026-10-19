"use client";

/**
 * The race cards and council tiles of the Ward Ballot pages (#38; #17 § Results
 * pages and site changes, § On-night reader wording), as #7's prototype drew
 * them: each race's Live Tally as bars in the forecast pages' chart rows, the
 * mayor card's folded field, its ward's mayoral vote and the collapsed final
 * forecast, and one tile per ward. Never chance-to-win wording, and nothing
 * that compares the count with the forecast (#12).
 */

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { ContentSection } from "@/components/content-section";
import { candidateMeta } from "@/lib/candidates";
import { chowCandidate, countedWardsBenchmark } from "@/lib/chow-2023";
import { liveColour } from "@/lib/live-colour";
import { eliminatedKeys } from "@/lib/live-eliminated";
import { rangeText, shareText, votesTotal } from "@/lib/live-share";
import { TRUSTEE_BOARD_NAV } from "@/lib/trustees";
import type { ResultsWard } from "@/lib/results-wards";
import { shortLabel } from "@/lib/live-labels";
import type {
  LiveBand,
  LiveCandidate,
  LiveMayoralWard,
  LivePayload,
  LiveProgress,
  LiveRace,
  LiveRange,
  ProjectionStatus,
} from "@/types/live";

type Levels = LivePayload["levels"];

/** The counted mayoral field shows this many, then "N other candidates", which expands to
 *  everyone (#7). Two since Alexander's exit (2026-10-11): the count's top two, not named. */
const MAYOR_SHOWN = 2;
/** Each ward's mayoral line names this many. */
const WARD_VOTE_SHOWN = 2;
const NEUTRAL = "var(--color-disengaged)";

/** The race states' fixed reader wording (#17 § On-night reader wording). */
export const WORDING = {
  acclaimed: "Acclaimed",
  acclaimedNote: "The only candidate, so there is no vote.",
  before_results: "Results from 8 p.m.",
  no_units_in: "No voting areas have reported yet",
  all_units_in: "All voting areas in",
  no_progress: "Voting areas: not available",
  withdrawn: "No projection for this race right now. The count is as the City reports it.",
  elected: "Elected (unofficial)",
  /** Cannot win even with every outstanding vote (#90, live-projection ADR 0003), as one
   *  break above those candidates (#105). */
  eliminated: "Can’t realistically win",
  eliminatedWhy: "can’t win even with every vote likely still out",
  /** The tally's key (#105). */
  keyCounted: "Counted",
  keyEstimated: "Estimated final range",
  keyPossible: "Possible range",
} as const;

/** Each level's name in the gate wording (#17 § On-night reader wording, DRAFT for #54). */
const LEVEL_WORDS: Record<"mayor" | "council" | "trustee", string> = {
  mayor: "the mayor's race",
  council: "council races",
  trustee: "school board trustee races",
};

/** The ranges' legends, the mayor's record (ADR 0002) and the French-language boards' note,
 *  as Alex approved them (#54, #97). */
const RANGE_WORDING = {
  estimated: "Estimated: where the final share lands in 9 of 10 simulated finishes.",
  possible: "Possible: from none to all of the votes likely still to be counted.",
  mayorRecord:
    "In replays of past election nights, this estimate did very well in the 2014, 2018 and 2022 elections, and worse than expected in the 2023 by-election, when the early vote broke very differently from election day.",
  recordSummary: "How accurate is this estimate?",
  french: "Count and possible range only: no estimate for these boards.",
  frenchLabel: "French-language school boards",
} as const;

/** Chow's counted-wards benchmark (#109, option B as Alex chose it): a short line, with what it
 *  is and its limit behind a disclosure. */
const BENCHMARK_WORDING = {
  summary: "About this comparison",
  label: "Compared with 2023",
  explain: (name: string) =>
    `${name}’s share of the vote in the 2023 by-election, across the wards counted so far tonight (each weighted by its votes counted), beside her share citywide. Early returns from her weakest wards can look like an upset; this shows how those wards voted last time. It allows for which wards are in, not which voting areas within them, and is not an estimate of tonight’s result.`,
} as const;

/** Whether a level shows the count in place of its projection: its gate failed, or the
 *  projection is paused (a version mismatch, a missing Gate Result, or a switch, #49). */
function showsCountOnly(status: ProjectionStatus | null): boolean {
  return (
    status === "gate_failed" ||
    status === "version_mismatch" ||
    status === "gate_missing" ||
    status === "switched_off"
  );
}

function gateNote(level: "mayor" | "council" | "trustee", status: ProjectionStatus): string | null {
  if (!showsCountOnly(status)) return null;
  const words = LEVEL_WORDS[level];
  if (status === "gate_failed") {
    return `No projection for ${words} tonight. In replays of past election nights it did not beat simply reading the count, so this page shows the count as the City reports it.`;
  }
  return `Projection paused for ${words}. The count below is as the City reports it.`;
}

/** A level's projection status from the payload, or null when there is no payload level. */
function levelStatus(levels: Levels | null, level: LiveRace["level"]): ProjectionStatus | null {
  if (!levels || level === "french_trustee") return null;
  return levels[level].projection;
}

/** The race's Estimated Range per candidate: the band the payload says to draw, if any. */
function estimated(race: LiveRace): Record<string, LiveBand> | null {
  const shown = race.projection?.shown;
  return shown ? (race.projection!.bands[shown] ?? null) : null;
}

function progressText(progress: LiveProgress): string {
  return `${progress.received} of ${progress.total} voting areas in`;
}

export function raceTitle(race: LiveRace): string {
  if (race.level === "mayor") return "Mayor";
  if (race.level === "council") return race.name ? `Councillor, Ward ${race.num} ${race.name}` : `Councillor, Ward ${race.num}`;
  const board = TRUSTEE_BOARD_NAV.find(({ boardId }) => race.id.startsWith(`${boardId}-`));
  return `${board?.shortName ?? "Trustee"} Ward ${race.num}`;
}


/** Payload shares are already percent (0..100), unlike `formatSharePct`'s fractions; never
 *  "0.0%" (`shareText`). */
function percent(share: number | null, votes?: number | null): string {
  return shareText(share, votes);
}

/** The one winner wording (#17): at Night Close only, in a race with every voting area in,
 *  the leader's key, if they lead outright (#51). Candidates come by votes, descending. */
function electedKey(race: LiveRace, closed: boolean): string | null {
  if (!closed || race.state !== "all_units_in") return null;
  const [first, second] = race.candidates;
  if (!first || first.votes === null) return null;
  if (second && (second.votes === null || second.votes >= first.votes)) return null;
  return first.key;
}

/** An acclaimed race (#117): `acclaimed` once results begin, and before them a race whose bundle
 *  lists one candidate, which the payload marks `before_results` like every race (docs/payload.md). */
function isAcclaimed(race: LiveRace): boolean {
  return race.state === "acclaimed" || (race.state === "before_results" && race.candidates.length === 1);
}

/** Before 8 p.m. or before the race's first voting area: its tally waits, empty (#115). */
function waiting(race: LiveRace): boolean {
  return race.state === "before_results" || race.state === "no_units_in";
}

/** The race's candidates in tally order. While it waits, the forecast's named candidates (the
 *  mayor's leader and challenger, by forecast id) come first, so the folded mayor shows them;
 *  otherwise the payload's order (by votes once counting, ballot order before). */
function tallyOrder(race: LiveRace): LiveCandidate[] {
  if (!waiting(race)) return race.candidates;
  return [...race.candidates.filter((c) => c.candidate_id), ...race.candidates.filter((c) => !c.candidate_id)];
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
  elected: boolean;
  eliminated: boolean;
  /** The Estimated and Possible Ranges; null on the folded row and where none shows. */
  band: LiveBand | null;
  possible: LiveRange | null;
  name: string;
  /** The forecast pages' marker, on forecast-named mayoral rows only. */
  slug: string | null;
  /** Before any vote (#115): an empty row, its share a dash and no line under the name. */
  waiting: boolean;
  color: string;
  votes: number | null;
  share: number | null;
}

function tallyRow(
  candidate: LiveCandidate,
  race: LiveRace,
  elected: string | null,
  eliminated: Set<string>,
): TallyRow {
  const meta = candidate.candidate_id ? candidateMeta(candidate.candidate_id) : null;
  return {
    key: candidate.key,
    elected: candidate.key === elected,
    eliminated: eliminated.has(candidate.key),
    band: estimated(race)?.[candidate.key] ?? null,
    possible: race.possible?.[candidate.key] ?? null,
    name: candidate.full_name,
    slug: meta?.slug ?? null,
    waiting: waiting(race),
    color: liveColour(candidate, NEUTRAL),
    votes: candidate.votes,
    share: candidate.share,
  };
}

/** Whether the race's counted field folds: the mayor's, unless the folded row would stand for
 *  a single name. */
function folds(race: LiveRace): boolean {
  return race.level === "mayor" && race.candidates.length > MAYOR_SHOWN + 1;
}

/** The race's rows: the mayor's counted field folds to its top four and one
 *  "N other candidates" row, unless that row would stand for a single name. The folded row
 *  counts as eliminated when everyone in it is (#105). */
function tallyRows(race: LiveRace, closed: boolean, expanded = false): TallyRow[] {
  const elected = electedKey(race, closed);
  const eliminated = eliminatedKeys(race.possible);
  const candidates = tallyOrder(race);
  const rows = candidates.map((candidate) => tallyRow(candidate, race, elected, eliminated));
  if (expanded || !folds(race)) return rows;
  const rest = candidates.slice(MAYOR_SHOWN);
  const sum = (values: (number | null)[]) => values.reduce<number>((a, b) => a + (b ?? 0), 0);
  return [
    ...rows.slice(0, MAYOR_SHOWN),
    {
      key: "other-candidates",
      elected: false,
      eliminated: rest.every((c) => eliminated.has(c.key)),
      band: null,
      possible: null,
      name: `${rest.length} other candidates`,
      slug: null,
      waiting: waiting(race),
      color: NEUTRAL,
      votes: sum(rest.map((c) => c.votes)),
      share: sum(rest.map((c) => c.share)),
    },
  ];
}

/** "Estimated final 42–47% · possible 30–60%", or whichever of the two shows. */
function rangeLine(row: TallyRow): string {
  const parts = [];
  if (row.band) parts.push(`Estimated final ${rangeText(row.band.low, row.band.high)}`);
  if (row.possible) parts.push(`${row.band ? "possible" : "Possible"} ${rangeText(row.possible.low, row.possible.high)}`);
  return parts.join(" · ");
}

/** Under a counting race's tally: the ranges' legend, the mayor's record while its Estimated
 *  Range is on screen (ADR 0002, #54), and why a level shows the count: its gate, or else a
 *  Withdrawal (#43), whose machine reason readers never see. A French-language board has no
 *  projection, so only its Possible Range's legend (#97). */
function RangeNotes({ race, levels }: { race: LiveRace; levels: Levels | null }) {
  if (race.state !== "counting") return null;
  const bands = estimated(race);
  const level = race.level === "french_trustee" ? null : race.level;
  const status = level ? levelStatus(levels, level) : null;
  const note = (level && status ? gateNote(level, status) : null) ?? (race.withdrawal ? WORDING.withdrawn : null);
  return (
    <>
      {note && <Status>{note}</Status>}
      {(bands || race.possible) && (
        <p className="forecast-caption">
          {bands && <>{RANGE_WORDING.estimated} </>}
          {race.possible && RANGE_WORDING.possible}
        </p>
      )}
    </>
  );
}

/** The mayor's record while its Estimated Range is on screen (ADR 0002, #54): it describes the
 *  estimate, so it shows only beside one. Kept with the card's other disclosures (#118). */
function hasRecord(race: LiveRace, levels: Levels | null): boolean {
  return race.state === "counting" && race.level === "mayor" && levels?.mayor.approved === true && estimated(race) !== null;
}

function MayorRecord() {
  return (
    <div className="faq">
      <details className="live-record">
        <summary>{RANGE_WORDING.recordSummary}</summary>
        <div className="faq__a">
          <p className="forecast-caption">{RANGE_WORDING.mayorRecord}</p>
        </div>
      </details>
    </div>
  );
}

/** A share as a position on the 0–100% track. */
function span(low: number, high: number) {
  return { left: `${low}%`, width: `${Math.max(high - low, 0)}%` };
}

/** A row's one quiet line (#105): its votes and Estimated Range. The
 *  Possible Range's figures go to screen readers only; its whisker shows it. */
function rowMeta(row: TallyRow): string[] {
  if (row.waiting) return [];
  const parts = [row.votes === null ? "–" : `${row.votes.toLocaleString("en-CA")} ${row.votes === 1 ? "vote" : "votes"}`];
  if (row.band && !row.eliminated) parts.push(`Estimated final ${rangeText(row.band.low, row.band.high)}`);
  return parts;
}

function TallyRowView({ row }: { row: TallyRow }) {
  return (
    <div className={`forecast-chart__row${row.eliminated ? " forecast-chart__row--out" : ""}`} role="listitem">
      <span className="forecast-chart__label">
        {row.slug && <span className={`candidate-marker candidate-marker--${row.slug}`} aria-hidden="true" />}
        <span className="live-tally__name">{row.name}</span>
        {row.elected && <span className="badge badge--status">{WORDING.elected}</span>}
        {(row.band || row.possible) && <span className="visually-hidden">{rangeLine(row)}</span>}
      </span>
      <span className="forecast-chart__track" aria-hidden="true">
        {row.possible && <span className="live-tally__possible" style={span(row.possible.low, row.possible.high)} />}
        <span className="forecast-chart__bar" style={{ width: `${row.share ?? 0}%`, background: row.color }} />
        {row.band && (
          <span className="live-tally__estimate" style={span(row.band.low, row.band.high)}>
            <span
              className="live-tally__mid"
              style={{ left: `${row.band.high > row.band.low ? ((row.band.mid - row.band.low) / (row.band.high - row.band.low)) * 100 : 50}%` }}
            />
          </span>
        )}
      </span>
      <strong className="forecast-chart__value live-tally__value">{row.waiting ? "–" : percent(row.share, row.votes)}</strong>
      <span className="live-tally__meta">
        {/* Each figure wraps whole, never a label on one line and its figure on the next. */}
        {rowMeta(row).map((part, i) => (
          <span key={part}>
            {i > 0 && " · "}
            <span className="live-tally__fig">{part}</span>
          </span>
        ))}
      </span>
    </div>
  );
}

/** The tally's key: only the marks this race draws. */
function TallyKey({ rows }: { rows: TallyRow[] }) {
  const has = (pick: (row: TallyRow) => unknown) => rows.some(pick);
  if (!has((r) => r.band || r.possible)) return null;
  return (
    <p className="live-tally__key" aria-hidden="true">
      <span><i className="live-tally__glyph live-tally__glyph--counted" />{WORDING.keyCounted}</span>
      {has((r) => r.band) && <span><i className="live-tally__glyph live-tally__glyph--estimate" />{WORDING.keyEstimated}</span>}
      {has((r) => r.possible) && <span><i className="live-tally__glyph live-tally__glyph--possible" />{WORDING.keyPossible}</span>}
    </p>
  );
}

/** The Live Tally (#105): the forecast pages' chart rows, each a counted-share bar on a 0–100%
 *  track with the Estimated Range as an outlined bracket and the Possible Range as a whisker
 *  (Certain win's dashed tick removed, #119). Candidates who cannot win sit under one
 *  break, greyed. Phone widths put each name above its bar. */
function Tally({ race, closed, legend = null }: { race: LiveRace; closed: boolean; legend?: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const rows = tallyRows(race, closed, expanded);
  const inIt = rows.filter((row) => !row.eliminated);
  const out = rows.filter((row) => row.eliminated);
  return (
    <>
      <TallyKey rows={rows} />
      <div className="forecast-chart live-tally" role="list" id={listId} aria-label={`${raceTitle(race)} count`}>
        {inIt.map((row) => <TallyRowView key={row.key} row={row} />)}
        {out.length > 0 && (
          <p className="live-tally__break" role="listitem">
            <strong>{WORDING.eliminated}</strong>
            <span className="live-tally__sep" aria-hidden="true"> · </span>
            <span className="live-tally__why">{WORDING.eliminatedWhy}</span>
          </p>
        )}
        {out.map((row) => <TallyRowView key={row.key} row={row} />)}
        {(race.possible || estimated(race)) && (
          <div className="forecast-chart__axis live-tally__axis" aria-hidden="true">
            <span />
            <span className="forecast-chart__axis-track"><span>0</span><span>25</span><span>50</span><span>75</span><span>100%</span></span>
            <span />
          </div>
        )}
      </div>
      {/* The reading aids sit under the axis they explain (#118). */}
      {legend}
      {folds(race) && (
        <button
          type="button"
          className="btn btn--ghost btn--sm live-tally__more"
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={(event) => {
            const button = event.currentTarget;
            setExpanded(!expanded);
            // Folding a long field back would leave the reader far below the card.
            if (expanded) requestAnimationFrame(() => button.scrollIntoView?.({ block: "nearest" }));
          }}
        >
          <span className="live-tally__chevron" aria-hidden="true">{expanded ? "⌃" : "⌄"}</span>
          {expanded ? "Show fewer" : `Show all ${race.candidates.length} candidates`}
        </button>
      )}
    </>
  );
}

/** The bundle lists exactly one candidate for an acclaimed race (docs/payload.md). Shown as that
 *  candidate with a quiet badge on an outlined card (#117), never "Elected". */
function Acclaimed({ race }: { race: LiveRace }) {
  return (
    <>
      <p className="live-acclaimed__row">
        <span className="live-acclaimed__name">{race.candidates[0]?.full_name}</span>{" "}
        <span className="badge badge--acclaimed">{WORDING.acclaimed}</span>
      </p>
      <p className="t-body-small live-acclaimed__note">{WORDING.acclaimedNote}</p>
    </>
  );
}

function RaceBody({ race, levels, closed }: { race: LiveRace; levels: Levels | null; closed: boolean }) {
  if (isAcclaimed(race)) return <Acclaimed race={race} />;
  switch (race.state) {
    // The page says "Results from 8 p.m." once (#115); the card shows the tally it will fill.
    case "before_results":
      return <Tally race={race} closed={closed} />;
    case "acclaimed":
      return <Acclaimed race={race} />;
    case "no_figures":
      return <Status>No figures from the City for this race right now</Status>;
    case "no_units_in":
      return (
        <>
          {race.progress && <ProgressLine progress={race.progress} />}
          <Tally race={race} closed={closed} />
        </>
      );
    case "counting":
    case "all_units_in":
      return (
        <>
          {race.state === "all_units_in" ? <Status>{WORDING.all_units_in}</Status> : <Progress progress={race.progress} />}
          <Tally race={race} closed={closed} legend={<RangeNotes race={race} levels={levels} />} />
          {/* A benchmark for reading early returns: gone once Night Close declares the count final (Alex). */}
          {race.level === "mayor" && !closed && <ChowBenchmark race={race} />}
        </>
      );
  }
}

/** The ward's mayoral vote from the ward-by-ward file: its top three by votes,
 *  each as a share of the ward's counted votes. */
function WardVote({ race, ward }: { race: LiveRace; ward: LiveMayoralWard }) {
  if (ward.votes === null) return null;
  const entries = Object.entries(ward.votes);
  const total = ward.votes_counted ?? votesTotal(ward.votes);
  const top = [...entries].sort((a, b) => b[1] - a[1]).slice(0, WARD_VOTE_SHOWN);
  return (
    <div className="live-ward-vote live-subsection">
      <p className="kicker">Mayoral vote in Ward {ward.num}</p>
      <Progress progress={ward.progress} />
      <p className="t-body-small">
        {top.map(([key, votes], i) => {
          const candidate = race.candidates.find((c) => c.key === key);
          const slug = candidate?.candidate_id ? candidateMeta(candidate.candidate_id).slug : null;
          const colour = slug === null || slug === "disengaged" ? liveColour(candidate, "") : "";
          return (
            <span key={key}>
              {i > 0 && " · "}
              {slug && slug !== "disengaged" && (
                <span className={`candidate-marker candidate-marker--${slug}`} aria-hidden="true" />
              )}
              {colour && (
                <span className="candidate-marker" style={{ background: colour, borderRadius: "50%" }} aria-hidden="true" />
              )}
              {`${candidate ? shortLabel(candidate) : key} ${total > 0 ? percent((votes / total) * 100, votes) : "–"}`}
            </span>
          );
        })}
      </p>
    </div>
  );
}

/** Chow's 2023 share in the wards counted so far, against her 2023 citywide share (#109): early
 *  returns from her weakest wards can read like an upset. Facts of two counts, never an estimate. */
function ChowBenchmark({ race }: { race: LiveRace }) {
  const benchmark = countedWardsBenchmark(race);
  const chow = chowCandidate(race);
  if (!benchmark || !chow) return null;
  const name = shortLabel(chow);
  return (
    <div className="live-subsection">
      <p className="kicker">{BENCHMARK_WORDING.label}</p>
      <p className="t-body-small live-benchmark">
        {/* A sentence, so it reads right wherever it wraps on a phone (Alex). */}
        In 2023, {name} won {shareText(benchmark.counted2023)} in the wards counted so far, and{" "}
        {shareText(benchmark.citywide2023)} citywide.
      </p>
      <details className="live-benchmark-why">
        <summary>{BENCHMARK_WORDING.summary}</summary>
        <p className="forecast-caption">{BENCHMARK_WORDING.explain(name)}</p>
      </details>
    </div>
  );
}

/** The final Mayoral Forecast, collapsed and kept apart from the count (#7, #12): a pointer
 *  to the home page's forecast only, so none of its outcomes sits beside the count (#17's
 *  "Not shown anywhere", #54). */
function FinalForecast() {
  return (
    <div className="faq">
      <details className="live-forecast">
        <summary>The final pre-election forecast</summary>
        <div className="faq__a">
          <p className="t-body-small">
            The forecast published before election day is on the <Link href="/">home page</Link>.
          </p>
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
  levels = null,
  ward = null,
  forecast = false,
  closed = false,
}: {
  race: LiveRace;
  /** The payload's level statuses, for the gate notes and the mayor's record (#45). */
  levels?: Levels | null;
  /** The page's ward, for the mayor card's ward vote. */
  ward?: string | null;
  /** The mayor card's forecast panel; hidden once the count is complete. */
  forecast?: boolean;
  /** Night Close is declared (#51). */
  closed?: boolean;
}) {
  const wardVote = race.level === "mayor" && ward !== null && hasTally(race) ? race.wards?.find((w) => w.num === ward) : null;
  const record = hasRecord(race, levels);
  const finalForecast = race.level === "mayor" && forecast && !closed && race.state !== "all_units_in";
  return (
    <section className={isAcclaimed(race) ? "card live-acclaimed" : "card"} aria-labelledby={`live-race-${race.id}`}>
      <h3 id={`live-race-${race.id}`}>{raceTitle(race)}</h3>
      <RaceBody race={race} levels={levels} closed={closed} />
      {wardVote && <WardVote race={race} ward={wardVote} />}
      {/* The card's background disclosures, together at the bottom (#118). */}
      {(record || finalForecast) && (
        <div className="live-card-more">
          {record && <MayorRecord />}
          {finalForecast && <FinalForecast />}
        </div>
      )}
    </section>
  );
}

/** Viamonde and MonAvenir, in the ballot's card list after TDSB and TCDSB under one label and
 *  note (#116): there is always real information for them, so nothing folds them away. */
export function FrenchBoards({ races, closed = false }: { races: LiveRace[]; closed?: boolean }) {
  if (races.length === 0) return null;
  return (
    <>
      <div className="live-boards-head">
        <p className="kicker">{RANGE_WORDING.frenchLabel}</p>
        <p className="t-body-small">{RANGE_WORDING.french}</p>
      </div>
      {races.map((race) => (
        <RaceCard key={race.id} race={race} closed={closed} />
      ))}
    </>
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
      return WORDING.acclaimed;
    case "no_figures":
      return "No figures from the City right now";
    case "counting":
      return race.progress ? progressText(race.progress) : WORDING.no_progress;
  }
}

/** A council tile's range line: its top two candidates' Estimated Ranges, or "Count only"
 *  while council shows the count (#17 § On-night reader wording). */
function tileRanges(race: LiveRace, levels: Levels | null): string | null {
  if (race.state !== "counting") return null;
  if (showsCountOnly(levelStatus(levels, race.level))) return "Count only";
  const bands = estimated(race);
  if (!bands) return null;
  return race.candidates
    .slice(0, 2)
    .flatMap((c) => (bands[c.key] ? [`${shortLabel(c)} ${rangeText(bands[c.key].low, bands[c.key].high)}`] : []))
    .join(" · ");
}

function TileBody({ race, levels, closed }: { race: LiveRace; levels: Levels | null; closed: boolean }) {
  // The page says the state once (#115): before results the tile is the ward alone, and before
  // its first voting area an empty progress line.
  if (race.state === "before_results") return null;
  if (race.state === "no_units_in") return race.progress ? <ProgressLine progress={race.progress} /> : null;
  if (!hasTally(race)) return <p className="t-meta">{tileStatus(race)}</p>;
  const leader = race.candidates[0];
  const elected = electedKey(race, closed) !== null;
  return (
    <>
      {/* A null share hides the share, never the label. */}
      {leader && (leader.share !== null || elected) && (
        <p className="t-body-small live-tile__leader">
          {[
            leader.share === null ? shortLabel(leader) : `${shortLabel(leader)} ${percent(leader.share)}`,
            ...(elected ? [WORDING.elected] : []),
          ].join(" · ")}
        </p>
      )}
      {race.state === "counting" && race.progress ? <ProgressLine progress={race.progress} /> : <p className="t-meta">{tileStatus(race)}</p>}
      <p className="t-meta live-tile__ranges" data-ranges="">
        {tileRanges(race, levels)}
      </p>
    </>
  );
}

/** "Council across the city": a link per ward, in the /wards index's cards. A
 *  tap opens that ward from the payload already held; it never changes the
 *  remembered ward. */
export function CouncilTiles({
  wards,
  races,
  levels = null,
  closed = false,
}: {
  wards: ResultsWard[];
  races: LiveRace[];
  levels?: Levels | null;
  /** Night Close is declared (#51). */
  closed?: boolean;
}) {
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
                {race && <TileBody race={race} levels={levels} closed={closed} />}
              </Link>
            </li>
          );
        })}
      </ul>
    </ContentSection>
  );
}
