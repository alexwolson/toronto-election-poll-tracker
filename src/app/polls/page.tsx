import { PollArchive } from "@/components/poll-archive";
import { PollingChart, type ChartSeries } from "@/components/polling-chart";
import { PollsterLink } from "@/components/pollster-link";
import { candidateMeta, candidateName } from "@/lib/candidates";
import { loadMayoralForecast, loadMayoralPolling } from "@/lib/feeds";
import { formatDate } from "@/lib/format";
import { viableField } from "@/lib/mayoral-forecast";
import { candidateTrends, pollsterRegistry } from "@/lib/polling";

export const metadata = {
  title: "Polls — Toronto 2026",
  description: "Every mayoral poll of the current field, and the raw trend.",
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
      <section className="race-hero" aria-labelledby="polls-heading">
        <p className="np-kicker">Toronto mayor · polling</p>
        <h1 id="polls-heading">The polls</h1>
        <p className="race-hero-dek">
          Every public poll of the current field, shown as individual readings.
        </p>
        {latest && (
          <p className="race-hero-meta font-mono">
            {polling.polls.length} polls on file; latest {latest.firm}, fieldwork{" "}
            {formatDate(latest.date_conducted)}.
          </p>
        )}
      </section>

      {polling.polls.length > 0 ? (
        <section aria-labelledby="trend-heading" style={{ margin: "1.5rem 0 2rem" }}>
          <div className="simple-section-heading">
            <p className="np-kicker">Trend</p>
            <h2 id="trend-heading" className="section-title">
              Reported share over time
            </h2>
          </div>
          <PollingChart trends={trends} series={series} />
        </section>
      ) : (
        <p className="forecast-unavailable">Polling data is currently unavailable.</p>
      )}

      <section aria-labelledby="archive-heading" style={{ margin: "2rem 0" }}>
        <div className="simple-section-heading">
          <p className="np-kicker">Archive</p>
          <h2 id="archive-heading" className="section-title">
            Every poll
          </h2>
        </div>
        <PollArchive polls={polling.polls} field={field} />
      </section>

      <section aria-labelledby="firms-heading" style={{ margin: "2rem 0" }}>
        <div className="simple-section-heading">
          <p className="np-kicker">Sources</p>
          <h2 id="firms-heading" className="section-title">
            Polling firms
          </h2>
        </div>
        <ul className="font-mono" style={{ fontSize: "0.78rem", listStyle: "none", padding: 0 }}>
          {registry.map((r) => (
            <li key={r.firm} style={{ padding: "0.2rem 0" }}>
              <PollsterLink firm={r.firm} /> — {r.count} {r.count === 1 ? "poll" : "polls"}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
