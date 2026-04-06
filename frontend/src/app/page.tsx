import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getWards, getPollingAverages } from "@/lib/api";

function vulnerabilityBand(score: number): "high" | "medium" | "low" {
  if (score >= 55) return "high";
  if (score >= 30) return "medium";
  return "low";
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export default async function Home() {
  const [wardsData, pollsData] = await Promise.all([getWards(), getPollingAverages()]);

  const pressure = pollsData.chow_pressure;
  const trendCopy: Record<typeof pressure.trend, string> = {
    rising: "Rising",
    flat: "Flat",
    easing: "Easing",
    insufficient: "Insufficient trend data",
  };
  const bandCopy: Record<typeof pressure.band, string> = {
    low: "Low pressure",
    moderate: "Moderate pressure",
    elevated: "Elevated pressure",
  };

  const vulnerabilityCounts = wardsData.wards.reduce(
    (acc, ward) => {
      const band = vulnerabilityBand(ward.defeatability_score);
      acc[band] += 1;
      return acc;
    },
    { high: 0, medium: 0, low: 0 }
  );

  const topVulnerableWards = [...wardsData.wards]
    .sort((a, b) => b.defeatability_score - a.defeatability_score)
    .slice(0, 8);

  const structuralScore = pollsData.chow_structural_context.score;
  const hasChowStructuralScore = structuralScore !== null;
  const computedAt = pressure.computed_at
    ? new Date(pressure.computed_at).toLocaleString()
    : "Unavailable";

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <h1 className="text-4xl font-bold mb-2">Toronto 2026 Election Snapshot</h1>
        <p className="text-muted-foreground mb-8">
          Citywide pressure now, ward vulnerability concentration, and trust diagnostics.
        </p>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Chow Vulnerability Pressure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <p className="text-4xl font-bold">{formatPercent(pressure.value)}</p>
              <p className="text-sm text-muted-foreground pb-1">
                {bandCopy[pressure.band]} · {trendCopy[pressure.trend]}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Fragmentation-adjusted anti-Chow demand from current polling fields. This is a
              live pressure signal, not a winner forecast.
            </p>
            <div className="rounded-md border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Structural context (separate lens)
              </p>
              {hasChowStructuralScore ? (
                <p className="mt-1 text-lg font-semibold">
                  Matt Elliott defeatability score: {structuralScore}
                </p>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">
                  Matt Elliott defeatability score is not yet available in this API payload.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>High vulnerability wards</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{vulnerabilityCounts.high}</p>
              <p className="text-sm text-muted-foreground">Wards at highest incumbent risk.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Medium vulnerability wards</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{vulnerabilityCounts.medium}</p>
              <p className="text-sm text-muted-foreground">Watchlist wards with mixed signals.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Low vulnerability wards</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{vulnerabilityCounts.low}</p>
              <p className="text-sm text-muted-foreground">More stable incumbent positions.</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Most Vulnerable Wards</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Ward vulnerability reflects incumbent exposure in each ward and is separate from
              mayoral pressure.
            </p>
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted text-muted-foreground">
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left font-medium">Ward</th>
                    <th className="px-4 py-3 text-left font-medium">Incumbent</th>
                    <th className="px-4 py-3 text-right font-medium">Defeatability</th>
                    <th className="px-4 py-3 text-right font-medium">Win probability</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {topVulnerableWards.map((ward) => (
                    <tr key={ward.ward}>
                      <td className="px-4 py-2">Ward {ward.ward}</td>
                      <td className="px-4 py-2">{ward.councillor_name}</td>
                      <td className="px-4 py-2 text-right font-medium">
                        {ward.defeatability_score}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {formatPercent(ward.win_probability)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trust Diagnostics</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div className="rounded-md border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Poll coverage</p>
              <p className="mt-1 text-lg font-semibold">
                {pollsData.polls_used} used / {pollsData.total_polls_available} total
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Field caveat</p>
              <p className="mt-1 text-lg font-semibold">
                {pollsData.polls_with_non_scenario_candidates} poll
                {pollsData.polls_with_non_scenario_candidates === 1 ? "" : "s"} with
                non-scenario candidates
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Data freshness</p>
              <p className="mt-1 text-lg font-semibold">{computedAt}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Noise indicator</p>
              <p className="mt-1 text-lg font-semibold">
                Chow share std (recent): {formatPercent(pressure.diagnostics.chow_share_std_recent)}
              </p>
            </div>
            <div className="rounded-md border p-3 md:col-span-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Method</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {pressure.methodology_version}: anti-Chow demand is adjusted by field fragmentation
                and weighted by adaptive recency.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
