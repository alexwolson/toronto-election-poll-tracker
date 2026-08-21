import { WardsBrowser } from "@/components/wards-browser";
import { loadCouncilRaceCards } from "@/lib/feeds";
import { indexCounts, wardIndexView } from "@/lib/council";

export const metadata = {
  title: "Council — Toronto 2026",
  description: "The 25 ward council races, by attention.",
};

export default async function WardsPage() {
  const council = await loadCouncilRaceCards();
  const items = wardIndexView(council);
  const counts = indexCounts(council);

  return (
    <main id="main-content" className="np-shell">
      <section className="race-hero" aria-labelledby="council-heading">
        <p className="np-kicker">Toronto council · 2026</p>
        <h1 id="council-heading">The 25 ward races</h1>
        {council.base_rate_note && (
          <p className="race-hero-dek">{council.base_rate_note}</p>
        )}
        <p className="race-hero-meta font-mono">
          {counts.open} open {counts.open === 1 ? "seat" : "seats"} ·{" "}
          {counts.withTriggers} incumbents with a fired exposure trigger. No win
          probabilities are published for council.
        </p>
      </section>

      <section aria-label="Ward races">
        {items.length > 0 ? (
          <WardsBrowser items={items} />
        ) : (
          <p className="forecast-unavailable">Council data is currently unavailable.</p>
        )}
      </section>
    </main>
  );
}
