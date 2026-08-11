import { PollingChart } from "@/components/polling-chart";
import { MayoralEvidence } from "@/components/mayoral-evidence";
import { MayoralForecast } from "@/components/mayoral-forecast";
import { getPollingAverages } from "@/lib/mayoral-api";
import {
  getPollBreakdown,
  humanizePollReason,
  partitionCandidateRoster,
  type CandidateSummary,
} from "@/lib/site-view-models";

const FEATURED_IDS = ["chow", "bradford", "alexander"];

function displayDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function CandidateCard({
  candidate,
  range,
  average,
  filed,
  compact = false,
}: {
  candidate: CandidateSummary;
  range: { min: number; max: number } | null | undefined;
  average?: number;
  filed?: string;
  compact?: boolean;
}) {
  const facts = [
    typeof average === "number" ? `Current-field average ${Math.round(average * 100)}%` : null,
    range ? `Tracked range ${range.min}%–${range.max}%` : null,
    filed ? `Filed ${displayDate(filed)}` : null,
  ].filter((fact): fact is string => Boolean(fact));

  return (
    <article className={`roster-card roster-card--${candidate.id}${compact ? " roster-card--compact" : ""}`}>
      <div className="roster-card-title">
        <span className={`candidate-marker candidate-marker--${candidate.id}`} aria-hidden="true" />
        <h3>{candidate.name}</h3>
        {candidate.id === "alexander" && <span className="candidate-new-tag">New field</span>}
      </div>
      {candidate.summary && <p>{candidate.summary}</p>}
      {facts.length > 0 && (
        <div className="roster-card-facts font-mono">
          {facts.map((fact) => <span key={fact}>{fact}</span>)}
        </div>
      )}
    </article>
  );
}

function CandidateNameList({ candidates }: { candidates: CandidateSummary[] }) {
  return (
    <ul className="roster-name-list" aria-label="Other declared mayoral candidates">
      {candidates.map((candidate) => (
        <li key={candidate.id}>{candidate.name}</li>
      ))}
    </ul>
  );
}

