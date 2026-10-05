/**
 * PROTOTYPE — throwaway. Pieces the three layout variants share: the live strip, Reporting
 * Progress, a race's tally with its projection in the chosen form, and the compact projection
 * used in tables and lists. Each variant still owns its own layout.
 */
import { MarginOutcomes } from "@/components/forecast/margin-outcomes";
import { percentagesToHundred } from "@/lib/format";
import type { MarginOutcomesView } from "@/lib/mayoral-forecast";
import {
  chanceBand,
  FRENCH_NOTE,
  gateOffNote,
  pct,
  progressText,
  surname,
  type CandidateRow,
  type Level,
  type Night,
  type ProjectionForm,
  type RaceView,
} from "../_lib/stub";

export interface ForecastReferenceData {
  view: MarginOutcomesView;
  leadName: string;
}

// ── status ─────────────────────────────────────────────────────────────────
export function LiveStrip({ night, dark = false }: { night: Night; dark?: boolean }) {
  const label =
    night.state === "pre" ? "Counting starts at 8 p.m." : night.state === "final" ? "Count complete (unofficial)" : "Live";
  const live = night.state !== "pre" && night.state !== "final";
  return (
    <p className={`rp-live${dark ? " rp-live--dark" : ""}`}>
      <span className={`rp-live__pill${live ? " rp-live__pill--on" : ""}`}>{label}</span>
      <span>
        {night.state === "pre" ? "Checked" : "Updated"} {night.clock}
      </span>
      <span className="rp-live__muted">
        {night.state === "final" ? "Unofficial results from the City of Toronto" : "Refreshes every minute · City of Toronto unofficial results"}
      </span>
    </p>
  );
}

export function ProgressMeter({ race, compact = false }: { race: RaceView; compact?: boolean }) {
  if (race.status === "acclaimed") return <span className="rp-tag">Acclaimed</span>;
  const share = race.shape.units ? race.unitsIn / race.shape.units : 0;
  return (
    <span className={`rp-progress${compact ? " rp-progress--compact" : ""}`}>
      <span className="rp-progress__track" aria-hidden="true">
        <span className="rp-progress__fill" style={{ width: `${share * 100}%` }} />
      </span>
      <span className="rp-progress__text">
        {race.status === "waiting" ? (compact ? "No results yet" : `No results yet · ${race.shape.units} voting areas`) : progressText(race)}
      </span>
    </span>
  );
}

export function StatusTag({ race }: { race: RaceView }) {
  if (race.status === "complete") return <span className="rp-tag rp-tag--done">All voting areas in</span>;
  if (race.status === "acclaimed") return <span className="rp-tag">Acclaimed</span>;
  if (race.status === "waiting") return <span className="rp-tag rp-tag--wait">Waiting</span>;
  return null;
}

// ── notes for withheld projections ──────────────────────────────────────────
export function LevelNote({ level, night }: { level: Level; night: Night }) {
  if (night.state === "pre" || night.state === "final") return null;
  if (level === "french") return <p className="rp-note">{FRENCH_NOTE}</p>;
  if (night.gates[level]) return null;
  return <p className="rp-note rp-note--off">{gateOffNote(level)}</p>;
}

// ── projection pieces ─────────────────────────────────────────────────────────
function Marker({ row }: { row: CandidateRow }) {
  if (!row.slug) return null;
  return <span className={`candidate-marker candidate-marker--${row.slug}`} aria-hidden="true" />;
}

function rowColor(row: CandidateRow): string {
  return row.slug ? `var(--color-${row.slug})` : "var(--rp-bar)";
}

function foldRows(race: RaceView, limit: number) {
  if (race.rows.length <= limit + 1) return { shown: race.rows, others: null };
  const shown = race.rows.slice(0, limit);
  const rest = race.rows.slice(limit);
  return {
    shown,
    others: {
      count: rest.length,
      votes: rest.reduce((s, r) => s + r.votes, 0),
      share: rest.reduce((s, r) => s + r.share, 0),
    },
  };
}

function outcomesView(race: RaceView) {
  const o = race.projection!.outcomes;
  const colorOf = (name: string) => {
    const row = race.rows.find((r) => r.name === name);
    return row?.slug ? `var(--color-${row.slug})` : null;
  };
  const [a, b, c] = percentagesToHundred([o.leaderAhead, o.close, o.challengerAhead]);
  const guard = (p: number, f: number) => (p === 0 && f > 0 ? "<1%" : p === 100 && f < 1 ? ">99%" : `${p}%`);
  return [
    { key: "l", label: `${surname(o.leader)} ahead by ${o.threshold} or more`, p: o.leaderAhead, text: guard(a, o.leaderAhead), tone: "lead", color: colorOf(o.leader) },
    { key: "c", label: `Within ${o.threshold} points either way`, p: o.close, text: guard(b, o.close), tone: "close", color: null },
    { key: "r", label: `${surname(o.challenger)} ahead by ${o.threshold} or more`, p: o.challengerAhead, text: guard(c, o.challengerAhead), tone: "chal", color: colorOf(o.challenger) },
  ];
}

