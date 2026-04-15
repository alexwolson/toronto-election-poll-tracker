import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getWards, getPollingAverages } from "@/lib/api";
import { MayoralPoolDisplay } from "@/components/mayoral-pool-display";

export default async function Home() {
  const [wardsData, pollsData] = await Promise.all([getWards(), getPollingAverages()]);

  const competitiveCount = wardsData.wards.filter((w) => w.race_class === "competitive").length;
  const openCount = wardsData.wards.filter((w) => w.race_class === "open").length;

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
              Tracking the Toronto 2026 mayoral race and ward-level council dynamics.
              Candidate nominations open May 1 — the field is not yet set.
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
                <p className="font-mono text-[0.7rem] uppercase tracking-wider text-muted-foreground">Polls tracked</p>
                <p className="mt-1 text-xl font-semibold">{pollsData.total_polls_available}</p>
              </div>
            </div>
          </div>

          <MayoralPoolDisplay model={pollsData.pool_model} />
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Card className="surface-panel">
            <CardHeader>
              <CardTitle className="font-heading text-2xl">Competitive Wards</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{competitiveCount}</p>
              <p className="text-sm text-muted-foreground">
                Incumbent wards with a credible challenger or high defeatability score.{" "}
                {openCount} open seat{openCount !== 1 ? "s" : ""} where no incumbent is running.
              </p>
            </CardContent>
          </Card>

          <Card className="surface-panel">
            <CardHeader>
              <CardTitle className="font-heading text-2xl">Model Phase</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">Pre-nomination</p>
              <p className="text-sm text-muted-foreground">
                Nominations open May 1, close August 21. Projections reflect structural
                factors only until the field is locked in.
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
