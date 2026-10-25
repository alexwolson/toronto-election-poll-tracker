"use client";

/**
 * The citywide page's council and trustee overviews (results redesign, Alex, 2026-10-24): the
 * races to watch as the dashboard's compact cards (the editor's contests and head-to-heads, and any
 * race the count makes close), the other races as one table row each, then every race in a
 * sortable table. Every race links to its own page. Facts of the count; never a call.
 */

import Link from "next/link";
import { useState } from "react";
import { liveColour } from "@/lib/live-colour";
import { shortLabel } from "@/lib/live-labels";
import { shareText } from "@/lib/live-share";
import { contenders, counted, promotionReasons, raceColours, type EditorialRace } from "@/lib/race-model";
import { WORDING, electedKey, isComplete, moreVotes } from "@/lib/race-results";
import type { HomeRace } from "@/lib/home-data";
import type { LiveCandidate, LivePayload, LiveRace } from "@/types/live";

const byVotes = (race: LiveRace) => [...race.candidates].sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0));

function editorial(h: HomeRace): EditorialRace {
  return { type: h.ed.type, featured: h.ed.featured, outside: h.ed.outside, compare: h.ed.compare };
}

interface RaceRow {
  home: HomeRace;
  race: LiveRace | null;
  reasons: string[];
  colours: Record<string, string>;
  /** The leader's key once Night Close names them "Elected (unofficial)" (#51). */
  elected: string | null;
}

function rowsFor(homes: HomeRace[], payload: LivePayload | null, closed: boolean): RaceRow[] {
  return homes.map((home) => {
    const race = payload?.races.find((r) => r.id === home.id) ?? null;
    const ed = editorial(home);
    const colours = race ? raceColours(race, contenders(race, ed), (c) => liveColour(c, "") || null) : {};
    return { home, race, reasons: race ? promotionReasons(race, ed) : [], colours, elected: race ? electedKey(race, closed) : null };
  });
}

const Elected = () => <span className="badge badge--status">{WORDING.elected}</span>;

function progressText(race: LiveRace | null): string | null {
  if (!race) return null;
  if (race.state === "all_units_in") return WORDING.all_units_in;
  return race.progress ? `${race.progress.received.toLocaleString("en-CA")} of ${race.progress.total.toLocaleString("en-CA")} areas in` : null;
}

/** One race at a glance (Alex, the prototype): why the count flags it, the race's candidates with
 *  their tags, shares, bars and background, the editor's comparison, then how much is in and the
 *  lead, and the way to its page. */
