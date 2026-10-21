"use client";

/**
 * The count over the night (live-projection #103), from `/live/history.json`: how each
 * candidate's counted share moved with the Estimated Range behind it where one showed, the lead
 * between the top two, and the mayor by ward. Parts of
 * each race type's page since the views folded into it (Alex, 2026-10-21). Every chart has a
 * table. The count only, never compared with the forecast (#12).
 */

import { wardRaceHref } from "@/lib/results-dashboard";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { candidateMeta } from "@/lib/candidates";
import { liveColour } from "@/lib/live-colour";
import { shareText } from "@/lib/live-share";
import { leadRows, shareRows, type ShareRow } from "@/lib/live-count";
import { mayorWardLead, type Lead } from "@/lib/live-map";
import type { ResultsWard } from "@/lib/results-wards";
import type { LiveHistory, LivePayload, LiveRace } from "@/types/live";
import { shortLabel } from "@/lib/live-labels";
import { useLiveHistoryIfProvided } from "./live-results-poller";

const HALF_HOUR = 30 * 60_000;
const MARGIN = { top: 8, right: 28, bottom: 4, left: 0 } as const;
const AXIS_TICK = { fill: "var(--muted)", fontSize: 12, fontFamily: "var(--font-mono)" } as const;

/** Lines for candidates without a forecast colour: validated categorical slots, in order (dataviz). */
const SERIES = ["var(--live-series-1)", "var(--live-series-2)", "var(--live-series-3)", "var(--live-series-4)"];
const OTHER = "var(--live-other)";

const CLOCK = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", hour: "numeric", minute: "2-digit" });

const HOUR = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", hour: "numeric" });

function clock(ms: number): string {
  return CLOCK.format(ms);
}

/** An axis tick: "9 p.m." on the hour, "9:30 p.m." between. */
function tickClock(ms: number): string {
  return new Date(ms).getMinutes() === 0 ? HOUR.format(ms) : CLOCK.format(ms);
}

function pct(value: number | null | undefined, digits = 1): string {
  // A candidate's share, never "0.0%"; whole percents (voting areas in) stay as they are.
  if (digits === 1) return shareText(value);
  return value === null || value === undefined ? "–" : `${value.toFixed(digits)}%`;
}


/** Clock ticks across the domain: on the half hour, or the hour on a phone, and the start
 *  itself when the first of those is well after it, so the axis always says when it begins. */
export function clockTicks(min: number, max: number, narrow = false): number[] {
  const step = narrow ? 2 * HALF_HOUR : HALF_HOUR;
  const ticks = [];
  for (let t = Math.ceil(min / step) * step; t <= max; t += step) ticks.push(t);
  if (ticks.length === 0 || ticks[0] - min > step / 3) ticks.unshift(min);
  return ticks;
}

/** Share ticks every 10 points, or 20 above 60. */
function shareTicks(max: number): number[] {
  const step = max > 60 ? 20 : 10;
  return Array.from({ length: Math.floor(max / step) + 1 }, (_, i) => i * step);
}

/** Whether the viewport is phone-narrow, for fewer axis labels. */
function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(max-width: 520px)");
    const update = () => setNarrow(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return narrow;
}

interface Series {
  key: string;
  label: string;
  colour: string;
  band: boolean;
}

/**
 * The lines a race draws: the mayor's forecast-named candidates in their colours, then the
 * leading others; elsewhere the top four, in their race block's colours, the palette by their
 * place in the history's stable key order for those without one, never their rank, so a line
 * keeps its colour all night.
 */
function seriesFor(race: LiveRace, history: LiveHistory): Series[] {
  const keys = history.races[race.id]?.keys ?? [];
  const byVotes = [...race.candidates].filter((c) => keys.includes(c.key)).sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0));
  const label = (c: (typeof byVotes)[number]) => shortLabel(c);
  const hasBand = (key: string) => history.races[race.id]?.b?.some((row) => row[keys.indexOf(key)] !== null) ?? false;
  if (race.level === "mayor") {
    const named = byVotes.filter((c) => c.candidate_id);
    // The minor field is one "Everyone else" line: separate grey lines near zero can't be told apart.
    return named.map((c) => ({ key: c.key, label: label(c), colour: candidateMeta(c.candidate_id!).colorVar, band: hasBand(c.key) }));
  }
  const drawn = byVotes.slice(0, 4).sort((a, b) => keys.indexOf(a.key) - keys.indexOf(b.key));
  // Each candidate keeps the colour their race block gives them; the palette fills in for the rest.
  return drawn.map((c, i) => ({ key: c.key, label: label(c), colour: liveColour(c, SERIES[i]), band: hasBand(c.key) }));
}

