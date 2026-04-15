import { getWards } from "@/lib/api";
import { WardsBrowser } from "@/components/wards-browser";

export default async function WardsPage() {
  const data = await getWards();
  const wards = data.wards || [];
  const safeCount = wards.filter((w) => w.race_class === "safe").length;
  const competitiveCount = wards.filter((w) => w.race_class === "competitive").length;
  const openCount = wards.filter((w) => w.race_class === "open").length;
  
  return (
    <main>
      <div className="civic-shell space-y-6">
        <section className="surface-panel p-6 md:p-8">
          <p className="hero-kicker">Ward monitor</p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <h1 className="text-4xl font-heading md:text-5xl">All Wards</h1>
            <div className="grid grid-cols-3 gap-2 text-xs sm:text-sm">
              <div className="stat-chip px-3 py-2 text-center">
                <p className="font-mono uppercase tracking-wider text-muted-foreground">Safe</p>
                <p className="mt-0.5 text-lg font-semibold">{safeCount}</p>
              </div>
              <div className="stat-chip px-3 py-2 text-center">
                <p className="font-mono uppercase tracking-wider text-muted-foreground">Competitive</p>
                <p className="mt-0.5 text-lg font-semibold">{competitiveCount}</p>
              </div>
              <div className="stat-chip px-3 py-2 text-center">
                <p className="font-mono uppercase tracking-wider text-muted-foreground">Open</p>
                <p className="mt-0.5 text-lg font-semibold">{openCount}</p>
              </div>
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Quick scan of all 25 wards with race classification, incumbent status,
            and vulnerability outlook.
          </p>
        </section>

        <WardsBrowser wards={wards} />
      </div>
    </main>
  );
}
