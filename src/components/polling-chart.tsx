import { PollingChartLoader } from "./polling-chart-loader";
import type { CandidateTrend } from "@/lib/polling";

export interface ChartSeries {
  id: string;
  name: string;
  color: string;
  hatch: boolean;
}

const FULL_DAY_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function fullDayLabel(day: number): string {
  return FULL_DAY_FORMATTER.format(new Date(day * 86_400_000));
}

function reportedShare(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function pollingTrendSummaryRows(
  trends: CandidateTrend[],
  series: ChartSeries[],
): string[] {
  const trendsById = new Map(trends.map((trend) => [trend.id, trend]));

  return series.map((candidate) => {
    const trend = trendsById.get(candidate.id);
    if (!trend || trend.markers.length === 0) {
      return `${candidate.name}: no reported poll values are available.`;
    }

    const first = trend.markers[0];
    const latest = trend.markers[trend.markers.length - 1];
    const reports = trend.markers.length === 1
      ? `1 published poll reports ${reportedShare(latest.y)} on ${fullDayLabel(latest.x)}.`
      : `${trend.markers.length} published polls, from ${reportedShare(first.y)} on ${fullDayLabel(first.x)} to ${reportedShare(latest.y)} on ${fullDayLabel(latest.x)}.`;
    const treatment = trend.curve
      ? "A smoothed trend line is shown."
      : "Only reported points are shown because too few polls tested this candidate for a trend line.";

    return `${candidate.name}: ${reports} ${treatment}`;
  });
}

/**
 * The explanatory text is rendered with the page while the visual chart is
 * loaded near the viewport. This keeps the evidence available without making
 * the charting library part of the route's initial JavaScript.
 */
export function PollingChart({
  trends,
  series,
  yDomain,
  xAxis,
  summary,
}: {
  trends: CandidateTrend[];
  series: ChartSeries[];
  /** y-axis range in percent; defaults to the polling chart's 0–60 */
  yDomain?: [number, number];
  /** "month" ticks the first of each month with the month name, for short ranges */
  xAxis?: "monthYear" | "month";
  /** a caller's text equivalent, in place of the polling summary */
  summary?: { intro: string; rows: string[] };
}) {
  return (
    <div className="polling-chart-shell">
      <PollingChartLoader
        trends={trends}
        series={series}
        yDomain={yDomain}
        xAxis={xAxis}
      />

      <div className="sr-only">
        {summary ? (
          <>
            <p>{summary.intro}</p>
            <ul>
              {summary.rows.map((row) => <li key={row}>{row}</li>)}
            </ul>
          </>
        ) : (
          <>
            <p>
              Polling trend summary. Each point is a published poll result. Smoothed
              lines summarize the direction of those reports; they are not polling
              averages or forecasts. A candidate missing from a poll is omitted, not
              counted as zero.
            </p>
            <ul>
              {pollingTrendSummaryRows(trends, series).map((row) => <li key={row}>{row}</li>)}
            </ul>
            <p>The poll archive below contains every reported value and its source.</p>
          </>
        )}
      </div>
    </div>
  );
}