/** A race's Live Tally with its projection in the chosen form folded in. */
export function RaceResult({ race, form, limit = 6 }: { race: RaceView; form: ProjectionForm; limit?: number }) {
  if (race.status === "acclaimed") {
    return (
      <p className="rp-acclaimed">
        <strong>{race.rows[0].name}</strong> was acclaimed: the only candidate, so there is no vote.
      </p>
    );
  }
  if (race.status === "waiting") {
    return (
      <div className="rp-waiting">
        <p className="rp-waiting__lead">
          {race.withheld === "pre" ? "Results from 8 p.m." : "No voting areas have reported yet."}{" "}
          {race.rows.length} candidates, in ballot order:
        </p>
        <p className="rp-waiting__names">{race.rows.map((r) => r.name).join(" · ")}</p>
      </div>
    );
  }
  const { shown, others } = foldRows(race, limit);
  const withRange = form === "range" && race.projection;
  const withChance = form === "chance" && race.projection;
  const scaleMax = withRange
    ? Math.min(1, Math.ceil(Math.max(...shown.map((r) => Math.max(r.share, r.projection?.hi ?? 0))) * 10 + 0.5) / 10)
    : Math.min(1, Math.ceil(Math.max(...shown.map((r) => r.share)) * 10 + 0.5) / 10);
  const x = (v: number) => `${(v / scaleMax) * 100}%`;
  const winner = race.status === "complete" ? race.rows[0].name : null;

  return (
    <div className="rp-result">
      <div className={`rp-tally${withChance ? " rp-tally--chance" : ""}`} role="table" aria-label={`${race.shape.title} count`}>
        <div className="rp-tally__head" role="row">
          <span role="columnheader">Candidate</span>
          <span role="columnheader" className="rp-tally__axis">
            <span>0%</span>
            {withRange && <span className="rp-tally__axis-key">Bar: counted so far · band: projected final</span>}
            <span>{Math.round(scaleMax * 100)}%</span>
          </span>
          <span role="columnheader" className="rp-num">Votes</span>
          {withChance && <span role="columnheader" className="rp-num">Chance to win</span>}
        </div>
        {shown.map((row) => (
          <div className="rp-tally__row" role="row" key={row.name}>
            <span role="cell" className="rp-tally__name">
              <Marker row={row} />
              <span className={row.name === winner ? "rp-winner" : undefined}>{row.name}</span>
              {row.name === winner && <span className="rp-tag rp-tag--elected">Elected (unofficial)</span>}
            </span>
            <span role="cell" className="rp-tally__track">
              <span className="rp-tally__bar" style={{ width: x(row.share), background: rowColor(row) }} />
              {withRange && row.projection && (
                <>
                  <span
                    className="rp-tally__band"
                    style={{ left: x(row.projection.lo), width: x(row.projection.hi - row.projection.lo), borderColor: rowColor(row) }}
                  />
                  <span className="rp-tally__median" style={{ left: x(row.projection.median) }} />
                </>
              )}
            </span>
            <span role="cell" className="rp-num rp-tally__value">
              <strong>{pct(row.share)}</strong>
              <span>{row.votes.toLocaleString()}</span>
              {withRange && row.projection && (
                <span className="rp-tally__proj">final {Math.round(row.projection.lo * 100)}–{Math.round(row.projection.hi * 100)}%</span>
              )}
            </span>
            {withChance && (
              <span role="cell" className="rp-num rp-tally__chance">
                {row.projection ? chanceBand(row.projection.win) : "—"}
              </span>
            )}
          </div>
        ))}
        {others && (
          <div className="rp-tally__row rp-tally__row--others" role="row">
            <span role="cell" className="rp-tally__name">{others.count} other candidates</span>
            <span role="cell" className="rp-tally__track">
              <span className="rp-tally__bar" style={{ width: x(others.share), background: "var(--rp-bar-soft)" }} />
            </span>
            <span role="cell" className="rp-num rp-tally__value">
              <strong>{pct(others.share)}</strong>
              <span>{others.votes.toLocaleString()}</span>
            </span>
            {withChance && <span role="cell" className="rp-num rp-tally__chance">—</span>}
          </div>
        )}
      </div>
      {form === "outcomes" && race.projection && <OutcomesBlock race={race} />}
      {race.projection && (
        <p className="rp-caption">
          {form === "chance" && "Chance to win: share of 10,000 simulated finishes of the count that each candidate wins. "}
          {form === "range" && "Band: where each candidate’s final share lands in 9 of 10 simulated finishes of the count. "}
          {form === "outcomes" && "Share of 10,000 simulated finishes of the count. "}
          Projection by City Hall Watcher from the count so far; not a race call.
        </p>
      )}
    </div>
  );
}

