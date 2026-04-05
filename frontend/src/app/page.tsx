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
      </div>
    </main>
  );
}
