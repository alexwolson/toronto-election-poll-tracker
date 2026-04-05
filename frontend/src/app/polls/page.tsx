import { PollingChart } from "@/components/polling-chart";

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
  const data = await getPolls();
  const polls = data.polls || [];
  
  const candidatesSet = new Set<string>();
  polls.forEach((poll) => {
    Object.keys(poll.candidates || {}).forEach(c => candidatesSet.add(c));
  });
  
  const allCandidates = Array.from(candidatesSet);
  
  const chartData = polls.map((poll) => {
    const entry: Record<string, string | number> = {
      date: poll.poll_date,
    };
    allCandidates.forEach(c => {
      entry[c] = (poll.candidates?.[c] || 0) * 100;
    });
    return entry;
  }).reverse();
  
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Mayoral Polling</h1>
        
        {chartData.length > 0 ? (
          <PollingChart data={chartData} candidates={allCandidates} />
        ) : (
          <p className="text-muted-foreground">No polling data available yet.</p>
        )}
        
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Poll History</h2>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr className="border-b">
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Firm</th>
                  <th className="px-4 py-3 text-left font-medium text-right">Sample</th>
                  <th className="px-4 py-3 text-right font-medium">Leading Candidate</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {polls.map((poll, i) => {
                  const results = Object.entries(poll.candidates || {});
                  const topCandidate: [string, number] = results.length > 0 
                    ? results.reduce((a, b) => (a[1] > b[1] ? a : b))
                    : ["None", 0];
                  return (
                    <tr key={i}>
                      <td className="px-4 py-2">{poll.poll_date}</td>
                      <td className="px-4 py-2">{poll.firm}</td>
                      <td className="px-4 py-2 text-right">{poll.sample_size}</td>
                      <td className="px-4 py-2 text-right font-medium">
                        {topCandidate[0].charAt(0).toUpperCase() + topCandidate[0].slice(1)} ({(topCandidate[1] * 100).toFixed(0)}%)
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
