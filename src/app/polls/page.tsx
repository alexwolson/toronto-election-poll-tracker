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
  } catch {
    return { polls: [] };
  }
}

const SERIF: React.CSSProperties = {
  fontFamily: "var(--font-newsreader), serif",
};

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
  const nominationDates = new Map(
    (pollingAverages.registered_candidates?.mayors ?? []).map((c) => [
      `${c.first_name} ${c.last_name}`.toLowerCase(),
      c.date_nomination,
    ])
  );

  return (
    <main className="np-shell">
      {/* Section header */}
      <div className="np-kicker" style={{ marginBottom: "0.3rem" }}>
        Mayoral tracker
      </div>
      <h1
        style={{
          ...SERIF,
          fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
          fontWeight: 700,
          margin: "0 0 0.5rem 0",
          letterSpacing: "-0.01em",
          color: "var(--text-strong)",
        }}
      >
        Mayoral Polling
      </h1>
      <hr className="np-rule" style={{ marginBottom: "0" }} />

      {/* Stats row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          border: "1px solid var(--line-soft)",
          borderTop: "none",
          marginBottom: "2rem",
        }}
      >
        {[
          { label: "Used in model", value: pollingAverages.polls_used },
          { label: "Total polls", value: pollingAverages.total_polls_available },
          { label: "Excluded declined", value: pollingAverages.excluded_declined_polls },
        ].map((stat, i) => (
          <div
            key={stat.label}
            style={{
              padding: "0.75rem 1rem",
              borderRight: i < 2 ? "1px solid var(--line-soft)" : "none",
            }}
          >
            <div className="np-kicker" style={{ marginBottom: "0.3rem" }}>
              {stat.label}
            </div>
            <div
              style={{
                ...SERIF,
                fontSize: "1.6rem",
                fontWeight: 700,
                color: "var(--text-strong)",
                lineHeight: 1,
              }}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Polling chart */}
      <div
        style={{
          border: "1px solid var(--line-soft)",
          padding: "1rem",
          marginBottom: "2rem",
        }}
      >
        {chartData.length > 0 ? (
          <PollingChart data={chartData} candidates={chartCandidates} />
        ) : (
          <p className="font-mono" style={{ fontSize: "0.65rem", color: "var(--text-soft)" }}>
            No polling data available yet.
          </p>
        )}
      </div>

      {/* Candidate status */}
      <div style={{ marginBottom: "2rem" }}>
        <div className="np-kicker" style={{ marginBottom: "0.4rem" }}>
          Candidate status &amp; polling ranges
        </div>
        <hr className="np-rule" />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            border: "1px solid var(--line-soft)",
            borderTop: "none",
          }}
        >
          {(["declared", "potential", "declined"] as const).map(
            (status, i) => (
              <div
                key={status}
                style={{
                  borderRight: i < 2 ? "1px solid var(--line-soft)" : "none",
                  padding: "0.75rem 1rem",
                }}
              >
                <div
                  className="np-kicker"
                  style={{ marginBottom: "0.75rem", textTransform: "capitalize" }}
                >
                  {status}
                </div>
                {(candidateStatus[status] ?? []).map((candidate, j, arr) => {
                  const range = candidateRanges[status]?.[candidate.id];
                  return (
                    <div
                      key={candidate.id}
                      style={{
                        paddingBottom: "0.65rem",
                        marginBottom: "0.65rem",
                        borderBottom:
                          j < arr.length - 1 ? "1px solid var(--track-bg)" : "none",
                      }}
                    >
                      <div
                        style={{
                          ...SERIF,
                          fontSize: "0.9rem",
                          fontWeight: 600,
                          color: "var(--text-strong)",
                          marginBottom: "0.2rem",
                        }}
                      >
                        {candidate.name}
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-mid)",
                          marginBottom: "0.25rem",
                          lineHeight: 1.4,
                        }}
                      >
                        {candidate.summary}
                      </div>
                      <div className="font-mono" style={{ fontSize: "0.62rem", color: "var(--text-mid)" }}>
                        {range
                          ? `${range.min}% – ${range.max}%`
                          : "No comparable data"}
                      </div>
                      {status === "declared" && (() => {
                        const date = nominationDates.get(candidate.name.toLowerCase());
                        return date ? (
                          <div className="font-mono" style={{ fontSize: "0.62rem", color: "var(--text-faint)", marginTop: "0.1rem" }}>
                            Filed {date}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>

      {/* Poll history */}
      <div>
        <div className="np-kicker" style={{ marginBottom: "0.4rem" }}>
          Poll history
        </div>
        <hr className="np-rule" />
        <div style={{ border: "1px solid var(--line-soft)", borderTop: "none", overflowX: "auto" }}>
          <table className="np-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Firm</th>
                <th style={{ textAlign: "right" }}>Sample</th>
                <th style={{ textAlign: "right" }}>Leading candidate</th>
                <th style={{ textAlign: "right" }}>Model use</th>
              </tr>
            </thead>
            <tbody>
              {(pollHistory.length > 0 ? pollHistory : polls).map(
                (poll, i) => {
                  const candidatesMap = (
                    "candidates" in poll ? poll.candidates : {}
                  ) as Record<string, number>;
                  const results = Object.entries(candidatesMap);
                  const topCandidate: [string, number] =
                    results.length > 0
                      ? results.reduce((a, b) => (a[1] > b[1] ? a : b))
                      : ["None", 0];
                  const excluded =
                    "excluded_from_model" in poll
                      ? poll.excluded_from_model
                      : false;
                  const reason =
                    "excluded_reason" in poll ? poll.excluded_reason : null;

                  return (
                    <tr key={i}>
                      <td className="font-mono">
                        {"date_published" in poll
                          ? poll.date_published
                          : poll.poll_date}
                      </td>
                      <td>{poll.firm}</td>
                      <td className="font-mono" style={{ textAlign: "right" }}>
                        {poll.sample_size}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>
                        {topCandidate[0].charAt(0).toUpperCase() +
                          topCandidate[0].slice(1)}{" "}
                        ({(topCandidate[1] * 100).toFixed(0)}%)
                      </td>
                      <td className="font-mono" style={{ textAlign: "right", fontSize: "0.65rem", color: excluded ? "var(--vuln-high-fg)" : "var(--vuln-low-line-hover)" }}>
                        {excluded
                          ? `Excluded${reason ? ` (${reason})` : ""}`
                          : "Included"}
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
