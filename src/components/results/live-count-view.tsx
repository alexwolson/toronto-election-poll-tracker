"use client";

/**
 * The results Count view (live-projection #103): the count over the night, from
 * `/live/history.json`. How fast voting areas and votes come in, how each candidate's
 * counted share moved with the Estimated Range behind it where one showed, the lead
 * between the top two, the mayor by ward, and every race by how much is in. Every chart
 * has a table. The count only, never compared with the forecast (#12).
 */

import { myWardHref, raceHref } from "@/lib/results-dashboard";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Area,
  Bar,
  BarChart,
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
import { shareText } from "@/lib/live-share";
import { countRows, leadRows, paceBuckets, shareRows, type ShareRow } from "@/lib/live-count";
import { mayorWardLead, raceLead, reportedFraction, type Lead } from "@/lib/live-map";
import type { ResultsWard } from "@/lib/results-wards";
import type { LiveHistory, LivePayload, LiveRace } from "@/types/live";
import { shortLabel } from "@/lib/live-labels";
import { useLiveHistory } from "./live-results-poller";
import { raceTitle } from "./race-cards";

const TEN_MINUTES = 10 * 60_000;
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

function whole(n: number): string {
  return n.toLocaleString("en-CA");
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
 * leading others; elsewhere the top four. Colours follow the candidate's place in the
 * history's stable key order, never their rank, so a line keeps its colour all night.
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
  return drawn.map((c, i) => ({ key: c.key, label: label(c), colour: SERIES[i], band: hasBand(c.key) }));
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

function PaceCharts({ history }: { history: LiveHistory }) {
  const narrow = useNarrow();
  const rows = countRows(history, "mayor");
  const buckets = paceBuckets(history, "mayor", TEN_MINUTES);
  if (rows.length === 0) return null;
  const domain: [number, number] = [buckets[0].start, rows[rows.length - 1].t];
  const ticks = clockTicks(domain[0], domain[1], narrow);
  const xAxis = (
    <XAxis
      dataKey="t"
      type="number"
      domain={domain}
      ticks={ticks}
      tickFormatter={tickClock}
      tick={AXIS_TICK}
      axisLine={{ stroke: "var(--rule)" }}
      tickLine={false}
    />
  );
  return (
    <div className="live-chart-pair">
      <ChartFrame
        title="Voting areas in"
        table={
          <table className="live-table">
            <thead>
              <tr>
                <th scope="col">City count</th>
                <th scope="col">Voting areas in</th>
                <th scope="col">Votes counted</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.t}>
                  <th scope="row">{clock(r.t)}</th>
                  <td className="live-num">{pct(r.reported, 0)}</td>
                  <td className="live-num">{whole(r.counted)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      >
        <ResponsiveContainer width="100%" height={200} debounce={100}>
          <ComposedChart data={rows} margin={MARGIN} accessibilityLayer={false}>
            <CartesianGrid vertical={false} stroke="var(--rule-soft)" />
            {xAxis}
            <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tickFormatter={(v: number) => `${v}%`} tick={AXIS_TICK} axisLine={false} tickLine={false} width={44} />
            <Area type="stepAfter" dataKey="reported" stroke="var(--live-seq-3)" strokeWidth={2} fill="var(--live-seq-1)" fillOpacity={0.35} connectNulls isAnimationActive={false} />
            <Tooltip
              cursor={{ stroke: "var(--muted)", strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                const r = active ? (payload?.[0]?.payload as (typeof rows)[number] | undefined) : undefined;
                return r ? <TooltipBox heading={clock(r.t)} rows={[{ label: "Voting areas in", value: pct(r.reported, 0) }, { label: "Votes counted", value: whole(r.counted) }]} /> : null;
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartFrame>
      <ChartFrame
        title="Votes for mayor counted, per 10 minutes"
        table={
          <table className="live-table">
            <thead>
              <tr>
                <th scope="col">From</th>
                <th scope="col">Votes counted</th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((b) => (
                <tr key={b.start}>
                  <th scope="row">{clock(b.start)}</th>
                  <td className="live-num">{whole(b.votes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      >
        <ResponsiveContainer width="100%" height={200} debounce={100}>
          <BarChart data={buckets.map((b) => ({ t: b.start + TEN_MINUTES / 2, ...b }))} margin={MARGIN} barCategoryGap={2} accessibilityLayer={false}>
            <CartesianGrid vertical={false} stroke="var(--rule-soft)" />
            {xAxis}
            <YAxis tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} tick={AXIS_TICK} axisLine={false} tickLine={false} width={44} />
            <Bar dataKey="votes" fill="var(--live-seq-3)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
            <Tooltip
              cursor={{ fill: "var(--tint)" }}
              content={({ active, payload }) => {
                const b = active ? (payload?.[0]?.payload as { start: number; votes: number } | undefined) : undefined;
                return b ? <TooltipBox heading={`${clock(b.start)} to ${clock(b.start + TEN_MINUTES)}`} rows={[{ label: "Votes counted", value: whole(b.votes) }]} /> : null;
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
    </div>
  );
}

/** The lead between the race's top two now, over the night, shaded by who was ahead. */
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
    <section className="live-count__block" aria-labelledby="mayor-wards-heading">
      <h3 id="mayor-wards-heading">Mayor, ward by ward</h3>
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
                    <Link href={myWardHref(r.num)}>
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
    </section>
  );
}

/** Every race by how much is in, least first; races with everything in fold to one line. */
function ReportingBoard({ races }: { races: LiveRace[] }) {
  const counted = races.filter((r) => r.state !== "acclaimed" && r.progress !== null);
  const rows = counted
    .map((race) => ({ race, fraction: reportedFraction(race.progress) ?? 0, lead: raceLead(race) }))
    .sort((a, b) => a.fraction - b.fraction || raceTitle(a.race).localeCompare(raceTitle(b.race), "en-CA", { numeric: true }));
  const open = rows.filter((r) => r.fraction < 1);
  const done = rows.length - open.length;
  return (
    <section className="live-count__block" aria-labelledby="reporting-board-heading">
      <h3 id="reporting-board-heading">Every race, least counted first</h3>
      {open.length === 0 ? (
        <p>Every race has all its voting areas in.</p>
      ) : (
        <div className="live-table-scroll">
          <table className="live-table">
            <thead>
              <tr>
                <th scope="col">Race</th>
                <th scope="col">Voting areas in</th>
                <th scope="col">Leading</th>
              </tr>
            </thead>
            <tbody>
              {open.map(({ race, fraction, lead }) => {
                const leader = race.candidates.find((c) => c.key === lead.leader);
                return (
                  <tr key={race.id}>
                    <th scope="row">{race.level !== "mayor" ? <Link href={raceHref(race)}>{raceTitle(race)}</Link> : raceTitle(race)}</th>
                    <td className="live-num">
                      <span className="live-bar" aria-hidden="true">
                        <span style={{ width: `${100 * fraction}%` }} />
                      </span>
                      {race.progress!.received} of {race.progress!.total}
                    </td>
                    <td>{lead.tied ? "Tied" : leader ? shortLabel(leader) : "–"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {done > 0 && open.length > 0 && <p className="live-count__note">{done} more {done === 1 ? "race has" : "races have"} every voting area in.</p>}
    </section>
  );
}

export interface LiveCountViewProps {
  payload: LivePayload | null;
  /** The ward page's ballot after the mayor (`wardBallotRaceIds`); empty on /results/. */
  ballot: string[];
  ward: string | null;
}

export interface LiveTablesViewProps {
  payload: LivePayload | null;
  wards: ResultsWard[];
}

export function LiveCountView({ payload, ballot, ward }: LiveCountViewProps) {
  const history = useLiveHistory();
  const [axis, setAxis] = useState<Axis>("clock");
  const mayor = payload?.races.find((r) => r.id === "mayor") ?? null;

  if (!payload || payload.state !== "results") {
    return (
      <section className="live-count" aria-labelledby="live-count-heading">
        <h2 id="live-count-heading">The count over the night</h2>
        <p className="live-empty">Charts of the count start once the City reports results, from 8 p.m.</p>
      </section>
    );
  }
  if (history === null || history.t.length === 0) {
    return (
      <section className="live-count" aria-labelledby="live-count-heading">
        <h2 id="live-count-heading">The count over the night</h2>
        <p className="live-empty" role="status">
          Loading the count so far…
        </p>
      </section>
    );
  }
  // A race whose count has no votes yet (or never will, in the history) has no line to draw.
  const ballotRaces = ballot.flatMap((id) =>
    payload.races.filter((r) => r.id === id && r.state !== "acclaimed" && shareRows(history, id, []).length > 0),
  );

  return (
    <section className="live-count" aria-labelledby="live-count-heading">
      <div className="live-count__head">
        <h2 id="live-count-heading">The count over the night</h2>
        <p className="live-count__note">
          From {clock(history.t[0])} to {clock(history.t[history.t.length - 1])}, as the City reported it.
        </p>
      </div>

      {ward && ballotRaces.length > 0 && (
        <div className="live-count__block">
          <div className="live-count__row">
            <h3>On the Ward {ward} ballot</h3>
            <AxisSwitch axis={axis} onChange={setAxis} />
          </div>
          <div className="live-chart-grid">
            {ballotRaces.map((race) => (
              <ChartFrame key={race.id} title={raceTitle(race)} table={<ShareTable race={race} history={history} />}>
                <ShareChart race={race} history={history} axis={axis} height={220} />
              </ChartFrame>
            ))}
          </div>
        </div>
      )}

      <div className="live-count__block">
        <h3 className="live-count__subhead">How fast the count is coming in</h3>
        <PaceCharts history={history} />
      </div>

      {mayor && history.races.mayor && (
        <div className="live-count__block">
          <div className="live-count__row">
            <h3>Mayor</h3>
            {!(ward && ballotRaces.length > 0) && <AxisSwitch axis={axis} onChange={setAxis} />}
          </div>
          <ChartFrame
            title="Share of the votes counted"
            table={<ShareTable race={mayor} history={history} />}
          >
            <ShareChart race={mayor} history={history} axis={axis} />
          </ChartFrame>
          <LeadChart race={mayor} history={history} axis={axis} />
        </div>
      )}
    </section>
  );
}

/** The Tables view (#123): the mayor ward by ward, then every race by how much is in. Both read
 *  only the payload, so they show from the first poll, with no history. */
export function LiveTablesView({ payload, wards }: LiveTablesViewProps) {
  const mayor = payload?.races.find((r) => r.id === "mayor") ?? null;
  return (
    <section className="live-count" aria-labelledby="live-tables-heading">
      <h2 id="live-tables-heading">Tables of the count</h2>
      {!payload || payload.state !== "results" ? (
        <p className="live-empty">Tables of the count start once the City reports results, from 8 p.m.</p>
      ) : (
        <>
          {mayor?.wards && <MayorWardTable mayor={mayor} wards={wards} />}
          <ReportingBoard races={payload.races} />
        </>
      )}
    </section>
  );
}
