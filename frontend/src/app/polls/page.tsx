import { PollingChart } from "@/components/polling-chart";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function getPolls() {
  try {
    const res = await fetch(`${API_URL}/api/polls`, { next: { revalidate: 60 } });
    if (!res.ok) return { polls: [] };
    return res.json();
  } catch (error) {
    console.error("Failed to fetch polls:", error);
    return { polls: [] };
  }
}

export default async function PollsPage() {
  const data = await getPolls();
  const polls = data.polls || [];
  
  // Transform polls for chart
  const chartData = polls.map((poll: { poll_date: string, candidates?: Record<string, number> }) => ({
    date: poll.poll_date,
    chow: (poll.candidates?.chow || 0) * 100,
    bradford: (poll.candidates?.bradford || 0) * 100,
    bailao: (poll.candidates?.bailao || 0) * 100,
  })).reverse();
  
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Mayoral Polling</h1>
        
        {chartData.length > 0 ? (
          <PollingChart data={chartData} />
        ) : (
          <p className="text-muted-foreground">No polling data available yet.</p>
        )}
        
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Poll History</h2>
          <p className="text-muted-foreground">Run the scraper to populate data.</p>
        </div>
      </div>
    </main>
  );
}