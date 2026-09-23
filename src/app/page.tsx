import Link from "next/link";
import { ForecastHero } from "@/components/forecast-hero";
import { PollingScopeNote } from "@/components/polling-scope-note";
import { PollsterLink } from "@/components/pollster-link";
import { SectionHeading } from "@/components/section-heading";
import { candidateMeta, candidateName } from "@/lib/candidates";
import { loadMayoralForecast, loadMayoralPolling } from "@/lib/feeds";
import { formatDate, formatSharePct } from "@/lib/format";
import { viableField } from "@/lib/mayoral-forecast";
import {
  explicitOtherShare,
  latestFieldShares,
  latestPoll,
  latestReferencedPollDate,
  pollMethodLabel,
} from "@/lib/polling";

export default async function Home() {
  const [forecast, polling] = await Promise.all([
    loadMayoralForecast(),
    loadMayoralPolling(),
  ]);

  const field = viableField(forecast);
  const shares = latestFieldShares(polling, field);
  const ranked = field
    .filter((id) => id in shares)
    .sort((a, b) => shares[b] - shares[a]);
  const latest = latestPoll(polling);
  const otherShare = latest ? explicitOtherShare(latest, field) : null;
  const forecastAsOf = latestReferencedPollDate(polling, forecast.final_field_samples);

  return (
    <main id="main-content" className="np-shell">
      <ForecastHero feed={forecast} asOfDate={forecastAsOf} />

      {ranked.length > 0 && latest && (
        <section className="polling-takeaway" aria-labelledby="poll-snapshot-heading">
          <SectionHeading
            headingId="poll-snapshot-heading"
            title="What the latest poll found"
          >
            <PollingScopeNote />
          </SectionHeading>
          <p className="poll-snapshot-line" aria-label="Latest poll shares">
            <PollsterLink firm={latest.firm} />, {formatDate(latest.date_conducted)}
            {latest.sample_size ? `, ${latest.sample_size.toLocaleString()} respondents` : ""} by{" "}
            {pollMethodLabel(latest.methodology).replace(/^./, (c) => c.toLowerCase())}:{" "}
            {ranked.map((id, index) => {
              const meta = candidateMeta(id);
              return (
                <span key={id}>
                  {index > 0 && ", "}
                  <strong style={{ color: meta.colorVar }}>
                    {candidateName(id)} {formatSharePct(shares[id])}
                  </strong>
                </span>
              );
            })}
            {otherShare !== null && (
              <span>
                , Other reported choices {formatSharePct(otherShare)}
              </span>
            )}
            .
          </p>
          <Link href="/polls" className="text-link">
            See all mayoral polls and the trend →
          </Link>
        </section>
      )}

      <nav className="home-explore" aria-label="Explore more">
        <Link href="/wards">Browse all 25 ward races →</Link>
        <Link href="/how-it-works">How the evidence is handled →</Link>
      </nav>
    </main>
  );
}
