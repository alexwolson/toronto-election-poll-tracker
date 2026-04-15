import { PollingChart } from "@/components/polling-chart";
import { getPollingAverages } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface CandidateResult {
  [key: string]: number;
}

interface Poll {
  poll_date: string;
  firm: string;
  sample_size: number;
  candidates: CandidateResult;
}

async function getPolls(): Promise<{ polls: Poll[] }> {
  try {
    const res = await fetch(`${API_URL}/api/polls`, { next: { revalidate: 60 } });
    if (!res.ok) return { polls: [] };
    return res.json();
  } catch (err) {
    console.error("Failed to fetch polls", err);
    return { polls: [] };
  }
}

export default async function PollsPage() {
  const [pollsResponse, pollingAverages] = await Promise.all([
    getPolls(),
    getPollingAverages(),
  ]);
  const polls = pollsResponse.polls || [];
  const chartData = pollingAverages.trend;
  const chartCandidates = pollingAverages.candidates;
  const candidateStatus = pollingAverages.candidate_status;
  const candidateRanges = pollingAverages.candidate_ranges;
  const pollHistory = pollingAverages.poll_history;
  
  return (
    <main>
      <div className="civic-shell space-y-6">
        <section className="surface-panel p-6 md:p-8">
          <p className="hero-kicker">Mayoral tracker</p>
          <h1 className="mt-4 text-4xl font-heading md:text-5xl">Mayoral Polling</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Rolling trendline for major candidates plus historical poll records.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="stat-chip p-3">
              <p className="font-mono text-[0.7rem] uppercase tracking-wider text-muted-foreground">Used in model</p>
              <p className="mt-1 text-xl font-semibold">{pollingAverages.polls_used}</p>
            </div>
            <div className="stat-chip p-3">
              <p className="font-mono text-[0.7rem] uppercase tracking-wider text-muted-foreground">Total polls</p>
              <p className="mt-1 text-xl font-semibold">{pollingAverages.total_polls_available}</p>
            </div>
            <div className="stat-chip p-3">
              <p className="font-mono text-[0.7rem] uppercase tracking-wider text-muted-foreground">Excluded declined</p>
              <p className="mt-1 text-xl font-semibold">{pollingAverages.excluded_declined_polls}</p>
            </div>
          </div>
        </section>

        <section className="surface-panel p-4 md:p-6">
          {chartData.length > 0 ? (
            <PollingChart data={chartData} candidates={chartCandidates} />
          ) : (
            <p className="text-muted-foreground">No polling data available yet.</p>
          )}
        </section>

        <section className="surface-panel p-5 md:p-6">
          <h2 className="text-2xl font-heading mb-4">Candidate Status & Polling Ranges</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {(["declared", "potential", "declined"] as const).map((status) => (
              <div key={status} className="rounded-xl border border-[var(--line-soft)] bg-[color:var(--panel)] p-4">
                <h3 className="text-lg font-heading capitalize">{status}</h3>
                <div className="mt-3 space-y-3 text-sm">
                  {(candidateStatus[status] ?? []).map((candidate) => {
                    const range = candidateRanges[status]?.[candidate.id];
                    return (
                      <div key={candidate.id} className="border-b border-[var(--line-soft)] pb-2 last:border-b-0">
                        <p className="font-medium">{candidate.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{candidate.summary}</p>
                        <p className="mt-1 font-mono text-xs">
                          Poll range: {range ? `${range.min}% to ${range.max}%` : "No comparable data"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="surface-panel p-5 md:p-6">
          <h2 className="text-2xl font-heading mb-4">Poll History</h2>
          <div className="overflow-hidden rounded-xl border border-[var(--line-soft)] bg-[color:var(--panel)]">
            <table className="w-full text-sm">
              <thead className="bg-[color:var(--secondary)] text-muted-foreground">
                <tr className="border-b border-[var(--line-soft)]">
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Firm</th>
                  <th className="px-4 py-3 text-right font-medium">Sample</th>
                  <th className="px-4 py-3 text-right font-medium">Leading Candidate</th>
                  <th className="px-4 py-3 text-right font-medium">Model Use</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line-soft)]">
                {(pollHistory.length > 0 ? pollHistory : polls).map((poll, i) => {
                  const candidatesMap = ("candidates" in poll ? poll.candidates : {}) as Record<string, number>;
                  const results = Object.entries(candidatesMap);
                  const topCandidate: [string, number] = results.length > 0
                    ? results.reduce((a, b) => (a[1] > b[1] ? a : b))
                    : ["None", 0];
                  const excluded = "excluded_from_model" in poll ? poll.excluded_from_model : false;
                  const reason = "excluded_reason" in poll ? poll.excluded_reason : null;
                  return (
                    <tr key={i} className="hover:bg-[color:var(--secondary)]/60 transition-colors">
                      <td className="px-4 py-2 font-mono text-xs md:text-sm">{"date_published" in poll ? poll.date_published : poll.poll_date}</td>
                      <td className="px-4 py-2">{poll.firm}</td>
                      <td className="px-4 py-2 text-right font-mono">{poll.sample_size}</td>
                      <td className="px-4 py-2 text-right font-medium">
                        {topCandidate[0].charAt(0).toUpperCase() + topCandidate[0].slice(1)} ({(topCandidate[1] * 100).toFixed(0)}%)
                      </td>
                      <td className="px-4 py-2 text-right text-xs font-mono">
                        {excluded ? `Excluded${reason ? ` (${reason})` : ""}` : "Included"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
