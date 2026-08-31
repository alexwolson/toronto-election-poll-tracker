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

const LEGEND_SHAPE: Record<string, "circle" | "rect" | "diamond"> = {
  chow: "circle",
  bradford: "rect",
  alexander: "diamond",
};

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
}

const RawTooltip = memo(function RawTooltip({
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

  return (
    <div className="polling-chart-tooltip">
      <div className="font-mono polling-chart-tooltip__date">
        {label != null ? fullDayLabel(label) : ""}
      </div>
      {raw.map((entry) => {
        const id = String(entry.dataKey).slice(4);
        return (
          <div key={id}>
            {seriesById.get(id) ?? candidateName(id)}: {(entry.value as number).toFixed(1)}%
          </div>
        );
      })}
    </div>
  );
});

function legendLabel(value: unknown) {
  return <span className="polling-chart__legend-label">{String(value)}</span>;
}

/** Visual-only Recharts layer, deferred until the chart nears the viewport. */
export const PollingChartGraphic = memo(function PollingChartGraphic({
  trends,
  series,
}: PollingChartGraphicProps) {
  const { data, hasCurve } = useMemo(() => {
    const byX = new Map<number, Record<string, number>>();
    const row = (x: number) => {
      const existing = byX.get(x);
      if (existing) return existing;
      const created: Record<string, number> = { x };
      byX.set(x, created);
      return created;
    };

    for (const trend of trends) {
      for (const point of trend.markers) row(point.x)[`raw_${trend.id}`] = point.y * 100;
      if (trend.curve) {
        for (const point of trend.curve) row(point.x)[`loess_${trend.id}`] = point.y * 100;
      }
    }

    return {
      data: [...byX.values()].sort((a, b) => a.x - b.x),
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
          tickFormatter={(value) => labelForDay(Number(value))}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={{ stroke: "var(--border)" }}
          minTickGap={40}
        />
        <YAxis
          domain={[0, 60]}
          tickFormatter={(value) => `${value}%`}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={{ stroke: "var(--border)" }}
        />
        <Tooltip content={<RawTooltip seriesById={seriesById} />} />
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
