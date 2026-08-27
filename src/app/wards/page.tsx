import { WardsBrowser } from "@/components/wards-browser";
import { RaceViewSwitcher } from "@/components/race-view-switcher";
import { loadCouncilRaceCards } from "@/lib/feeds";
import { wardIndexView } from "@/lib/council";

export const metadata = {
  title: "Council — Toronto 2026",
  description: "The 25 ward council races, by attention.",
};

export default async function WardsPage() {
  const council = await loadCouncilRaceCards();
  const items = wardIndexView(council);

  return (
    <main id="main-content" className="np-shell">
      <section className="race-hero" aria-labelledby="council-heading">
        <p className="np-kicker">Toronto council · 2026</p>
        <h1 id="council-heading">The 25 ward races</h1>
      </section>

      <section aria-label="Ward races">
        {items.length > 0 ? (
          <RaceViewSwitcher map={council.map}>
            <WardsBrowser items={items} />
          </RaceViewSwitcher>
        ) : (
          <p className="forecast-unavailable">Council data is currently unavailable.</p>
        )}
      </section>
    </main>
  );
}
