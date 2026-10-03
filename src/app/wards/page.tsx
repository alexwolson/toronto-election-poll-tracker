import { PageHero } from "@/components/page-hero";
import { RaceIndexSection } from "@/components/race-index-section";
import { WardsBrowser } from "@/components/wards-browser";
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
        title="Toronto City Council"
      />

      <RaceIndexSection
        headingId="council-wards-heading"
        title="The 25 wards"
        map={items.length > 0 ? council.map : null}
      >
        {items.length > 0 ? (
          <WardsBrowser items={items} />
        ) : (
          <p className="forecast-unavailable">
            Council race information is not available yet.
          </p>
        )}
      </RaceIndexSection>
    </main>
  );
}
