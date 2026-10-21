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
import { candidateMeta } from "@/lib/candidates";
import { liveColour } from "@/lib/live-colour";
import { leaderParts, segmentWidth } from "@/lib/mayor-bar";
import { eliminatedKeys } from "@/lib/live-eliminated";
import { rangeText, shareText } from "@/lib/live-share";
import { TRUSTEE_BOARD_NAV } from "@/lib/trustees";
import { shortLabel } from "@/lib/live-labels";
import { AboutTurnout, TurnoutBar } from "./turnout-bar";
import { lastElection, type LastElection } from "@/lib/council-incumbents";
import type {
  LiveBand,
  LiveCandidate,
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
/** The folded row's key: "N other candidates". */
const FOLDED = "other-candidates";
/** Each ward's mayoral line names this many. */
const NEUTRAL = "var(--color-disengaged)";

/** The race states' fixed reader wording (#17 § On-night reader wording). */
export const WORDING = {
  citywide: "Citywide",
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
  eliminated: "Mathematically eliminated",
  eliminatedWhy: "can’t win even with every vote still out",
  /** The tally's key (#105). */
  keyCounted: "Counted",
  /** The key carries the ranges' definitions, once per card (results audit, 2026-10-20). */
  keyEstimated: "Estimated final range: where 99 in 100 simulated finishes land",
  keyPossible: "Out of reach, even with all of the votes still to count",
} as const;

/** Each level's name in the gate wording (#17 § On-night reader wording, DRAFT for #54). */
const LEVEL_WORDS: Record<"mayor" | "council" | "trustee", string> = {
  mayor: "the mayor's race",
  council: "council races",
  trustee: "school board trustee races",
};

/** The ranges' legends, the mayor's record (ADR 0002) and the French-language boards' note,
 *  as Alex approved them (#54, #97). */
export const RANGE_WORDING = {
  mayorRecord:
    "In replays of past election nights, this estimate did very well in the 2014, 2018 and 2022 elections, and worse than expected in the 2023 by-election, when the early vote broke very differently from election day.",
  recordSummary: "How accurate is this estimate?",
  french: "Count and possible range only: no estimate for these boards.",
  frenchLabel: "French-language school boards",
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

/** Whether a counting race shows its count only, its level's projection off (#17 § On-night
 *  reader wording). */
export function countOnly(race: LiveRace, levels: Levels | null): boolean {
  return showsCountOnly(levelStatus(levels, race.level));
}

/** The race's Estimated Range per candidate: the band the payload says to draw, if any. */
export function estimated(race: LiveRace): Record<string, LiveBand> | null {
  const shown = race.projection?.shown;
  return shown ? (race.projection!.bands[shown] ?? null) : null;
}

function progressText(progress: LiveProgress): string {
  return `${progress.received.toLocaleString("en-CA")} of ${progress.total.toLocaleString("en-CA")} voting areas in`;
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
export function electedKey(race: LiveRace, closed: boolean): string | null {
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

/** The thin Reporting Progress bar: the one piece with no CHW or site component. */
function ProgressLine({ progress, label = null }: { progress: LiveProgress; label?: string | null }) {
  const fraction = progress.total > 0 ? Math.min(1, progress.received / progress.total) : 0;
  return (
    <p className="live-progress t-meta">
      {label && <span className="live-progress__label">{label}</span>}
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
  /** An incumbent councillor's share in the ward's last election, and the key's label for it. */
  last: (LastElection & { label: string }) | null;
  color: string;
  votes: number | null;
  share: number | null;
}

function lastOf(race: LiveRace, candidate: LiveCandidate): TallyRow["last"] {
  const last = lastElection(race, candidate);
  return last && { ...last, label: `${shortLabel(candidate)} ${last.when}` };
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
    last: lastOf(race, candidate),
    color: liveColour(candidate, NEUTRAL),
    votes: candidate.votes,
    share: candidate.share,
  };
}

/** A race's result view shows every candidate up to this many, and folds a bigger field (Alex). */
const RESULT_SHOWS_ALL = 5;

/** Whether the race's counted field folds: the mayor's, unless the folded row would stand for
 *  a single name. */
function folds(race: LiveRace): boolean {
  return race.level === "mayor" && race.candidates.length > MAYOR_SHOWN + 1;
}

/** The race's rows: the mayor's counted field folds to its top four and one
 *  "N other candidates" row, unless that row would stand for a single name. The folded row
 *  counts as eliminated when everyone in it is (#105). */
function tallyRows(
  race: LiveRace,
  closed: boolean,
  expanded = false,
  folded: boolean = folds(race),
): TallyRow[] {
  const elected = electedKey(race, closed);
  const eliminated = eliminatedKeys(race.possible);
  const candidates = tallyOrder(race);
  const rows = candidates.map((candidate) => tallyRow(candidate, race, elected, eliminated));
  if (expanded || !folded) return rows;
  const rest = candidates.slice(MAYOR_SHOWN);
  const sum = (values: (number | null)[]) => values.reduce<number>((a, b) => a + (b ?? 0), 0);
  return [
    ...rows.slice(0, MAYOR_SHOWN),
    {
      key: FOLDED,
      elected: false,
      eliminated: rest.every((c) => eliminated.has(c.key)),
      band: null,
      possible: null,
      name: `${rest.length} other candidates`,
      slug: null,
      waiting: waiting(race),
      last: null,
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
/** Why a counting race shows no Estimated Range, if a gate or a withdrawal says so. The ranges'
 *  definitions are in the tally's key. */
function RangeNotes({ race, levels }: { race: LiveRace; levels: Levels | null }) {
  if (race.state !== "counting") return null;
  const level = race.level === "french_trustee" ? null : race.level;
  const status = level ? levelStatus(levels, level) : null;
  const note = (level && status ? gateNote(level, status) : null) ?? (race.withdrawal ? WORDING.withdrawn : null);
  return note ? <Status>{note}</Status> : null;
}

/** The mayor's record while its Estimated Range is on screen (ADR 0002, #54): it describes the
 *  estimate, so it shows only beside one. Kept with the card's other disclosures (#118). */
export function hasRecord(race: LiveRace, levels: Levels | null): boolean {
  return race.state === "counting" && race.level === "mayor" && levels?.mayor.approved === true && estimated(race) !== null;
}

export function MayorRecord() {
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

/** An out-of-reach zone on the 0–100% track, at 2 dp so the style stays stable. */
function reach(from: number, to: number) {
  return { left: from === 0 ? 0 : `${+from.toFixed(2)}%`, width: `${+(to - from).toFixed(2)}%` };
}

/** A share as a position on the 0–100% track. */
function span(low: number, high: number) {
  return { left: `${low}%`, width: `${Math.max(high - low, 0)}%` };
}

/** A row's one quiet line (#105): its votes and Estimated Range. The
 *  Possible Range's figures go to screen readers only; its whisker shows it. */
function rowMeta(row: TallyRow): string[] {
  const last = row.last ? [`${row.last.share.toFixed(1)}% ${row.last.when}`] : [];
  if (row.waiting) return last;
  const parts = [row.votes === null ? "–" : `${row.votes.toLocaleString("en-CA")} ${row.votes === 1 ? "vote" : "votes"}`];
  if (row.band && !row.eliminated) parts.push(`Estimated final ${rangeText(row.band.low, row.band.high)}`);
  return [...parts, ...last];
}

/** A result row's line when its votes are the topline: the share of the count, and an incumbent
 *  councillor's share last time. */
function votesFirstMeta(row: TallyRow): string[] {
  const last = row.last ? [`${row.last.share.toFixed(1)}% ${row.last.when}`] : [];
  // A missing figure is a dash on the topline, never "0", and no share line.
  return row.waiting || row.share === null ? last : [`${percent(row.share, row.votes)} of counted votes`, ...last];
}

/** A share as a percent of a track whose end is `top` percent, capped at the end. */
function scaled(share: number, top: number): number {
  return Math.min(100, (100 * share) / top);
}

/** A row's marks on its track: the counted bar, the Estimated Range's bracket, and the Possible
 *  Range as what it leaves out. A track that ends at `top` (the mayor's lead: the most anyone can
 *  still reach) needs no out-of-reach zone; its end says it. */
function TrackMarks({ row, top = 100, reachZones = true }: { row: TallyRow; top?: number; reachZones?: boolean }) {
  return (
    <>
      {/* The Possible Range as what it leaves out above: the track past its high, hatched as out of
          reach (Alex: the low zone, under the counted bar, is not drawn). */}
      {reachZones && row.possible && row.possible.high < 100 && (
        <span className="live-tally__reach live-tally__reach--high" style={reach(row.possible.high, 100)} />
      )}
      <span className="forecast-chart__bar" style={{ width: `${scaled(row.share ?? 0, top)}%`, background: row.color }} />
      {row.band && (
        <span className="live-tally__estimate" style={span(row.band.low, row.band.high)}>
          <span
            className="live-tally__mid"
            style={{ left: `${row.band.high > row.band.low ? ((row.band.mid - row.band.low) / (row.band.high - row.band.low)) * 100 : 50}%` }}
          />
        </span>
      )}
      {row.last && <span className="live-tally__then" style={{ left: `${scaled(row.last.share, top)}%` }} />}
    </>
  );
}

/** One tally row; `lead` is one of the mayor's two leaders at the head of the results pages, the
 *  same row restyled large, with its Estimated Range beside the share. */
function TallyRowView({
  row,
  lead = false,
  votesFirst = lead,
  top = 100,
  reachZones = true,
  toggle = null,
}: {
  row: TallyRow;
  lead?: boolean;
  /** The mayor's lead (Alex): the votes counted are the topline, the share the line beside them. */
  votesFirst?: boolean;
  /** The share at the track's end (a result scales to the most anyone can still reach). */
  top?: number;
  /** Out-of-reach zones: a result's scaled track has none; its end says it. */
  reachZones?: boolean;
  /** The folded "N other candidates" row's name opens the whole field in place (Alex). */
  toggle?: { controls: string; onClick: () => void } | null;
}) {
  return (
    <div
      className={`forecast-chart__row${row.eliminated ? " forecast-chart__row--out" : ""}${lead ? " forecast-chart__row--lead" : ""}`}
      role="listitem"
    >
      <span className="forecast-chart__label">
        {row.slug && <span className={`candidate-marker candidate-marker--${row.slug}`} aria-hidden="true" />}
        {toggle ? (
          <button type="button" className="live-tally__expand" aria-expanded={false} aria-controls={toggle.controls} onClick={toggle.onClick}>
            <span className="live-tally__name">{row.name}</span>
            <span className="live-tally__chevron" aria-hidden="true">⌄</span>
          </button>
        ) : (
          <span className="live-tally__name">{row.name}</span>
        )}
        {row.elected && <span className="badge badge--status">{WORDING.elected}</span>}
        {(row.band || row.possible) && <span className="visually-hidden">{rangeLine(row)}</span>}
      </span>
      <span className="forecast-chart__track" aria-hidden="true">
        <TrackMarks row={row} top={top} reachZones={reachZones} />
      </span>
      <strong className="forecast-chart__value live-tally__value" style={lead ? { color: row.color } : undefined}>
        {/* A leader's topline is the votes counted (Alex); its share is the line beside it. */}
        {row.waiting || (votesFirst && row.votes === null) ? "–" : votesFirst ? row.votes!.toLocaleString("en-CA") : percent(row.share, row.votes)}
      </strong>
      {lead && row.band && !row.eliminated && (
        <span className="mayor-lead__estimate">
          {"Estimated final "}
          <strong>{rangeText(row.band.low, row.band.high)}</strong>
        </span>
      )}
      <span className="live-tally__meta">
        {/* Each figure wraps whole, never a label on one line and its figure on the next. A leader's
            Estimated Range is beside its share, so its line is the votes alone. */}
        {(votesFirst ? votesFirstMeta(row) : rowMeta(row)).map((part, i) => (
          <span key={part}>
            {i > 0 && " · "}
            <span className="live-tally__fig">{part}</span>
          </span>
        ))}
      </span>
    </div>
  );
}

/** Folds an expanded field back: the folded row's name opens it (Alex). */
function ShowFewer({ controls, onClick }: { controls: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="btn btn--ghost btn--sm live-tally__more"
      aria-expanded={true}
      aria-controls={controls}
      onClick={(event) => {
        const button = event.currentTarget;
        onClick();
        // Folding a long field back would leave the reader far below the list.
        requestAnimationFrame(() => button.scrollIntoView?.({ block: "nearest" }));
      }}
    >
      <span className="live-tally__chevron" aria-hidden="true">⌃</span>
      Show fewer
    </button>
  );
}

/** The tally's key: only the marks this race draws. */
function TallyKey({ rows, reachZones = true }: { rows: TallyRow[]; reachZones?: boolean }) {
  const has = (pick: (row: TallyRow) => unknown) => rows.some(pick);
  const last = rows.find((r) => r.last)?.last ?? null;
  const band = has((r) => r.band);
  const reachShown = reachZones && has((r) => r.possible);
  if (!band && !reachShown && !last) return null;
  return (
    <p className="live-tally__key">
      {/* "Counted" only beside a mark it's told apart from: alone, the bar says it. */}
      {(band || reachShown) && <span><i className="live-tally__glyph live-tally__glyph--counted" aria-hidden="true" />{WORDING.keyCounted}</span>}
      {band && <span><i className="live-tally__glyph live-tally__glyph--estimate" aria-hidden="true" />{WORDING.keyEstimated}</span>}
      {reachShown && <span><i className="live-tally__glyph live-tally__glyph--reach" aria-hidden="true" />{WORDING.keyPossible}</span>}
      {last && <span><i className="live-tally__glyph live-tally__glyph--then" aria-hidden="true" />{last.label}</span>}
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
  const toggleFor = (row: TallyRow) => (row.key === FOLDED ? { controls: listId, onClick: () => setExpanded(true) } : null);
  const inIt = rows.filter((row) => !row.eliminated);
  const out = rows.filter((row) => row.eliminated);
  return (
    <>
      <div className="forecast-chart live-tally" role="list" id={listId} aria-label={`${raceTitle(race)} count`}>
        {inIt.map((row) => <TallyRowView key={row.key} row={row} toggle={toggleFor(row)} />)}
        {out.length > 0 && (
          <p className="live-tally__break" role="listitem">
            <strong>{WORDING.eliminated}</strong>
            <span className="live-tally__sep" aria-hidden="true"> · </span>
            <span className="live-tally__why">{WORDING.eliminatedWhy}</span>
          </p>
        )}
        {out.map((row) => <TallyRowView key={row.key} row={row} toggle={toggleFor(row)} />)}
        {(race.possible || estimated(race)) && (
          <div className="forecast-chart__axis live-tally__axis" aria-hidden="true">
            <span />
            <span className="forecast-chart__axis-track"><span>0</span><span>25</span><span>50</span><span>75</span><span>100%</span></span>
            <span />
          </div>
        )}
      </div>
      {/* The reading aids sit under the axis they explain (#118): the key, with the ranges'
          definitions, then any gate note. */}
      <TallyKey rows={rows} />
      {legend}
      {folds(race) && expanded && <ShowFewer controls={listId} onClick={() => setExpanded(false)} />}
    </>
  );
}

/** Where a result's bars end: the most any candidate can still reach (Alex), in place of
 *  out-of-reach zones; with no Possible Range (every area in), the full 100%. */
function reachTop(race: LiveRace): number {
  const highs = Object.values(race.possible ?? {}).map((p) => p.high);
  return highs.length > 0 ? Math.min(100, Math.max(5, Math.ceil(Math.max(...highs)))) : 100;
}

/** A race at a glance in the dashboard's grid (Alex): its two leaders and the rest as one row,
 *  votes first, on the result's scale; three candidates show whole. */
export function RaceCompactTally({ race, closed }: { race: LiveRace; closed: boolean }) {
  // The race at a glance (Alex, 2026-10-21): one bar for the whole count, the two leaders on a
  // line each. The rest of the field, the ranges and the count's detail are in the full result.
  const votesOf = (c: LiveCandidate) => c.votes ?? 0;
  const total = race.candidates.reduce((sum, c) => sum + votesOf(c), 0);
  const parts = leaderParts(race, votesOf);
  const elected = electedKey(race, closed);
  const leaders = [...race.candidates].sort((a, b) => votesOf(b) - votesOf(a)).slice(0, 2);
  const share = (c: LiveCandidate) => c.share ?? (total > 0 ? (100 * votesOf(c)) / total : null);
  return (
    <div className="race-compact__count">
      <span className="race-compact__bar" aria-hidden="true">
        {/* Everyone else paler than a leader with no colour of their own, so the two never merge. */}
        {total > 0 &&
          parts.map((part) => (
            <span key={part.key} style={{ ...segmentWidth((100 * part.votes) / total), background: part.key === "others" ? "var(--rule)" : part.colour }} />
          ))}
      </span>
      <ul className="race-compact__leaders" aria-label={`${raceTitle(race)}: the two leaders`}>
        {leaders.map((c) => (
          <li key={c.key}>
            <span className="race-compact__swatch" style={{ background: liveColour(c, NEUTRAL) }} aria-hidden="true" />
            <span className="live-tally__name">{c.full_name}</span>
            {c.key === elected && <span className="badge badge--status">{WORDING.elected}</span>}
            <span className="race-compact__share">{shareText(share(c), c.votes)}</span>
            <span className="race-compact__votes">{votesOf(c).toLocaleString("en-CA")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The mayor's tally at the head of the results pages (results redesign): the two leaders large,
 *  then the rest of the field folded to one row that expands in place, the axis, the key and any
 *  gate note. The same rows, marks and key as every race card. */
export function RaceLeadTally({ race, levels, closed }: { race: LiveRace; levels: Levels | null; closed: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const foldable = race.candidates.length > RESULT_SHOWS_ALL;
  // The count only (Alex): the projection is the panel beside it, so no row carries an Estimated Range.
  const rows = tallyRows(race, closed, expanded, foldable).map((row) => ({ ...row, band: null }));
  const toggleFor = (row: TallyRow) => (row.key === FOLDED ? { controls: listId, onClick: () => setExpanded(true) } : null);
  // Expanded, every candidate takes the leaders' look (Alex); folded, the rest is one quiet row.
  // Every row still in it takes the leaders' look (Alex), the folded "N other candidates" too.
  const leaders = rows.filter((row) => !row.eliminated);
  const rest = rows.filter((row) => row.eliminated);
  const inIt = rest.filter((row) => !row.eliminated);
  const out = rest.filter((row) => row.eliminated);
  const top = reachTop(race);
  return (
    <>
      <div className="forecast-chart live-tally mayor-lead__leaders" role="list" id={listId} aria-label={`${raceTitle(race)}: the count`}>
        {leaders.map((row) => (
          <TallyRowView key={row.key} row={row} lead top={top} reachZones={false} toggle={toggleFor(row)} />
        ))}
      </div>
      {rest.length > 0 && (
        <div className="forecast-chart live-tally mayor-lead__field" role="list" aria-label={`${raceTitle(race)}: mathematically eliminated`}>
          {inIt.map((row) => <TallyRowView key={row.key} row={row} votesFirst top={top} reachZones={false} toggle={toggleFor(row)} />)}
          {out.length > 0 && (
            <p className="live-tally__break" role="listitem">
              <strong>{WORDING.eliminated}</strong>
              <span className="live-tally__sep" aria-hidden="true"> · </span>
              <span className="live-tally__why">{WORDING.eliminatedWhy}</span>
            </p>
          )}
          {out.map((row) => <TallyRowView key={row.key} row={row} votesFirst top={top} reachZones={false} toggle={toggleFor(row)} />)}
        </div>
      )}
      <TallyKey rows={rows} reachZones={false} />
      <RangeNotes race={race} levels={levels} />
      {foldable && expanded && <ShowFewer controls={listId} onClick={() => setExpanded(false)} />}
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
  // The voters' list bar (Alex): the mayor card's, citywide.
  const turnout = race.level === "mayor" ? <TurnoutBar race={race} /> : null;
  switch (race.state) {
    // The page says "Results from 8 p.m." once (#115); the card shows the tally it will fill.
    case "before_results":
      return (
        <>
          <Tally race={race} closed={closed} />
          {turnout}
        </>
      );
    case "acclaimed":
      return <Acclaimed race={race} />;
    case "no_figures":
      return <Status>No figures from the City for this race right now</Status>;
    case "no_units_in":
      return (
        <>
          {race.progress && <ProgressLine progress={race.progress} />}
          <Tally race={race} closed={closed} />
          {turnout}
        </>
      );
    case "counting":
    case "all_units_in":
      return (
        <>
          {race.state === "all_units_in" ? (
            <Status>{WORDING.all_units_in}</Status>
          ) : race.progress ? (
            <ProgressLine progress={race.progress} />
          ) : (
            <Progress progress={race.progress} />
          )}
          {/* Candidates first, then turnout (results audit): on a phone the count leads. */}
          <Tally race={race} closed={closed} legend={<RangeNotes race={race} levels={levels} />} />
          {turnout}
        </>
      );
  }
}

/** The final Mayoral Forecast, collapsed and kept apart from the count (#7, #12): a pointer
 *  to the home page's forecast only, so none of its outcomes sits beside the count (#17's
 *  "Not shown anywhere", #54). */
export function FinalForecast() {
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
  forecast = false,
  closed = false,
}: {
  race: LiveRace;
  /** The payload's level statuses, for the gate notes and the mayor's record (#45). */
  levels?: Levels | null;
  /** The mayor card's forecast panel; hidden once the count is complete. */
  forecast?: boolean;
  /** Night Close is declared (#51). */
  closed?: boolean;
}) {
  const record = hasRecord(race, levels);
  const finalForecast = race.level === "mayor" && forecast && !closed && race.state !== "all_units_in";
  return (
    <section className={isAcclaimed(race) ? "card live-acclaimed" : "card"} aria-labelledby={`live-race-${race.id}`}>
      <h3 id={`live-race-${race.id}`}>{raceTitle(race)}</h3>
      <RaceBody race={race} levels={levels} closed={closed} />
      {/* The card's background disclosures, together at the bottom (#118). */}
      {(record || finalForecast || race.level === "mayor") && (
        <div className="live-card-more">
          {race.level === "mayor" && <AboutTurnout />}
          {record && <MayorRecord />}
          {finalForecast && <FinalForecast />}
        </div>
      )}
    </section>
  );
}
