"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { candidateColour } from "@/lib/candidate-presentation";

interface PollingChartProps {
  data: Record<string, string | number | null>[];
  candidates: string[];
  events?: { date: string; label: string }[];
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function SeriesMarker({
  candidate,
  cx = 0,
  cy = 0,
}: {
  candidate: string;
  cx?: number;
  cy?: number;
}) {
  const color = candidateColour(candidate);
  if (candidate === "bradford") {
    return <rect x={cx - 4} y={cy - 4} width={8} height={8} fill="var(--panel)" stroke={color} strokeWidth={2} />;
  }
  if (candidate === "alexander") {
    return <path d={`M ${cx} ${cy - 5} L ${cx + 5} ${cy} L ${cx} ${cy + 5} L ${cx - 5} ${cy} Z`} fill={color} stroke="#3A2500" strokeWidth={1.75} />;
  }
  return <circle cx={cx} cy={cy} r={4} fill="var(--panel)" stroke={color} strokeWidth={2} />;
}

function toPercent(value: string | number | null | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }
  return value <= 1 ? value * 100 : value;
}

export function PollingChart({ data, candidates, events = [] }: PollingChartProps) {
  const formattedData = data.map((row) => {
    const nextRow: Record<string, string | number> = {
      date: String(row.date ?? ""),
    };
    candidates.forEach((candidate) => {
      nextRow[candidate] = toPercent(row[candidate]);
    });
    return nextRow;
  });

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart
        data={formattedData}
        margin={{ top: 8, right: 12, bottom: 8, left: 0 }}
        accessibilityLayer
      >
        <CartesianGrid strokeDasharray="2 6" stroke="var(--border)" />
        <XAxis
          dataKey="date"
          padding={{ left: 16, right: 16 }}
          tickFormatter={(value) => displayDate(String(value))}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={{ stroke: "var(--border)" }}
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
            borderRadius: "12px",
            border: "1px solid var(--line-strong)",
            background: "var(--panel)",
            boxShadow: "0 14px 22px -18px rgba(31, 64, 122, 0.35)",
          }}
          formatter={(v) => typeof v === "number" ? `${v.toFixed(1)}%` : String(v)}
          labelFormatter={(label) => displayDate(String(label))}
          itemStyle={{ color: "var(--text-strong)" }}
        />
        <Legend
          wrapperStyle={{ fontSize: "0.75rem", paddingTop: "0.5rem" }}
          formatter={(value, entry) => (
            <span style={{ color: entry.dataKey === "alexander" ? "#7A5200" : "var(--text-strong)" }}>
              {value}
            </span>
          )}
        />
        {events.map((event) => (
          <ReferenceLine
            key={`${event.date}-${event.label}`}
            x={event.date}
            stroke="#F8C466"
            strokeDasharray="4 4"
            label={{
              value: event.label,
              position: "insideTopLeft",
              fill: "#8A5A00",
              fontSize: 11,
            }}
          />
        ))}
        {candidates.map((c) => (
          <Line
            key={c}
            type="monotone"
            dataKey={c}
            stroke={candidateColour(c)}
            name={c.charAt(0).toUpperCase() + c.slice(1)}
            strokeWidth={2.5}
            strokeDasharray={c === "alexander" ? "8 5" : undefined}
            dot={(props) => <SeriesMarker candidate={c} cx={props.cx} cy={props.cy} />}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
