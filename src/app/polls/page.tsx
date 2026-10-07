import { ContentSection } from "@/components/content-section";
import { MayorTabs } from "@/components/mayor-tabs";
import { PageHero } from "@/components/page-hero";
import { PollArchive } from "@/components/poll-archive";
import type { ChartSeries } from "@/components/polling-chart";
import { ForecastHistoryViews } from "@/components/forecast-history-views";
import { PollingTrendViews } from "@/components/polling-trend-views";
import { PollsterLink } from "@/components/pollster-link";
import { PollingScopeNote } from "@/components/polling-scope-note";
import { SectionHeading } from "@/components/section-heading";
import { candidateMeta, candidateName } from "@/lib/candidates";
import { loadMayoralForecast, loadMayoralPolling } from "@/lib/feeds";
import { formatDate, isoDayNumber } from "@/lib/format";
import { forecastHistorySummaryRows, forecastHistoryTrends, remainingField, viableField } from "@/lib/mayoral-forecast";
import { allRespondentTrends, candidateChoiceShares, candidateTrends, candidateTrendsForPolls, latestPoll, NOMINATIONS_CLOSED_DATE, pollsByFieldwork, pollsSinceNominationsClosed, pollsterRegistry } from "@/lib/polling";

export const metadata = {
  title: "Polls — Toronto 2026",
  description: "Every public mayoral poll, with candidate-choice and all-respondent trends.",
};

export default async function PollsPage() {
  const [forecast, polling] = await Promise.all([
    loadMayoralForecast(),
    loadMayoralPolling(),
  ]);

  const forecastField = viableField(forecast);
  // The default view needs only the candidates still campaigning (Chow and Bradford
  // after Oct. 6); a pre-exit poll that also reports Alexander still qualifies.
  const campaigningField = remainingField(forecast);
  const minorField = (forecast.election_day?.residual_pool.named_in_polls ?? [])
    .map((candidate) => candidate.candidate_id);
  const field = [...new Set([...forecastField, ...minorField])];
  const trends = candidateTrends(polling, field);
  const qualifiedTrends = candidateTrendsForPolls(
    trends, pollsSinceNominationsClosed(polling, campaigningField),
  );
  const allRespondents = allRespondentTrends(polling, field, forecastField);
  const recentAllRespondents = candidateTrendsForPolls(allRespondents,
    pollsSinceNominationsClosed({ ...polling, polls: polling.all_respondents ?? [] }, campaigningField),
  );
  const excluded = polling.polls.filter((poll) => candidateChoiceShares(poll) === null);
  const series: ChartSeries[] = field.map((id) => {
    const meta = candidateMeta(id);
    // recharts renders SVG in the DOM, so the palette CSS variable resolves.
    return { id, name: candidateName(id), color: meta.colorVar, hatch: meta.hatch,
      pointsOnly: !forecastField.includes(id) };
  });
  const historySeries = series.filter((candidate) => forecastField.includes(candidate.id));
  const registry = pollsterRegistry(polling);
  const historyTrends = forecastHistoryTrends(forecast, forecastField);
  // History is positioned by publication date; retain the original full-history curves.
  const recentHistoryTrends = historyTrends?.map((trend) => ({
    ...trend,
    markers: trend.markers.filter((marker) => marker.x > isoDayNumber(NOMINATIONS_CLOSED_DATE)),
  })) ?? [];
  const recentForecast = {
    ...forecast,
    history: forecast.history?.filter((point) => point.date > NOMINATIONS_CLOSED_DATE),
  };
  const latest = latestPoll(polling);

  return (
    <main id="main-content" className="np-shell">
      <PageHero
        headingId="polls-heading"
        title="The polls"
        description="Public mayoral polls tracked by this site, preserving which candidates and responses each firm reported."
        meta={
          latest ? (
            <>
              {polling.polls.length} public polls; latest from {latest.firm}, conducted{" "}
              {formatDate(latest.date_conducted)}.
            </>
          ) : undefined
        }
      />

      <MayorTabs activeTab="polls" />

      {polling.polls.length > 0 ? (
        <>
          <ContentSection className="page-section page-section--lead" aria-labelledby="trend-heading">
            <SectionHeading headingId="trend-heading" title="Polling support over time">
              <PollingScopeNote />
            </SectionHeading>
            <PollingTrendViews
              allTrends={trends}
              qualifiedTrends={qualifiedTrends}
              allRespondentTrends={allRespondents}
              recentAllRespondentTrends={recentAllRespondents}
              series={series}
              allPollNote={excluded.length > 0 && (
                <p className="evidence-explainer">
                  {excluded.length} {excluded.length === 1 ? "poll is" : "polls are"} excluded
                  from this chart because the denominator or complete response breakdown is
                  unavailable: {excluded.map((poll) => `${poll.firm} (${formatDate(poll.date_conducted)})`).join("; ")}.
                  {" "}Original figures remain in the <a href="#archive-heading">poll archive</a>.
                </p>
              )}
            />
          </ContentSection>

          {historyTrends && (
            <ContentSection className="page-section" aria-labelledby="forecast-history-heading">
              <SectionHeading
                headingId="forecast-history-heading"
                title="How the forecast has moved with each poll"
              >
                <p>
                  Each candidate&apos;s chance of winning as it would have stood the day each poll
                  was published, recomputed with the current model. It is not a record of what this
                  site showed at the time. Polls are placed by publication date, since a poll can
                  only move the forecast once it is out. As in the chart above, the line is a
                  smoothed trend through the points.
                </p>
              </SectionHeading>
              <ForecastHistoryViews
                allTrends={historyTrends}
                recentTrends={recentHistoryTrends}
                series={historySeries}
                allSummaryRows={forecastHistorySummaryRows(forecast, historySeries)}
                recentSummaryRows={forecastHistorySummaryRows(recentForecast, historySeries)}
              />
            </ContentSection>
          )}

          <ContentSection className="page-section" aria-labelledby="archive-heading">
            <SectionHeading headingId="archive-heading" title="Poll archive">
              <p>
                “Other reported choices” totals only responses the poll lists outside the forecast
                candidate columns; a dash means none is supplied. This feed does not include question
                wording or respondent base.
              </p>
            </SectionHeading>
            <PollArchive
              polls={pollsByFieldwork(polling)}
              headToHead={polling.head_to_head}
              field={forecastField}
            />
          </ContentSection>

          <ContentSection className="page-section" aria-labelledby="firms-heading">
            <SectionHeading headingId="firms-heading" title="Pollsters in the archive" />
            <ul className="compact-source-list font-mono">
              {registry.map((r) => (
                <li key={r.firm}>
                  <PollsterLink firm={r.firm} /> — {r.count} {r.count === 1 ? "poll" : "polls"}
                </li>
              ))}
            </ul>
          </ContentSection>
        </>
      ) : (
        <p className="forecast-unavailable">No public mayoral polls are available yet.</p>
      )}
    </main>
  );
}
