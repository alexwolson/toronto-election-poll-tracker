"use client";

import { useState, type ReactNode } from "react";
import { PollingChart, pollingTrendSummaryRows, type ChartSeries } from "./polling-chart";
import { PollPeriodToggle } from "./poll-period-toggle";
import { NOMINATIONS_CLOSED_DATE, type CandidateTrend } from "@/lib/polling";
import { formatDate, isoDayNumber } from "@/lib/format";

export function PollingTrendViews({
  allTrends,
  qualifiedTrends,
  series,
  allRespondentTrends = [],
  recentAllRespondentTrends = [],
  allPollNote,
}: {
  allTrends: CandidateTrend[];
  qualifiedTrends: CandidateTrend[];
  series: ChartSeries[];
  allRespondentTrends?: CandidateTrend[];
  recentAllRespondentTrends?: CandidateTrend[];
  allPollNote?: ReactNode;
}) {
  const [qualified, setQualified] = useState(true);
  const [allRespondents, setAllRespondents] = useState(false);
  const fullTrends = allRespondents ? allRespondentTrends : allTrends;
  const recentTrends = allRespondents ? recentAllRespondentTrends : qualifiedTrends;
  const shownTrends = qualified ? recentTrends : fullTrends;
  const qualifiedCount = recentTrends[0]?.markers.length ?? 0;
  const recentEnd = Math.max(...recentTrends.flatMap((trend) => trend.markers.map((marker) => marker.x)));

  return (
    <div>
      <div className="polling-view-controls">
        {allRespondentTrends.some((trend) => trend.markers.length > 0) && (
          <div className="evidence-lenses" role="group" aria-label="Polling support denominator">
            <button type="button" aria-pressed={!allRespondents} onClick={() => setAllRespondents(false)}>
              Candidate choices
            </button>
            <button type="button" aria-pressed={allRespondents} onClick={() => setAllRespondents(true)}>
              All respondents
            </button>
          </div>
        )}
        <PollPeriodToggle label="Polls shown in the trend chart" recent={qualified} onChange={setQualified} />
      </div>
      <p className="evidence-explainer">
        {allRespondents ? (
          <>Published support among all respondents, including undecided people and non-voters
            in the base. Leaners are included where the pollster assigns them.
            Only polls publishing this breakdown are shown.</>
        ) : (
          <>Support among respondents naming a candidate, including leaners where asked.
            All-respondent polls are converted to this basis; tooltips show the
            derived and published percentages.</>
        )}
      </p>
      {!qualified && !allRespondents && allPollNote}
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
          trends={shownTrends}
          summary={allRespondents ? {
            intro: "Polling trend summary. Points show published support among all respondents. " +
              "Undecided people and non-voters remain in the denominator; leaners are included " +
              "where assigned. Each sample contributes one published reading. Missing candidates " +
              "are omitted, not counted as zero. Lines are LOESS trends, not forecasts.",
            rows: pollingTrendSummaryRows(shownTrends, series),
          } : undefined}
          series={series}
          xAxis={qualified ? "dayMonth" : "monthYear"}
          // Half a day of space keeps the latest hollow marker inside the clipping boundary.
          xDomain={qualified ? [isoDayNumber(NOMINATIONS_CLOSED_DATE) + 1, recentEnd + 0.5] : undefined}
        />
      )}
    </div>
  );
}
