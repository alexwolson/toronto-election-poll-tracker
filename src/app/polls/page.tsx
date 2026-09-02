import { MayorTabs } from "@/components/mayor-tabs";
import { PageHero } from "@/components/page-hero";
import { PollArchive } from "@/components/poll-archive";
import { PollingChart, type ChartSeries } from "@/components/polling-chart";
import { PollsterLink } from "@/components/pollster-link";
import { PollingScopeNote } from "@/components/polling-scope-note";
import { SectionHeading } from "@/components/section-heading";
import { candidateMeta, candidateName } from "@/lib/candidates";
import { loadMayoralForecast, loadMayoralPolling } from "@/lib/feeds";
import { formatDate } from "@/lib/format";
import { viableField } from "@/lib/mayoral-forecast";
import { candidateTrends, pollsterRegistry } from "@/lib/polling";

export const metadata = {
  title: "Polls — Toronto 2026",
  description: "Every public mayoral poll and the reported trend.",
};

export default async function PollsPage() {
  const [forecast, polling] = await Promise.all([
    loadMayoralForecast(),
    loadMayoralPolling(),
  ]);

  const field = viableField(forecast);
  const trends = candidateTrends(polling, field);
  const series: ChartSeries[] = field.map((id) => {
    const meta = candidateMeta(id);
    // recharts renders SVG in the DOM, so the palette CSS variable resolves.
    return { id, name: candidateName(id), color: meta.colorVar, hatch: meta.hatch };
  });
  const registry = pollsterRegistry(polling);
  const latest = polling.latest;

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
          <section className="page-section page-section--lead" aria-labelledby="trend-heading">
            <SectionHeading headingId="trend-heading" title="Polling support over time">
              <PollingScopeNote />
            </SectionHeading>
            <PollingChart trends={trends} series={series} />
          </section>

          <section className="page-section" aria-labelledby="archive-heading">
            <SectionHeading headingId="archive-heading" title="Poll archive">
              <p>
                “Other reported choices” totals only responses the poll lists outside the forecast
                candidate columns; a dash means none is supplied. This feed does not include question
                wording or respondent base.
              </p>
            </SectionHeading>
            <PollArchive polls={polling.polls} field={field} />
          </section>

          <section className="page-section" aria-labelledby="firms-heading">
            <SectionHeading headingId="firms-heading" title="Pollsters in the archive" />
            <ul className="compact-source-list font-mono">
              {registry.map((r) => (
                <li key={r.firm}>
                  <PollsterLink firm={r.firm} /> — {r.count} {r.count === 1 ? "poll" : "polls"}
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        <p className="forecast-unavailable">No public mayoral polls are available yet.</p>
      )}
    </main>
  );
}
