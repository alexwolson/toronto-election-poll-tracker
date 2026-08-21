"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { candidateName } from "@/lib/candidates";
import type { CandidateTrend } from "@/lib/polling";

export interface ChartSeries {
  id: string;
  name: string;
  color: string;
  hatch: boolean;
}

const LEGEND_SHAPE: Record<string, "circle" | "rect" | "diamond"> = {
  chow: "circle",
  bradford: "rect",
  alexander: "diamond",
};

function labelForDay(day: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(new Date(day * 86_400_000));
}

function fullDayLabel(day: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(day * 86_400_000));
}

function marker(id: string, color: string, cx = 0, cy = 0) {
  if (id === "bradford") {
    return (
      <rect x={cx - 4} y={cy - 4} width={8} height={8} fill="var(--panel)" stroke={color} strokeWidth={2} />
    );
  }
  if (id === "alexander") {
    return (
      <path
        d={`M ${cx} ${cy - 5} L ${cx + 5} ${cy} L ${cx} ${cy + 5} L ${cx - 5} ${cy} Z`}
        fill={color}
        stroke="#3A2500"
        strokeWidth={1.75}
      />
    );
  }
  return <circle cx={cx} cy={cy} r={4} fill="var(--panel)" stroke={color} strokeWidth={2} />;
}

interface TipEntry {
  dataKey?: string | number;
  value?: number;
  color?: string;
}

/** Tooltip shows the individual reported poll values (the raw markers), never the
 *  smoother — so the numbers are always real polls. */
function RawTooltip({
  active,
  payload,
  label,
  series,
}: {
  active?: boolean;
  payload?: TipEntry[];
  label?: number;
  series: ChartSeries[];
}) {
  if (!active || !payload) return null;
  const raw = payload.filter(
    (e) => typeof e.dataKey === "string" && e.dataKey.startsWith("raw_") && e.value != null,
  );
  if (raw.length === 0) return null;
  return (
    <div style={{ border: "1px solid var(--line-strong)", background: "var(--panel)", padding: "0.4rem 0.55rem", fontSize: "0.75rem" }}>
      <div className="font-mono" style={{ color: "var(--text-faint)", marginBottom: "0.2rem" }}>
        {label != null ? fullDayLabel(label) : ""}
      </div>
      {raw.map((e) => {
        const id = String(e.dataKey).slice(4);
        const s = series.find((c) => c.id === id);
        return (
          <div key={id} style={{ color: "var(--text-strong)" }}>
            {s?.name ?? candidateName(id)}: {(e.value as number).toFixed(1)}%
          </div>
        );
      })}
    </div>
  );
}

/**
 * Raw poll trend (spec §Chart, ticket polling-loess-trend). Every poll stays a
 * raw marker; the trend is a per-candidate LOESS smoother (not a polling average,
 * not the forecast). Candidates without enough polls show markers only, no curve.
 */
export function PollingChart({
  trends,
  series,
}: {
  trends: CandidateTrend[];
  series: ChartSeries[];
}) {
  // Merge markers (raw_) and curve points (loess_) onto one numeric time axis.
  const byX = new Map<number, Record<string, number>>();
  const row = (x: number) => {
    const existing = byX.get(x);
    if (existing) return existing;
    const created: Record<string, number> = { x };
    byX.set(x, created);
    return created;
  };
  for (const t of trends) {
    for (const m of t.markers) row(m.x)[`raw_${t.id}`] = m.y * 100;
    if (t.curve) for (const c of t.curve) row(c.x)[`loess_${t.id}`] = c.y * 100;
  }
  const data = [...byX.values()].sort((a, b) => a.x - b.x);
  const hasCurve = new Map(trends.map((t) => [t.id, t.curve !== null]));

  return (
    <ResponsiveContainer width="100%" height={380}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }} accessibilityLayer>
        <CartesianGrid strokeDasharray="2 6" stroke="var(--border)" />
        <XAxis
          dataKey="x"
          type="number"
          scale="linear"
          domain={["dataMin", "dataMax"]}
          tickFormatter={(x) => labelForDay(Number(x))}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={{ stroke: "var(--border)" }}
          minTickGap={40}
        />
        <YAxis
          domain={[0, 60]}
          tickFormatter={(v) => `${v}%`}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={{ stroke: "var(--border)" }}
        />
        <Tooltip content={<RawTooltip series={series} />} />
        <Legend wrapperStyle={{ fontSize: "0.75rem", paddingTop: "0.5rem" }} />
        {series.flatMap((s) => {
          const shape = LEGEND_SHAPE[s.id] ?? "circle";
          const curved = hasCurve.get(s.id) ?? false;
          return [
            // Raw markers: no visible connecting line (width 0), just the dots.
            <Line
              key={`raw-${s.id}`}
              dataKey={`raw_${s.id}`}
              name={s.name}
              stroke={s.color}
              strokeWidth={0}
              legendType={curved ? "none" : shape}
              connectNulls={false}
              isAnimationActive={false}
              dot={(props) => {
                if (props.value == null || props.cy == null) {
                  return <g key={`${s.id}-empty-${props.index}`} />;
                }
                return <g key={`${s.id}-dot-${props.index}`}>{marker(s.id, s.color, props.cx, props.cy)}</g>;
              }}
              activeDot={{ r: 6 }}
            />,
            // LOESS smoother: a line, no dots.
            ...(curved
              ? [
                  <Line
                    key={`loess-${s.id}`}
                    dataKey={`loess_${s.id}`}
                    name={s.name}
                    stroke={s.color}
                    strokeWidth={2.5}
                    strokeDasharray={s.hatch ? "8 5" : undefined}
                    legendType={shape}
                    type="monotone"
                    connectNulls
                    dot={false}
                    isAnimationActive={false}
                  />,
                ]
              : []),
          ];
        })}
      </LineChart>
    </ResponsiveContainer>
  );
}