function OutcomesBlock({ race }: { race: RaceView }) {
  const rows = outcomesView(race);
  const max = Math.max(...rows.map((r) => r.p), Number.EPSILON);
  return (
    <div className="rp-outcomes">
      <p className="rp-outcomes__title">How the count could finish</p>
      {rows.map((row) => (
        <div className="rp-outcomes__row" key={row.key}>
          <span>{row.label}</span>
          <span className="rp-outcomes__track">
            <span className={`rp-outcomes__bar rp-outcomes__bar--${row.tone}`} style={{ width: `${(row.p / max) * 100}%`, ...(row.color ? { background: row.color } : {}) }} />
          </span>
          <strong className="rp-num">{row.text}</strong>
        </div>
      ))}
    </div>
  );
}

/** One-line projection for tables, lists and cards. */
export function ProjectionCompact({ race, form }: { race: RaceView; form: ProjectionForm }) {
  if (!race.projection) {
    const text =
      race.withheld === "gate" || race.withheld === "unqualified-board"
        ? "Count only"
        : race.withheld === "complete"
          ? "Final count"
          : race.withheld === "acclaimed"
            ? "—"
            : race.withheld === "no-units"
              ? "After first results"
              : "From 8 p.m.";
    return <span className="rp-compact rp-compact--none">{text}</span>;
  }
  const leader = race.rows[0];
  if (form === "chance") {
    const fav = [...race.rows].filter((r) => r.projection).sort((a, b) => b.projection!.win - a.projection!.win)[0];
    return (
      <span className="rp-compact">
        <strong>{surname(fav.name)}</strong> {chanceBand(fav.projection!.win)}
      </span>
    );
  }
  if (form === "range") {
    const top = race.rows.filter((r) => r.projection).slice(0, 2);
    return (
      <span className="rp-compact rp-compact--range">
        {top.map((r) => (
          <span key={r.name}>
            {surname(r.name)} {Math.round(r.projection!.lo * 100)}–{Math.round(r.projection!.hi * 100)}%
          </span>
        ))}
      </span>
    );
  }
  const rows = outcomesView(race);
  return (
    <span className="rp-compact rp-compact--outcomes" title={rows.map((r) => `${r.label}: ${r.text}`).join("; ")}>
      <span className="rp-stack" aria-hidden="true">
        {rows.map((r) => (
          <span key={r.key} className={`rp-outcomes__bar--${r.tone}`} style={{ width: `${r.p * 100}%`, ...(r.color ? { background: r.color } : {}) }} />
        ))}
      </span>
      <span className="rp-compact__legend">
        {surname(leader.name)} +2: {rows[0].text} · close {rows[1].text} · {surname(race.projection.outcomes.challenger)} +2: {rows[2].text}
      </span>
    </span>
  );
}

export function leaderLine(race: RaceView): string {
  if (race.status === "acclaimed") return `${race.rows[0].name} (acclaimed)`;
  if (race.status === "waiting") return `${race.rows.length} candidates`;
  const [a, b] = race.rows;
  if (!b) return `${a.name} ${pct(a.share)}`;
  return `${a.name} ${pct(a.share)} · ${b.name} ${pct(b.share)}`;
}

export function ForecastReference({ forecast, compact = false }: { forecast: ForecastReferenceData; compact?: boolean }) {
  return (
    <aside className={`rp-forecast${compact ? " rp-forecast--compact" : ""}`} aria-label="Final pre-election forecast">
      <p className="rp-forecast__title">Before the count: the final forecast</p>
      <p className="rp-forecast__lede">
        From the polls, {forecast.leadName} was favoured. How far apart {forecast.view.leader.surname} and{" "}
        {forecast.view.challenger.surname} were expected to finish:
      </p>
      <MarginOutcomes view={forecast.view} />
      <p className="rp-caption">The final pre-election forecast, kept for reference. It is not the count and not the projection.</p>
    </aside>
  );
}
