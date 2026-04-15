import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getWards, getPollingAverages } from "@/lib/api";

export default async function Home() {
  const [wardsData, pollsData] = await Promise.all([getWards(), getPollingAverages()]);

  const competitiveCount = wardsData.wards.filter(
    (w) => w.race_class === "competitive"
  ).length;

  const openCount = wardsData.wards.filter((w) => w.race_class === "open").length;

  const compositionMean = wardsData.composition_mean;
  const compositionStd = wardsData.composition_std;
  const compositionByMayorEntries = Object.entries(wardsData.composition_by_mayor);

  const pollEntries = Object.entries(pollsData.aggregated);
  const leading = pollEntries.length > 0
    ? pollEntries.reduce((a, b) => (a[1] > b[1] ? a : b))
    : null;

  return (
    <main>
      <div className="civic-shell space-y-8">
        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="surface-panel p-6 md:p-8">
            <p className="hero-kicker">Municipal projection desk</p>
            <h1 className="mt-4 text-4xl leading-tight font-heading md:text-6xl">
              Toronto 2026 Election
              <span className="block text-[color:var(--primary)]">Tracker</span>
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted-foreground md:text-lg">
              Ward-by-ward council race projections with mayoral polling signals,
              presented in a clear daytime briefing format.
            </p>
            <div className="mt-7 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <div className="stat-chip p-3">
                <p className="font-mono text-[0.7rem] uppercase tracking-wider text-muted-foreground">Total wards</p>
                <p className="mt-1 text-xl font-semibold">25</p>
              </div>
              <div className="stat-chip p-3">
                <p className="font-mono text-[0.7rem] uppercase tracking-wider text-muted-foreground">Competitive</p>
                <p className="mt-1 text-xl font-semibold">{competitiveCount}</p>
              </div>
              <div className="stat-chip p-3">
                <p className="font-mono text-[0.7rem] uppercase tracking-wider text-muted-foreground">Open seats</p>
                <p className="mt-1 text-xl font-semibold">{openCount}</p>
              </div>
              <div className="stat-chip p-3">
                <p className="font-mono text-[0.7rem] uppercase tracking-wider text-muted-foreground">Polls used</p>
                <p className="mt-1 text-xl font-semibold">{pollsData.polls_used}</p>
              </div>
            </div>
          </div>

          <div className="surface-panel p-6 md:p-8">
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-muted-foreground">
              Snapshot
            </p>
            <div className="mt-6 space-y-5">
              <div>
                <p className="text-sm text-muted-foreground">Expected incumbent wins</p>
                <p className="text-4xl leading-none font-heading">
                  {compositionMean.toFixed(1)}
                  <span className="ml-2 text-base text-muted-foreground">±{compositionStd.toFixed(1)}</span>
                </p>
              </div>
              <div className="h-px bg-[var(--line-soft)]" />
              <div>
                <p className="text-sm text-muted-foreground">Current mayoral front-runner</p>
                {leading ? (
                  <p className="mt-1 text-3xl capitalize font-heading text-[color:var(--primary)]">
                    {leading[0]} <span className="text-xl text-foreground">{(leading[1] * 100).toFixed(0)}%</span>
                  </p>
                ) : (
                  <p className="mt-1 text-lg text-muted-foreground">No polling data yet</p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Card className="surface-panel">
            <CardHeader>
              <CardTitle className="font-heading text-2xl">Council Composition</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {compositionMean.toFixed(1)}{" "}
                <span className="text-base font-normal text-muted-foreground">
                  ±{compositionStd.toFixed(1)}
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                Projected incumbent wins out of 25 seats.
              </p>
            </CardContent>
          </Card>

          <Card className="surface-panel">
            <CardHeader>
              <CardTitle className="font-heading text-2xl">Competitive Wards</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{competitiveCount}</p>
              <p className="text-sm text-muted-foreground">
                Competitive incumbents with {openCount} open seat
                {openCount !== 1 ? "s" : ""} in play.
              </p>
            </CardContent>
          </Card>

          <Card className="surface-panel">
            <CardHeader>
              <CardTitle className="font-heading text-2xl">Mayoral Race</CardTitle>
            </CardHeader>
            <CardContent>
              {leading ? (
                <>
                  <p className="text-2xl font-semibold capitalize">{leading[0]}</p>
                  <p className="text-sm text-muted-foreground">
                    Leading at {(leading[1] * 100).toFixed(0)}% from {pollsData.polls_used} poll
                    {pollsData.polls_used !== 1 ? "s" : ""}.
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No polling data available.</p>
              )}
            </CardContent>
          </Card>
        </section>

        {compositionByMayorEntries.length > 0 && (
          <Card className="surface-panel">
            <CardHeader>
              <CardTitle className="font-heading text-3xl">Composition by Mayoral Winner</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-xl border border-[var(--line-soft)] bg-[color:var(--panel)]">
                <table className="w-full text-sm">
                  <thead className="bg-[color:var(--secondary)] text-muted-foreground">
                    <tr className="border-b border-[var(--line-soft)]">
                      <th className="px-4 py-3 text-left font-medium">Candidate</th>
                      <th className="px-4 py-3 text-right font-medium">Mean</th>
                      <th className="px-4 py-3 text-right font-medium">Std</th>
                      <th className="px-4 py-3 text-right font-medium">Draws</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--line-soft)]">
                    {compositionByMayorEntries
                      .sort((a, b) => b[1].mean - a[1].mean)
                      .map(([candidate, stats]) => (
                        <tr key={candidate} className="hover:bg-[color:var(--secondary)]/60 transition-colors">
                          <td className="px-4 py-2 capitalize font-medium">{candidate}</td>
                          <td className="px-4 py-2 text-right">{stats.mean.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right">{stats.std.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right font-mono">{stats.n_draws}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
