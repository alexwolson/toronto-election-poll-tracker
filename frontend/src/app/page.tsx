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
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <h1 className="text-4xl font-bold mb-2">Toronto 2026 Elections</h1>
        <p className="text-muted-foreground mb-8">
          Ward-by-ward council race projections and mayoral polling
        </p>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Council Composition</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {compositionMean.toFixed(1)}{" "}
                <span className="text-base font-normal text-muted-foreground">
                  ±{compositionStd.toFixed(1)}
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                Projected incumbent wins (of 25)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Competitive Wards</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{competitiveCount}</p>
              <p className="text-sm text-muted-foreground">
                Competitive incumbents · {openCount} open seat
                {openCount !== 1 ? "s" : ""}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mayoral Race</CardTitle>
            </CardHeader>
            <CardContent>
              {leading ? (
                <>
                  <p className="text-2xl font-bold capitalize">
                    {leading[0]}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Leading at {(leading[1] * 100).toFixed(0)}% (
                    {pollsData.polls_used} poll
                    {pollsData.polls_used !== 1 ? "s" : ""})
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No polling data available.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {compositionByMayorEntries.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Composition by Mayoral Winner</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-muted-foreground">
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left font-medium">Candidate</th>
                      <th className="px-4 py-3 text-right font-medium">Mean</th>
                      <th className="px-4 py-3 text-right font-medium">Std</th>
                      <th className="px-4 py-3 text-right font-medium">Draws</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {compositionByMayorEntries
                      .sort((a, b) => b[1].mean - a[1].mean)
                      .map(([candidate, stats]) => (
                        <tr key={candidate}>
                          <td className="px-4 py-2 capitalize">{candidate}</td>
                          <td className="px-4 py-2 text-right">{stats.mean.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right">{stats.std.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right">{stats.n_draws}</td>
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
