import { PollingChartLoader } from "./polling-chart-loader";
import type { CandidateTrend } from "@/lib/polling";

export interface ChartSeries {
  id: string;
  name: string;
  color: string;
  hatch: boolean;
  /** Observations displayed without a trend line, including sparsely polled candidates. */
  pointsOnly?: boolean;
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

function chartShare(value: number): string {
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
      return `${candidate.name}: no comparable poll values are available.`;
    }

    const first = trend.markers[0];
    const latest = trend.markers[trend.markers.length - 1];
    const reports = trend.markers.length === 1
      ? `1 poll shown at ${chartShare(latest.y)} on ${fullDayLabel(latest.x)}.`
      : `${trend.markers.length} polls shown, from ${chartShare(first.y)} on ${fullDayLabel(first.x)} to ${chartShare(latest.y)} on ${fullDayLabel(latest.x)}.`;
    const derived = trend.markers.filter((marker) => marker.derived);
    const derivation = derived.length > 0
      ? ` ${derived.length} chart ${derived.length === 1 ? "point is" : "points are"} derived from all-respondent shares; original figures remain in the archive.`
      : "";
    const treatment = candidate.pointsOnly
      ? "Only reported points are shown, without a trend line."
      : trend.curve
      ? "A smoothed trend line is shown."
      : "Only points are shown because too few comparable polls tested this candidate for a trend line.";

    return `${candidate.name}: ${reports} ${treatment}${derivation}`;
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
  xDomain,
  xAxis,
  summary,
}: {
  trends: CandidateTrend[];
  series: ChartSeries[];
  /** y-axis range in percent; defaults to the polling chart's 0–60 */
  yDomain?: [number, number];
  /** Clip the full-history curve to a displayed date window, without refitting. */
  xDomain?: [number, number];
  /** "month" ticks month starts; "dayMonth" labels dates within a short range. */
  xAxis?: "monthYear" | "month" | "dayMonth";
  /** a caller's text equivalent, in place of the polling summary */
  summary?: { intro: string; rows: string[] };
}) {
  return (
    <div className="polling-chart-shell">
      <PollingChartLoader
        trends={trends}
        series={series}
        yDomain={yDomain}
        xDomain={xDomain}
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
              Polling trend summary. Points show support among respondents naming a
              candidate, including leaners where asked. All-respondent readings are
              converted to this basis across all reported candidate choices. Smoothed
              lines summarize these comparable shares; they are not polling averages
              or forecasts. A candidate missing from a poll is omitted, not counted as zero.
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
