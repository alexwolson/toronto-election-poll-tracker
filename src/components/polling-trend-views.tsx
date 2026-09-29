"use client";

import { useState, type ReactNode } from "react";
import { PollingChart, type ChartSeries } from "./polling-chart";
import type { CandidateTrend } from "@/lib/polling";

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
  const [qualified, setQualified] = useState(false);
  const qualifiedCount = qualifiedTrends[0]?.markers.length ?? 0;

  return (
    <div>
      <div className="evidence-lenses" role="group" aria-label="Polls shown in the trend chart">
        <button type="button" aria-pressed={!qualified} onClick={() => setQualified(false)}>
          All polls
        </button>
        <button type="button" aria-pressed={qualified} onClick={() => setQualified(true)}>
          Alexander included
        </button>
      </div>
      {!qualified && allPollNote}
      {qualified && (
        <p className="evidence-explainer" role="status">
          {qualifiedCount} {qualifiedCount === 1 ? "poll reporting" : "polls reporting"} Chow,
          Bradford and Alexander.
        </p>
      )}
      {qualified && qualifiedCount === 0 ? (
        <p className="forecast-unavailable">No comparable polls report all three candidates yet.</p>
      ) : (
        <PollingChart
          trends={qualified ? qualifiedTrends : allTrends}
          series={series}
          xAxis={qualified ? "month" : "monthYear"}
        />
      )}
    </div>
  );
}
