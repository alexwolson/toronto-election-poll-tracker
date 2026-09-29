"use client";

import { useState } from "react";
import { PollingChart, type ChartSeries } from "./polling-chart";
import { PollPeriodToggle } from "./poll-period-toggle";
import { NOMINATIONS_CLOSED_DATE, type CandidateTrend } from "@/lib/polling";
import { formatDate, isoDayNumber } from "@/lib/format";

const SUMMARY_INTRO = "Forecast history summary. Each point is each candidate's chance of winning after a poll release, recomputed with the current model. Smoothed lines summarize the direction of those points; the forecast itself changes only when a poll is published.";

export function ForecastHistoryViews({
  allTrends,
  recentTrends,
  series,
  allSummaryRows,
  recentSummaryRows,
}: {
  allTrends: CandidateTrend[];
  recentTrends: CandidateTrend[];
  series: ChartSeries[];
  allSummaryRows: string[];
  recentSummaryRows: string[];
}) {
  const [recent, setRecent] = useState(true);
  const count = recentTrends[0]?.markers.length ?? 0;
  const recentEnd = Math.max(...recentTrends.flatMap((trend) => trend.markers.map((marker) => marker.x)));

  return (
    <div>
      <PollPeriodToggle label="Poll releases shown in the forecast history chart" recent={recent} onChange={setRecent} />
      {recent && (
        <p className="evidence-explainer" role="status">
          {count} {count === 1 ? "poll release" : "poll releases"} published after{" "}
          {formatDate(NOMINATIONS_CLOSED_DATE)}. Trend lines use the full forecast history.
        </p>
      )}
      {recent && count === 0 ? (
        <p className="forecast-unavailable">No forecast updates since nominations closed yet.</p>
      ) : (
        <PollingChart
          trends={recent ? recentTrends : allTrends}
          series={series}
          yDomain={[0, 100]}
          xAxis={recent ? "dayMonth" : "month"}
          xDomain={recent ? [isoDayNumber(NOMINATIONS_CLOSED_DATE) + 1, recentEnd + 0.5] : undefined}
          summary={{ intro: SUMMARY_INTRO, rows: recent ? recentSummaryRows : allSummaryRows }}
        />
      )}
    </div>
  );
}
