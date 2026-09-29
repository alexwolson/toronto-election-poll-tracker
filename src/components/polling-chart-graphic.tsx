"use client";

import { memo, useMemo } from "react";
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
import type { PollingChartGraphicProps } from "./polling-chart-loader";
import { candidateName } from "@/lib/candidates";
import { monthStartDays } from "@/lib/format";
import type { CandidateTrend, TrendMarker } from "@/lib/polling";

const LEGEND_SHAPE: Record<string, "circle" | "rect" | "diamond"> = {
  chow: "circle",
  bradford: "rect",
  alexander: "diamond",
};

const MONTH_FORMATTER = new Intl.DateTimeFormat("en-CA", { month: "short", timeZone: "UTC" });
const MONTH_YEAR_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  month: "short",
  year: "2-digit",
  timeZone: "UTC",
});

const FULL_DAY_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const CHART_MARGIN = { top: 8, right: 12, bottom: 8, left: 0 } as const;

function labelForDay(day: number): string {
  return MONTH_YEAR_FORMATTER.format(new Date(day * 86_400_000));
}

function fullDayLabel(day: number): string {
  return FULL_DAY_FORMATTER.format(new Date(day * 86_400_000));
}

function marker(id: string, color: string, cx = 0, cy = 0) {
  const fill = "var(--panel)";
  if (id === "bradford") {
    return (
      <rect x={cx - 4} y={cy - 4} width={8} height={8} fill={fill} stroke={color} strokeWidth={2} />
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
  return <circle cx={cx} cy={cy} r={4} fill={fill} stroke={color} strokeWidth={2} />;
}

interface ChartDatum {
  x: number;
  details?: Record<string, TrendMarker>;
  [key: string]: number | Record<string, TrendMarker> | undefined;
}

interface TipEntry {
  dataKey?: string | number;
  value?: number;
  payload?: ChartDatum;
}

export const PollingChartTooltip = memo(function PollingChartTooltip({
  active,
  payload,
  label,
  seriesById,
}: {
  active?: boolean;
  payload?: TipEntry[];
  label?: number;
  seriesById: ReadonlyMap<string, string>;
}) {
  if (!active || !payload) return null;
  const raw = payload.filter(
    (entry) => typeof entry.dataKey === "string" && entry.dataKey.startsWith("raw_") && entry.value != null,
  );
  if (raw.length === 0) return null;
  const firstId = String(raw[0].dataKey).slice(4);
  const source = raw[0].payload?.details?.[firstId];

  return (
    <div className="polling-chart-tooltip">
      <div className="font-mono polling-chart-tooltip__date">
        {label != null ? fullDayLabel(label) : ""}
      </div>
      {source?.firm && <div>{source.firm}</div>}
      {source?.derived && <div>Derived among candidate choices</div>}
      {source?.denominator && <div>Published basis: {source.denominator}</div>}
      {raw.map((entry) => {
        const id = String(entry.dataKey).slice(4);
        const point = entry.payload?.details?.[id];
        return (
          <div key={id}>
            {seriesById.get(id) ?? candidateName(id)}: {entry.value?.toFixed(1)}%
            {point?.derived && point.reportedShare != null && (
              <> (reported {(point.reportedShare * 100).toFixed(1)}%)</>
            )}
          </div>
        );
      })}
    </div>
  );
});

function legendLabel(value: unknown) {
  return <span className="polling-chart__legend-label">{String(value)}</span>;
}

export function pollingChartRows(trends: CandidateTrend[]): ChartDatum[] {
  // Preserve separate samples sharing a fieldwork date, with their own tooltip.
  const rows = new Map<string, ChartDatum>();
  const byX = new Map<number, ChartDatum[]>();
  const row = (key: string, x: number) => {
    const existing = rows.get(key);
    if (existing) return existing;
    const created: ChartDatum = { x };
    rows.set(key, created);
    const group = byX.get(x) ?? [];
    group.push(created);
    byX.set(x, group);
    return created;
  };

  for (const trend of trends) {
    for (const point of trend.markers) {
      const datum = row(`poll:${point.x}:${point.poll_id}`, point.x);
      datum[`raw_${trend.id}`] = point.y * 100;
      datum.details ??= {};
      datum.details[trend.id] = point;
    }
  }
  for (const trend of trends) {
    for (const point of trend.curve ?? []) {
      const group = byX.get(point.x) ?? [row(`curve:${point.x}`, point.x)];
      for (const datum of group) datum[`loess_${trend.id}`] = point.y * 100;
    }
  }
  return [...rows.values()].sort((a, b) => a.x - b.x);
}

/** Visual-only Recharts layer, deferred until the chart nears the viewport. */
export const PollingChartGraphic = memo(function PollingChartGraphic({
  trends,
  series,
  yDomain = [0, 60],
  xAxis = "monthYear",
}: PollingChartGraphicProps) {
  const { data, hasCurve } = useMemo(() => {
    return {
      data: pollingChartRows(trends),
      hasCurve: new Map(trends.map((trend) => [trend.id, trend.curve !== null])),
    };
  }, [trends]);

  const seriesById = useMemo(
    () => new Map(series.map((candidate) => [candidate.id, candidate.name])),
    [series],
  );

  return (
    <ResponsiveContainer width="100%" height={380} debounce={100}>
      <LineChart accessibilityLayer={false} data={data} margin={CHART_MARGIN}>
        <CartesianGrid strokeDasharray="2 6" stroke="var(--border)" />
        <XAxis
          dataKey="x"
          type="number"
          scale="linear"
          domain={["dataMin", "dataMax"]}
          ticks={xAxis === "month" && data.length > 0 ? monthStartDays(data[0].x, data[data.length - 1].x) : undefined}
          tickFormatter={(value) =>
            xAxis === "month"
              ? MONTH_FORMATTER.format(new Date(Number(value) * 86_400_000))
              : labelForDay(Number(value))
          }
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={{ stroke: "var(--border)" }}
          minTickGap={40}
        />
        <YAxis
          domain={yDomain}
          tickFormatter={(value) => `${value}%`}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={{ stroke: "var(--border)" }}
        />
        <Tooltip content={<PollingChartTooltip seriesById={seriesById} />} />
        <Legend formatter={legendLabel} wrapperStyle={{ fontSize: "0.75rem", paddingTop: "0.5rem" }} />
        {series.flatMap((candidate) => {
          const shape = LEGEND_SHAPE[candidate.id] ?? "circle";
          const curved = hasCurve.get(candidate.id) ?? false;
          return [
            <Line
              key={`raw-${candidate.id}`}
              dataKey={`raw_${candidate.id}`}
              name={candidate.name}
              stroke={candidate.color}
              strokeWidth={0}
              legendType={curved ? "none" : shape}
              connectNulls={false}
              isAnimationActive={false}
              dot={(props) => {
                if (props.value == null || props.cx == null || props.cy == null) {
                  return <g key={`${candidate.id}-empty-${props.index}`} />;
                }
                return (
                  <g key={`${candidate.id}-dot-${props.index}`}>
                    {marker(candidate.id, candidate.color, props.cx, props.cy)}
                  </g>
                );
              }}
              activeDot={{ r: 6 }}
            />,
            ...(curved
              ? [
                  <Line
                    key={`loess-${candidate.id}`}
                    dataKey={`loess_${candidate.id}`}
                    name={candidate.name}
                    stroke={candidate.color}
                    strokeWidth={2.5}
                    strokeDasharray={candidate.hatch ? "8 5" : undefined}
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
});
