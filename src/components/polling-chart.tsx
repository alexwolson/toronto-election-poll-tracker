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
import type { PollRow } from "@/lib/polling";

export interface ChartSeries {
  id: string;
  name: string;
  color: string;
  hatch: boolean;
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "2-digit",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
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

/**
 * Raw poll trend (spec §Chart). One point per poll, shares as percent, no
 * modelled average. Missing (not field-tested) points are gaps, not zeros.
 */
export function PollingChart({
  rows,
  series,
}: {
  rows: PollRow[];
  series: ChartSeries[];
}) {
  const data = rows.map((row) => {
    const next: Record<string, string | number | null> = { date: String(row.date) };
    for (const s of series) {
      const value = row[s.id];
      next[s.id] = typeof value === "number" ? value * 100 : null;
    }
    return next;
  });

  return (
    <ResponsiveContainer width="100%" height={380}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }} accessibilityLayer>
        <CartesianGrid strokeDasharray="2 6" stroke="var(--border)" />
        <XAxis
          dataKey="date"
          padding={{ left: 16, right: 16 }}
          tickFormatter={(value) => displayDate(String(value))}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={{ stroke: "var(--border)" }}
          minTickGap={24}
        />
        <YAxis
          domain={[0, 60]}
          tickFormatter={(v) => `${v}%`}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={{ stroke: "var(--border)" }}
        />
        <Tooltip
          contentStyle={{
            border: "1px solid var(--line-strong)",
            background: "var(--panel)",
          }}
          formatter={(v) => (typeof v === "number" ? `${v.toFixed(1)}%` : String(v))}
          labelFormatter={(label) => displayDate(String(label))}
          itemStyle={{ color: "var(--text-strong)" }}
        />
        <Legend wrapperStyle={{ fontSize: "0.75rem", paddingTop: "0.5rem" }} />
        {series.map((s) => (
          <Line
            key={s.id}
            type="monotone"
            dataKey={s.id}
            name={s.name}
            stroke={s.color}
            strokeWidth={2.5}
            strokeDasharray={s.hatch ? "8 5" : undefined}
            connectNulls
            dot={(props) => {
              // recharts still calls the custom dot for null points (cy undefined);
              // don't render a marker where the candidate wasn't tested.
              if (props.value == null || props.cy == null) {
                return <g key={`${s.id}-empty-${props.index}`} />;
              }
              return <g key={`${s.id}-${props.index}`}>{marker(s.id, s.color, props.cx, props.cy)}</g>;
            }}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
