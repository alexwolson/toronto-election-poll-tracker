import { PageHero } from "@/components/page-hero";
import { WardsBrowser } from "@/components/wards-browser";
import { RaceViewSwitcher } from "@/components/race-view-switcher";
import { loadCouncilRaceCards } from "@/lib/feeds";
import { wardIndexView } from "@/lib/council";

export const metadata = {
  title: "Council — Toronto 2026",
  description: "The 25 ward council races, ordered by attention.",
};

export default async function WardsPage() {
  const council = await loadCouncilRaceCards();
  const items = wardIndexView(council);

  return (
    <main id="main-content" className="np-shell">
      <PageHero
        headingId="council-heading"
        kicker="Toronto council · 2026"
        title="The 25 ward races"
      />

      <section aria-label="Ward races">
        {items.length > 0 ? (
          <RaceViewSwitcher map={council.map}>
            <WardsBrowser items={items} />
          </RaceViewSwitcher>
        ) : (
          <p className="forecast-unavailable">
            Council race information is not available yet.
          </p>
        )}
      </section>
    </main>
  );
}