function ChartFrame({ title, caption, children, table }: { title: string; caption?: ReactNode; children: ReactNode; table: ReactNode }) {
  return (
    <figure className="live-chart">
      <figcaption>
        <h3>{title}</h3>
        {caption && <p className="live-chart__caption">{caption}</p>}
      </figcaption>
      <div className="live-chart__plot" aria-hidden="true">
        {children}
      </div>
      <details className="live-table-toggle">
        <summary>Show as a table</summary>
        <div className="live-table-scroll">{table}</div>
      </details>
    </figure>
  );
}

function TooltipBox({ heading, rows }: { heading: string; rows: { label: string; value: string; colour?: string }[] }) {
  return (
    <div className="live-tooltip">
      <p className="live-tooltip__heading">{heading}</p>
      <ul>
        {rows.map((row) => (
          <li key={row.label}>
            {row.colour && <span className="live-tooltip__swatch" style={{ background: row.colour }} />}
            <span>{row.label}</span>
            <span className="live-num">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Legend({ series, others }: { series: Series[]; others: boolean }) {
  return (
    <ul className="live-legend">
      {series.map((s) => (
        <li key={s.key}>
          <svg width="22" height="10" aria-hidden="true">
            <line x1="1" y1="5" x2="21" y2="5" stroke={s.colour} strokeWidth="2.5" />
          </svg>
          {s.label}
        </li>
      ))}
      {others && (
        <li>
          <svg width="22" height="10" aria-hidden="true">
            <line x1="1" y1="5" x2="21" y2="5" stroke={OTHER} strokeWidth="1.5" strokeDasharray="1 3" />
          </svg>
          Everyone else
        </li>
      )}
      {series.some((s) => s.band) && (
        <li>
          <span className="live-legend__band" aria-hidden="true" />
          Estimated final range
        </li>
      )}
    </ul>
  );
}

type Axis = "clock" | "reported";

/** Counted share over the night: a line per drawn candidate, the band behind it where one showed. */
function ShareChart({ race, history, axis, height = 300 }: { race: LiveRace; history: LiveHistory; axis: Axis; height?: number }) {
  const narrow = useNarrow();
  const series = useMemo(() => seriesFor(race, history), [race, history]);
  const rows = useMemo(() => shareRows(history, race.id, series.map((s) => s.key)), [history, race.id, series]);
  const others = rows.some((r) => typeof r.others === "number" && r.others > 0);
  const x = axis === "clock" ? "t" : "reported";
  const data = axis === "clock" ? rows : rows.filter((r) => r.reported !== null);
  const top = Math.max(10, ...data.flatMap((r) => series.map((s) => Math.max(Number(r[s.key] ?? 0), ...((r[`band:${s.key}`] as number[] | undefined) ?? [0])))));
  const yMax = Math.min(100, Math.ceil(top / 10) * 10);
  const ticks = axis === "clock" && data.length ? clockTicks(data[0].t, data[data.length - 1].t, narrow) : [0, 25, 50, 75, 100];

  return (
    <>
      <Legend series={series} others={others} />
      <ResponsiveContainer width="100%" height={height} debounce={100}>
        <ComposedChart data={data} margin={MARGIN} accessibilityLayer={false}>
          <CartesianGrid vertical={false} stroke="var(--rule-soft)" />
          <XAxis
            dataKey={x}
            type="number"
            domain={axis === "clock" ? ["dataMin", "dataMax"] : [0, 100]}
            ticks={ticks}
            tickFormatter={(v: number) => (axis === "clock" ? tickClock(v) : `${v}%`)}
            tick={AXIS_TICK}
            axisLine={{ stroke: "var(--rule)" }}
            tickLine={false}
          />
          <YAxis domain={[0, yMax]} ticks={shareTicks(yMax)} tickFormatter={(v: number) => `${v}%`} tick={AXIS_TICK} axisLine={false} tickLine={false} width={44} />
          {series
            .filter((s) => s.band)
            .map((s) => (
              <Area
                key={`band:${s.key}`}
                dataKey={`band:${s.key}`}
                stroke="none"
                fill={s.colour}
                fillOpacity={0.14}
                isAnimationActive={false}
                connectNulls={false}
                activeDot={false}
              />
            ))}
          {others && (
            <Line dataKey="others" stroke={OTHER} strokeWidth={1.5} strokeDasharray="1 3" dot={false} isAnimationActive={false} />
          )}
          {series.map((s) => (
            <Line
              key={s.key}
              dataKey={s.key}
              stroke={s.colour}
              strokeWidth={2.5}
             
              dot={false}
              activeDot={{ r: 4, stroke: "var(--paper)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          ))}
          <Tooltip
            cursor={{ stroke: "var(--muted)", strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              const row = active ? (payload?.[0]?.payload as ShareRow | undefined) : undefined;
              if (!row) return null;
              return (
                <TooltipBox
                  heading={`${clock(row.t)} · ${pct(row.reported, 0)} of voting areas in`}
                  rows={[
                    ...series.map((s) => ({ label: s.label, value: pct(row[s.key] as number), colour: s.colour })),
                    ...(others ? [{ label: "Everyone else", value: pct(row.others as number), colour: OTHER }] : []),
                  ]}
                />
              );
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </>
  );
}

function ShareTable({ race, history }: { race: LiveRace; history: LiveHistory }) {
  const series = seriesFor(race, history);
  const rows = shareRows(history, race.id, series.map((s) => s.key));
  return (
    <table className="live-table">
      <thead>
        <tr>
          <th scope="col">City count</th>
          <th scope="col">Voting areas in</th>
          {series.map((s) => (
            <th key={s.key} scope="col">
              {s.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.t}>
            <th scope="row">{clock(row.t)}</th>
            <td className="live-num">{pct(row.reported, 0)}</td>
            {series.map((s) => {
              const band = row[`band:${s.key}`] as [number, number] | undefined;
              return (
                <td key={s.key} className="live-num">
                  {pct(row[s.key] as number)}
                  {band && <span className="live-table__range"> ({Math.round(band[0])}–{Math.round(band[1])}%)</span>}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AxisSwitch({ axis, onChange }: { axis: Axis; onChange: (axis: Axis) => void }) {
  return (
    <div className="ward-index-sort live-seg" role="group" aria-label="Across the bottom">
      <button type="button" aria-pressed={axis === "clock"} onClick={() => onChange("clock")}>
        Time of night
      </button>
      <button type="button" aria-pressed={axis === "reported"} onClick={() => onChange("reported")}>
        Voting areas in
      </button>
    </div>
  );
}

export function LeadChart({ race, history, axis }: { race: LiveRace; history: LiveHistory; axis: Axis }) {
  const narrow = useNarrow();
  const [a, b] = race.candidates;
  if (!a || !b || !history.races[race.id]) return null;
  const colour = (c: typeof a) => (c.candidate_id ? candidateMeta(c.candidate_id).colorVar : OTHER);
  const name = (c: typeof a) => shortLabel(c);
  const all = leadRows(history, race.id, a.key, b.key);
  const rows = axis === "clock" ? all : all.filter((r) => r.reported !== null);
  if (rows.length === 0) return null;
  const x = axis === "clock" ? "t" : "reported";
  const extent = Math.max(2, ...rows.map((r) => Math.abs(r.lead)));
  const bound = Math.ceil(extent / 2) * 2;
  // Split the fill at zero: above is the first candidate ahead, below the second.
  const max = Math.max(...rows.map((r) => r.lead));
  const min = Math.min(...rows.map((r) => r.lead));
  const zero = max <= 0 ? 0 : min >= 0 ? 1 : max / (max - min);
  const id = `lead-${race.id}`;
  return (
    <ChartFrame
      title={`${name(a)} against ${name(b)}`}
      caption={`${name(a)}'s counted share minus ${name(b)}'s, in points.`}
      table={
        <table className="live-table">
          <thead>
            <tr>
              <th scope="col">City count</th>
              <th scope="col">Voting areas in</th>
              <th scope="col">Lead</th>
            </tr>
          </thead>
          <tbody>
            {all.map((r) => (
              <tr key={r.t}>
                <th scope="row">{clock(r.t)}</th>
                <td className="live-num">{pct(r.reported, 0)}</td>
                <td className="live-num">
                  {r.lead === 0 ? "Tied" : `${r.lead > 0 ? name(a) : name(b)} by ${Math.abs(r.lead).toFixed(1)} pts`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <ResponsiveContainer width="100%" height={220} debounce={100}>
        <ComposedChart data={rows} margin={MARGIN} accessibilityLayer={false}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset={zero} stopColor={colour(a)} stopOpacity={0.35} />
              <stop offset={zero} stopColor={colour(b)} stopOpacity={0.35} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--rule-soft)" />
          <XAxis
            dataKey={x}
            type="number"
            domain={axis === "clock" ? ["dataMin", "dataMax"] : [0, 100]}
            ticks={axis === "clock" ? clockTicks(rows[0].t, rows[rows.length - 1].t, narrow) : [0, 25, 50, 75, 100]}
            tickFormatter={(v: number) => (axis === "clock" ? tickClock(v) : `${v}%`)}
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
          />
          <YAxis domain={[-bound, bound]} tickFormatter={(v: number) => (v === 0 ? "0" : `${v > 0 ? "+" : "−"}${Math.abs(v)}`)} tick={AXIS_TICK} axisLine={false} tickLine={false} width={44} />
          <ReferenceLine y={0} stroke="var(--ink)" strokeWidth={1} />
          <Area dataKey="lead" stroke="var(--ink)" strokeWidth={1.5} fill={`url(#${id})`} baseValue={0} isAnimationActive={false} />
          <Tooltip
            cursor={{ stroke: "var(--muted)", strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              const r = active ? (payload?.[0]?.payload as (typeof rows)[number] | undefined) : undefined;
              if (!r) return null;
              const ahead = r.lead > 0 ? a : b;
              return (
                <TooltipBox
                  heading={`${clock(r.t)} · ${pct(r.reported, 0)} of voting areas in`}
                  rows={[{ label: r.lead === 0 ? "Tied" : `${name(ahead)} ahead by`, value: `${Math.abs(r.lead).toFixed(1)} pts`, colour: colour(ahead) }]}
                />
              );
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

type WardSort = "ward" | "reported" | "leader" | "margin";

function MayorWardTable({ mayor, wards }: { mayor: LiveRace; wards: ResultsWard[] }) {
  const [sort, setSort] = useState<{ key: WardSort; desc: boolean }>({ key: "ward", desc: false });
  const names = new Map(wards.map((w) => [w.num, w.name]));
  const label = (key: string | null) => {
    const c = mayor.candidates.find((x) => x.key === key);
    return c ? shortLabel(c) : "–";
  };
  const rows = (mayor.wards ?? []).map((w) => ({ num: w.num, lead: mayorWardLead(w), progress: w.progress }));
  const value = (r: { num: string; lead: Lead }): number | string => {
    if (sort.key === "ward") return Number(r.num);
    if (sort.key === "reported") return r.lead.reported ?? -1;
    if (sort.key === "leader") return label(r.lead.leader);
    return r.lead.margin ?? -1;
  };
  rows.sort((x, y) => {
    const [a, b] = [value(x), value(y)];
    const order = typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b));
    return sort.desc ? -order : order;
  });
  const header = (key: WardSort, text: string) => (
    <th scope="col" aria-sort={sort.key === key ? (sort.desc ? "descending" : "ascending") : "none"}>
      <button type="button" className="live-sort" onClick={() => setSort((s) => ({ key, desc: s.key === key ? !s.desc : key !== "ward" && key !== "leader" }))}>
        {text}
        <span aria-hidden="true">{sort.key === key ? (sort.desc ? " ↓" : " ↑") : ""}</span>
      </button>
    </th>
  );
  return (
    <>
      <div className="live-table-scroll">
        <table className="live-table live-table--wards">
          <thead>
            <tr>
              {header("ward", "Ward")}
              {header("reported", "Voting areas in")}
              {header("leader", "Leading")}
              <th scope="col">Share</th>
              {header("margin", "Lead")}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const leader = mayor.candidates.find((c) => c.key === r.lead.leader);
              return (
                <tr key={r.num}>
                  <th scope="row">
                    <Link href={wardRaceHref(r.num)}>
                      {r.num} {names.get(r.num)}
                    </Link>
                  </th>
                  <td className="live-num">
                    <span className="live-bar" aria-hidden="true">
                      <span style={{ width: `${100 * (r.lead.reported ?? 0)}%` }} />
                    </span>
                    {r.lead.reported === null ? "–" : pct(100 * r.lead.reported, 0)}
                  </td>
                  <td>
                    <span
                      className="live-map__swatch live-table__swatch"
                      style={{ background: leader?.candidate_id ? candidateMeta(leader.candidate_id).colorVar : OTHER }}
                      aria-hidden="true"
                    />
                    {r.lead.tied ? "Tied" : label(r.lead.leader)}
                  </td>
                  <td className="live-num">{pct(r.lead.leaderShare)}</td>
                  <td className="live-num">{r.lead.margin === null ? "–" : `${r.lead.margin.toFixed(1)} pts`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** Before results, or while the history loads: one line in place of the charts. */
function CountPending({ payload, history }: { payload: LivePayload | null; history: LiveHistory | null }): ReactNode {
  if (!payload || payload.state !== "results") return <p className="live-empty">Charts of the count start once the City reports results, from 8 p.m.</p>;
  if (history === null || history.t.length === 0)
    return (
      <p className="live-empty" role="status">
        Loading the count so far…
      </p>
    );
  return null;
}

/** The mayor's count over the night: each candidate's counted share, then the lead. */
export function MayorCount({ payload }: { payload: LivePayload | null }) {
  const history = useLiveHistoryIfProvided();
  const [axis, setAxis] = useState<Axis>("clock");
  const mayor = payload?.races.find((r) => r.id === "mayor") ?? null;
  const pending = CountPending({ payload, history });
  return (
    <section id="results-count" className="live-count" aria-labelledby="live-count-heading">
      <div className="live-count__head">
        <h2 id="live-count-heading">The count over the night</h2>
        {!pending && history && (
          <p className="live-count__note">
            From {clock(history.t[0])} to {clock(history.t[history.t.length - 1])}.
          </p>
        )}
      </div>
      {pending ??
        (mayor && history?.races.mayor && (
          <div className="live-count__block">
            <AxisSwitch axis={axis} onChange={setAxis} />
            <ChartFrame title="Share of the votes counted" table={<ShareTable race={mayor} history={history} />}>
              <ShareChart race={mayor} history={history} axis={axis} />
            </ChartFrame>
            <LeadChart race={mayor} history={history} axis={axis} />
          </div>
        ))}
    </section>
  );
}

/** The mayor ward by ward (#123). Reads only the payload, so it shows from the first poll. */
export function MayorWards({ payload, wards }: { payload: LivePayload | null; wards: ResultsWard[] }) {
  const mayor = payload?.races.find((r) => r.id === "mayor") ?? null;
  return (
    <section id="results-wards" className="live-count" aria-labelledby="mayor-wards-heading">
      <h2 id="mayor-wards-heading">Mayor by ward</h2>
      {!payload || payload.state !== "results" ? (
        <p className="live-empty">The table fills in once the City reports results, from 8 p.m.</p>
      ) : mayor?.wards ? (
        <MayorWardTable mayor={mayor} wards={wards} />
      ) : (
        <p className="live-empty">The mayor’s figures by ward aren’t available.</p>
      )}
    </section>
  );
}

/** One race's counted share over the night, for its full block. Nothing before its count starts. */
export function RaceCount({ race }: { race: LiveRace }) {
  const history = useLiveHistoryIfProvided();
  const [axis, setAxis] = useState<Axis>("clock");
  if (race.state !== "counting" && race.state !== "all_units_in") return null;
  if (history === null)
    return (
      <div className="live-race-count">
        <p className="live-empty" role="status">
          Loading the count so far…
        </p>
      </div>
    );
  if (shareRows(history, race.id, []).length === 0) return null;
  return (
    <div className="live-race-count">
      <AxisSwitch axis={axis} onChange={setAxis} />
      <ChartFrame title="Share of the votes counted over the night" table={<ShareTable race={race} history={history} />}>
        <ShareChart race={race} history={history} axis={axis} height={220} />
      </ChartFrame>
    </div>
  );
}