function WatchCard({ row }: { row: RaceRow }) {
  const { home, race, reasons, colours, elected } = row;
  const ed = editorial(home);
  const ordered = race ? byVotes(race) : [];
  const shown = race && counted(race)
    ? (() => {
        const names = new Set([...ed.featured, ...(reasons.length ? ordered.slice(0, 2).map((c) => c.full_name) : [])]);
        return ordered.filter((c) => names.has(c.full_name)).slice(0, 4);
      })()
    : [];
  const [first, second] = ordered;
  const colourOf = (c: LiveCandidate) => colours[c.key] ?? "var(--color-disengaged)";
  const scale = Math.max(50, (first?.share ?? 0) + 5);
  const comparison = ed.type === "head" ? home.ed.poll ?? home.prior : null;
  const foot = [
    progressText(race),
    first && second && race && counted(race)
      ? isComplete(race)
        ? `${shortLabel(first)} has ${moreVotes((first.votes ?? 0) - (second.votes ?? 0))}`
        : `${shortLabel(first)} leads by ${((first.votes ?? 0) - (second.votes ?? 0)).toLocaleString("en-CA")}`
      : null,
  ].filter(Boolean).join(" · ");
  return (
    <article className={`watch-card${reasons.length ? " watch-card--flagged" : ""}`} aria-labelledby={`watch-${home.id}`}>
      <h3 className="watch-card__title" id={`watch-${home.id}`}>
        <Link href={home.href}>
          {home.kind === "council" && <span className="watch-card__num">{`Ward ${home.num}`}</span>} {home.title}
        </Link>
      </h3>
      {reasons.length > 0 && <p className="results-flag" role="status">{`${reasons.join(". ")}.`}</p>}
      {shown.length > 0 ? (
        <ul className="watch-card__rows" aria-label={`${home.title}: the race`}>
          {shown.map((c) => (
            <li key={c.key} className={c === first ? "watch-card__row watch-card__row--lead" : "watch-card__row"}>
              <span className="watch-card__name">
                {c.full_name} {home.tags[c.full_name] && <span className="candidate-row__tag">{home.tags[c.full_name]}</span>}
                {c.key === elected && <> <Elected /></>}
              </span>
              <span className="watch-card__share">{shareText(c.share, c.votes)}</span>
              <span className="live-bar watch-card__bar" aria-hidden="true">
                <span style={{ width: `${(100 * (c.share ?? 0)) / scale}%`, background: colourOf(c) }} />
              </span>
              {home.lines[c.full_name] && <span className="watch-card__line">{home.lines[c.full_name]}</span>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="watch-card__ballot">{race?.state === "acclaimed" ? `${WORDING.acclaimed}: ${race.candidates[0]?.full_name ?? ""}` : `On the ballot: ${ed.featured.join(", ")}`}</p>
      )}
      {comparison && <p className="watch-card__cmp">{comparison}</p>}
      <p className="watch-card__foot">
        <span>{foot}</span>
        <Link href={home.href}>Full results →</Link>
      </p>
    </article>
  );
}

/** The council's headline: the races to watch, then everyone else one row each. */
export function CouncilOverview({ homes, payload, closed }: { homes: HomeRace[]; payload: LivePayload | null; closed: boolean }) {
  const rows = rowsFor(homes.filter((h) => h.kind === "council"), payload, closed);
  const promoted = rows.filter((r) => r.reasons.length > 0);
  const featured = (t: string) => rows.filter((r) => r.reasons.length === 0 && r.home.ed.type === t);
  const watch = [...promoted, ...featured("contest"), ...featured("head")];
  const rest = rows.filter((r) => !watch.includes(r));
  return (
    <>
      <div className="results-sub-head">
        <h3>Races to watch</h3>
      </div>
      <div className="watch-grid">
        {watch.map((row) => <WatchCard key={row.home.id} row={row} />)}
      </div>
      <div className="results-sub-head">
        <h3>The other races</h3>
      </div>
      <RaceTable rows={rest} />
    </>
  );
}

/** One row per race: its leader, share, margin and how much is in, linking to its page. */
function RaceTable({ rows, label = "Ward" }: { rows: RaceRow[]; label?: string }) {
  return (
    <div className="live-table-scroll">
      <table className="live-table race-table">
        <thead>
          <tr>
            <th scope="col">{label}</th>
            <th scope="col">Most votes</th>
            <th scope="col" className="live-num">Share</th>
            <th scope="col" className="live-num">Margin</th>
            <th scope="col" className="live-num">Areas in</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ home, race, elected }) => {
            const [first, second] = race ? byVotes(race) : [];
            const started = race !== null && counted(race);
            const acclaimed = race?.state === "acclaimed" || home.acclaimed;
            return (
              <tr key={home.id}>
                <th scope="row"><Link href={home.href}>{home.kind === "council" ? `${home.num} ${home.title}` : home.title.replace(`${home.boardShort} `, "")}</Link></th>
                <td>
                  {acclaimed ? `${first?.full_name ?? home.ed.featured[0] ?? ""} (${WORDING.acclaimed.toLowerCase()})` : started ? first?.full_name : "No votes counted yet"}
                  {started && first && home.tags[first.full_name] === "Incumbent" && <> <span className="candidate-row__tag">Incumbent</span></>}
                  {first && first.key === elected && <> <Elected /></>}
                </td>
                <td className="live-num">{started && !acclaimed ? shareText(first.share, first.votes) : "–"}</td>
                <td className="live-num">{started && !acclaimed && second ? `+${((first.share ?? 0) - (second.share ?? 0)).toFixed(1)}` : "–"}</td>
                <td className="live-num">{!acclaimed && race?.progress ? `${race.progress.received}/${race.progress.total}` : "–"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

type CouncilSort = "number" | "close" | "trailing";

/** Every council race, sortable. */
export function CouncilTable({ homes, payload, closed }: { homes: HomeRace[]; payload: LivePayload | null; closed: boolean }) {
  const [sort, setSort] = useState<CouncilSort>("number");
  const rows = rowsFor(homes.filter((h) => h.kind === "council"), payload, closed);
  const margin = (r: RaceRow) => {
    if (!r.race || !counted(r.race)) return Infinity;
    const [a, b] = byVotes(r.race);
    return b ? (a.share ?? 0) - (b.share ?? 0) : Infinity;
  };
  const trailing = (r: RaceRow) => {
    if (!r.race || !counted(r.race) || r.home.incumbents.length === 0) return false;
    return !r.home.incumbents.includes(byVotes(r.race)[0].full_name);
  };
  const ordered = [...rows].sort((a, b) =>
    sort === "close" ? margin(a) - margin(b) : sort === "trailing" ? Number(trailing(b)) - Number(trailing(a)) || Number(a.home.num) - Number(b.home.num) : Number(a.home.num) - Number(b.home.num),
  );
  const SORTS: { id: CouncilSort; label: string }[] = [
    { id: "number", label: "Ward number" },
    { id: "close", label: "Closest race" },
    { id: "trailing", label: "Incumbent trailing" },
  ];
  return (
    <>
      <nav className="ward-index-sort live-seg" aria-label="Sort the races">
        {SORTS.map((s) => (
          <button key={s.id} type="button" aria-pressed={sort === s.id} onClick={() => setSort(s.id)}>
            {s.label}
          </button>
        ))}
      </nav>
      <RaceTable rows={ordered} />
    </>
  );
}

type Board = "tdsb" | "tcdsb" | "french";
const BOARD_NAME: Record<Board, string> = {
  tdsb: "Toronto District School Board",
  tcdsb: "Toronto Catholic District School Board",
  french: "Viamonde (French public) and MonAvenir (French Catholic)",
};

/** The trustee races, one board at a time, one row per race (Alex: no featured cards). */
export function TrusteeOverview({ homes, payload, closed }: { homes: HomeRace[]; payload: LivePayload | null; closed: boolean }) {
  const [board, setBoard] = useState<Board>("tdsb");
  const of = (b: Board) => homes.filter((h) => (b === "french" ? h.kind === "french" : h.boardId === b));
  const rows = rowsFor(of(board), payload, closed);
  const lead = rows.filter((r) => r.race && counted(r.race) && r.home.incumbents.length > 0 && r.home.incumbents.includes(byVotes(r.race)[0].full_name)).length;
  const running = rows.filter((r) => r.race && counted(r.race) && r.home.incumbents.length > 0 && !r.home.acclaimed).length;
  const open = rows.filter((r) => r.home.ed.type === "open").length;
  const acclaimed = rows.filter((r) => r.home.acclaimed).length;
  const waiting = rows.filter((r) => !r.home.acclaimed && (!r.race || !counted(r.race))).length;
  const bits = [
    running ? `Incumbents have the most votes in ${lead} of the ${running} races they’re running in` : null,
    open ? `${open} ${open === 1 ? "area is" : "areas are"} open` : null,
    acclaimed ? `${acclaimed} ${acclaimed === 1 ? "trustee was" : "trustees were"} acclaimed` : null,
    waiting ? `${waiting} ${waiting === 1 ? "race has" : "races have"} no votes counted yet` : null,
  ].filter(Boolean);
  return (
    <>
      <nav className="ward-index-sort live-seg" aria-label="Board">
        {(["tdsb", "tcdsb", "french"] as Board[]).map((b) => (
          <button key={b} type="button" aria-pressed={board === b} onClick={() => setBoard(b)}>
            {b === "french" ? "French boards" : b.toUpperCase()}
          </button>
        ))}
      </nav>
      <p className="t-body">
        <strong>{BOARD_NAME[board]}.</strong> {bits.length ? `${bits.join(". ")}.` : ""}
      </p>
      <RaceTable rows={rows} label="Area" />
      {board === "french" && (
        <p className="t-meta">
          <Link href="/conseils-scolaires/">Conseils scolaires de langue française / French-language boards →</Link>
        </p>
      )}
    </>
  );
}
