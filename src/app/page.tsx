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
  const latest = polling.latest;
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
            {latest.firm}, {formatDate(latest.date_conducted)}:{" "}
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
          <dl className="poll-context-grid" aria-label="Latest poll context">
            <div>
              <dt>Pollster</dt>
              <dd><PollsterLink firm={latest.firm} /></dd>
            </div>
            <div>
              <dt>Conducted</dt>
              <dd>{formatDate(latest.date_conducted)}</dd>
            </div>
            <div>
              <dt>Sample</dt>
              <dd>{latest.sample_size?.toLocaleString() ?? "Not supplied"}</dd>
            </div>
            <div>
              <dt>Survey method</dt>
              <dd>{pollMethodLabel(latest.methodology)}</dd>
            </div>
          </dl>
          <p className="poll-context-note">
            Question wording and respondent base are not supplied in this feed.
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
