"use client";

import { useState, type ReactNode } from "react";
import { PollingChart, pollingTrendSummaryRows, type ChartSeries } from "./polling-chart";
import { PollPeriodToggle } from "./poll-period-toggle";
import { ALL_RESPONDENT_OTHER_ID, ALL_RESPONDENT_UNDECIDED_ID, NOMINATIONS_CLOSED_DATE, type CandidateTrend } from "@/lib/polling";
import { isoDayNumber } from "@/lib/format";

const RESPONSE_SERIES: ChartSeries[] = [
  { id: ALL_RESPONDENT_OTHER_ID, name: "Other candidates combined", color: "#7A6A57", hatch: false, pointsOnly: true },
  { id: ALL_RESPONDENT_UNDECIDED_ID, name: "Undecided / don’t know", color: "#476B87", hatch: false, pointsOnly: true },
];

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
  const shownSeries = allRespondents ? [...series, ...RESPONSE_SERIES] : series;
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
          <>Shares of all respondents, including undecided voters.
            {" "}Other candidates combined includes McVie and Parker.</>
        ) : (
          <>Shares among respondents naming a candidate, including leaners.</>
        )}
      </p>
      {!qualified && !allRespondents && allPollNote}
      {qualified && (
        <p className="evidence-explainer" role="status">
          {qualifiedCount} {qualifiedCount === 1 ? "poll" : "polls"} since nominations closed.
          {" "}Lines use the full polling history.
        </p>
      )}
      {qualified && qualifiedCount === 0 ? (
        <p className="forecast-unavailable">No comparable polls since nominations closed yet.</p>
      ) : (
        <PollingChart
          trends={shownTrends}
          summary={allRespondents ? {
            intro: "Polling trend summary. Points show published support among all respondents. " +
              "Undecided people and non-voters remain in the denominator; leaners are included " +
              "where assigned. Each sample contributes one published reading. Missing candidates " +
              "are omitted, not counted as zero. Other candidates combined includes McVie, Parker, " +
              "other named candidates outside the forecast field and the reported other category. " +
              "The McVie and Parker dots are parts of that total, not additional shares. " +
              "Undecided / don’t know combines " +
              "those reported responses. Both are dots only; missing categories are omitted. " +
              "Non-voters are excluded from both groups. Candidate lines are LOESS trends, not forecasts.",
            rows: pollingTrendSummaryRows(shownTrends, shownSeries),
          } : undefined}
          series={shownSeries}
          xAxis={qualified ? "dayMonth" : "monthYear"}
          // Half a day of space keeps the latest hollow marker inside the clipping boundary.
          xDomain={qualified ? [isoDayNumber(NOMINATIONS_CLOSED_DATE) + 1, recentEnd + 0.5] : undefined}
        />
      )}
    </div>
  );
}