export default async function PollsPage() {
  const pollingAverages = await getPollingAverages();
  const race = pollingAverages.mayoral_race;
  const chartData = race.current_field.series;
  const chartCandidates = race.target_field;
  const candidateStatus = pollingAverages.candidate_status;
  const candidateRanges = pollingAverages.candidate_ranges;
  const pollHistory = pollingAverages.poll_history;
  const breakdown = getPollBreakdown(
    pollHistory,
    pollingAverages.total_polls_available
  );
  const roster = partitionCandidateRoster(candidateStatus, FEATURED_IDS);
  const nominationDates = new Map(
    (pollingAverages.registered_candidates?.mayors ?? []).map((candidate) => [
      `${candidate.first_name} ${candidate.last_name}`.toLowerCase(),
      candidate.date_nomination,
    ])
  );
  const chartDates = chartData.map((point) => String(point.date));
  const firstChartDate = chartDates.length > 0 ? [...chartDates].sort()[0] : null;
  const entryEvents = candidateStatus.declared.flatMap((candidate) => {
    const date = nominationDates.get(candidate.name.toLowerCase());
    return date && chartCandidates.includes(candidate.id) && (!firstChartDate || date >= firstChartDate)
      ? [{ date, label: `${candidate.name} enters` }]
      : [];
  });
  const currentFieldPollCount = breakdown.currentField;

  const stats = [
    { label: "Current-field polls", value: breakdown.currentField },
    { label: "Head-to-head polls", value: breakdown.headToHead },
    { label: "Different or obsolete fields", value: breakdown.differentField },
    ...(breakdown.other > 0 ? [{ label: "Other", value: breakdown.other }] : []),
    { label: "Total tracked", value: breakdown.total },
  ];

  return (
    <main id="main-content" className="np-shell">
      <header className="page-lead">
        <p className="np-kicker">Mayor</p>
        <h1>Polls and candidates</h1>
        <p>
          Current-field polls test the candidates running now. Other polls remain in the archive but do not enter today’s average.
        </p>
      </header>

      <section className="poll-breakdown-line" aria-labelledby="poll-breakdown-heading">
        <h2 id="poll-breakdown-heading" className="sr-only">Tracked poll breakdown</h2>
        {stats.map((stat) => <span key={stat.label}><strong>{stat.value}</strong> {stat.label}</span>)}
      </section>

      <section className="polling-takeaway" aria-labelledby="observed-evidence-heading">
        <div className="simple-section-heading">
          <p className="np-kicker">Observed evidence</p>
          <h2 id="observed-evidence-heading" className="section-title">Current picture</h2>
          <p>Switch between vote intention, head-to-head polling, and approval.</p>
        </div>
        <MayoralEvidence race={race} />
      </section>

      <details className="section-disclosure model-home">
        <summary>
          <span><strong>Election-day forecast</strong><small>Modelled projection, not a polling average</small></span>
        </summary>
        <div className="section-disclosure-body"><MayoralForecast race={race} /></div>
      </details>

      <figure className="poll-figure" aria-labelledby="poll-chart-title" aria-describedby="poll-chart-note">
        <figcaption>
          <p className="np-kicker">Trend</p>
          <h2 id="poll-chart-title">The two comparable polls</h2>
          <p id="poll-chart-note" className="chart-note font-mono">
            Poll-reported vote intention · {currentFieldPollCount} like-for-like current-field {currentFieldPollCount === 1 ? "poll" : "polls"}.
          </p>
        </figcaption>
        {chartData.length > 0 ? (
          <>
            <PollingChart data={chartData} candidates={chartCandidates} events={entryEvents} />
            <details className="data-disclosure">
              <summary>View chart data as a table</summary>
              <div className="table-scroll" tabIndex={0} aria-label="Current-field polling data table">
                <table className="np-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      {chartCandidates.map((candidate) => <th key={candidate}>{candidate}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((row) => (
                      <tr key={String(row.date)}>
                        <td>{displayDate(String(row.date))}</td>
                        {chartCandidates.map((candidate) => (
                          <td key={candidate}>{Math.round(Number(row[candidate]) * 100)}%</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        ) : (
          <p className="empty-state">No current-field polling data are available yet.</p>
        )}
      </figure>

      <details className="section-disclosure candidate-roster">
        <summary><span><strong>Candidates</strong><small>{roster.featured.length} featured · {roster.remainingDeclared.length} other declared · {roster.declined.length} declined</small></span></summary>
        <div className="section-disclosure-body">
        <div className="featured-roster-grid" aria-label="Featured current-field candidates">
          {roster.featured.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              range={candidateRanges.declared?.[candidate.id]}
              average={race.current_field.candidates[candidate.id]}
              filed={nominationDates.get(candidate.name.toLowerCase())}
            />
          ))}
        </div>

        <p className="roster-note">Polling figures appear only for candidates tested in comparable current-field polls.</p>

        {roster.remainingDeclared.length > 0 && (
          <details className="roster-disclosure">
            <summary>Other declared candidates <span>{roster.remainingDeclared.length}</span></summary>
            <CandidateNameList candidates={roster.remainingDeclared} />
          </details>
        )}

        {roster.potential.length > 0 && (
          <details className="roster-disclosure">
            <summary>Potential candidates <span>{roster.potential.length}</span></summary>
            <div className="roster-list">
              {roster.potential.map((candidate) => (
                <CandidateCard compact key={candidate.id} candidate={candidate} range={candidateRanges.potential?.[candidate.id]} />
              ))}
            </div>
          </details>
        )}

        {roster.declined.length > 0 && (
          <details className="roster-disclosure">
            <summary>Declined candidates <span>{roster.declined.length}</span></summary>
            <div className="roster-list">
              {roster.declined.map((candidate) => (
                <CandidateCard compact key={candidate.id} candidate={candidate} range={candidateRanges.declined?.[candidate.id]} />
              ))}
            </div>
          </details>
        )}
        </div>
      </details>

      <details className="section-disclosure poll-history">
        <summary><span><strong>Poll archive</strong><small>All {pollHistory.length} tracked polls and how each is used</small></span></summary>
        <div className="section-disclosure-body">
        <p className="section-dek">
          Excluded polls remain here because they show how the race and possible candidate fields have changed, even when they are not comparable with today’s field.
        </p>
        <div className="table-scroll" tabIndex={0} aria-label="Complete poll history table">
          <table className="np-table">
            <caption>Every tracked mayoral poll and how it is used</caption>
            <thead>
              <tr>
                <th>Date</th>
                <th>Firm</th>
                <th>Sample</th>
                <th>Leader</th>
                <th>Use</th>
              </tr>
            </thead>
            <tbody>
              {pollHistory.map((poll, index) => {
                const results = Object.entries(poll.candidates ?? {});
                const topCandidate: [string, number] = results.length > 0
                  ? results.reduce((a, b) => (a[1] > b[1] ? a : b))
                  : ["None", 0];
                const date = poll.date_published;

                return (
                  <tr key={poll.poll_id || `${poll.firm}-${date}-${index}`}>
                    <td className="font-mono">{displayDate(date)}</td>
                    <td>{poll.firm}</td>
                    <td className="font-mono">{poll.sample_size}</td>
                    <td>{topCandidate[0].charAt(0).toUpperCase() + topCandidate[0].slice(1)} ({Math.round(topCandidate[1] * 100)}%)</td>
                    <td className="font-mono">{humanizePollReason(poll.use)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </div>
      </details>
    </main>
  );
}
