"use client";

import { useState, type ReactNode } from "react";
import { PollingChart, type ChartSeries } from "./polling-chart";
import { NOMINATIONS_CLOSED_DATE, type CandidateTrend } from "@/lib/polling";
import { formatDate, isoDayNumber } from "@/lib/format";

export function PollingTrendViews({
  allTrends,
  qualifiedTrends,
  series,
  allPollNote,
}: {
  allTrends: CandidateTrend[];
  qualifiedTrends: CandidateTrend[];
  series: ChartSeries[];
  allPollNote?: ReactNode;
}) {
  const [qualified, setQualified] = useState(true);
  const qualifiedCount = qualifiedTrends[0]?.markers.length ?? 0;
  const recentEnd = Math.max(...qualifiedTrends.flatMap((trend) => trend.markers.map((marker) => marker.x)));

  return (
    <div>
      <div className="evidence-lenses" role="group" aria-label="Polls shown in the trend chart">
        <button type="button" aria-pressed={!qualified} onClick={() => setQualified(false)}>
          All polls
        </button>
        <button type="button" aria-pressed={qualified} onClick={() => setQualified(true)}>
          Since nominations closed
        </button>
      </div>
      {!qualified && allPollNote}
      {qualified && (
        <p className="evidence-explainer" role="status">
          {qualifiedCount} {qualifiedCount === 1 ? "poll completed" : "polls completed"} after{" "}
          {formatDate(NOMINATIONS_CLOSED_DATE)}, reporting Chow, Bradford and Alexander.
          {" "}Trend lines use the full polling history.
        </p>
      )}
      {qualified && qualifiedCount === 0 ? (
        <p className="forecast-unavailable">No comparable three-candidate polls since nominations closed yet.</p>
      ) : (
        <PollingChart
          trends={qualified ? qualifiedTrends : allTrends}
          series={series}
          xAxis={qualified ? "dayMonth" : "monthYear"}
          // Half a day of space keeps the latest hollow marker inside the clipping boundary.
          xDomain={qualified ? [isoDayNumber(NOMINATIONS_CLOSED_DATE) + 1, recentEnd + 0.5] : undefined}
        />
      )}
    </div>
  );
}
