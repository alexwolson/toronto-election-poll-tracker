import Link from "next/link";
import { ContentSection } from "@/components/content-section";
import { ForecastHero } from "@/components/forecast-hero";
import { PollingScopeNote } from "@/components/polling-scope-note";
import { PollsterLink } from "@/components/pollster-link";
import { SectionHeading } from "@/components/section-heading";
import { candidateMeta, candidateName } from "@/lib/candidates";
import { loadMayoralForecast, loadMayoralPolling } from "@/lib/feeds";
import { formatDate, formatSharePct } from "@/lib/format";
import { viableField } from "@/lib/mayoral-forecast";
import {
  denominatorPhrase,
  latestFieldShares,
  latestPoll,
  latestReferencedPollDate,
  pollMethodLabel,
  residualShares,
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
  const residual = latest ? residualShares(latest, field) : { undecided: null, other: null };
  const denominator = latest ? denominatorPhrase(latest) : null;
  const forecastAsOf = latestReferencedPollDate(polling, forecast.final_field_samples);

  return (
    <main id="main-content" className="np-shell">
      <ForecastHero feed={forecast} asOfDate={forecastAsOf} />

      {ranked.length > 0 && latest && (
        <ContentSection tint className="polling-takeaway" aria-labelledby="poll-snapshot-heading">
          <SectionHeading
            headingId="poll-snapshot-heading"
            kicker="From the polling record"
            title="What the latest poll found"
          >
            <PollingScopeNote />
          </SectionHeading>
          <p className="poll-snapshot-line" aria-label="Latest poll shares">
            <PollsterLink firm={latest.firm} />, {formatDate(latest.date_conducted)}
            {latest.sample_size ? `, ${latest.sample_size.toLocaleString()} respondents` : ""} by{" "}
            {pollMethodLabel(latest.methodology).replace(/^./, (c) => c.toLowerCase())}
            {denominator ? `, ${denominator}` : ""}:{" "}
            {ranked.map((id, index) => {
              const meta = candidateMeta(id);
              return (
                <span key={id}>
                  {index > 0 && ", "}
                  <strong className="poll-snapshot__candidate">
                    <span className={`candidate-marker candidate-marker--${meta.slug}`} aria-hidden="true" />
                    {candidateName(id)} {formatSharePct(shares[id])}
                  </strong>
                </span>
              );
            })}
            {residual.undecided !== null && (
              <span>, undecided {formatSharePct(residual.undecided)}</span>
            )}
            {residual.other !== null && (
              <span>, other reported choices {formatSharePct(residual.other)}</span>
            )}
            .
          </p>
          <Link href="/polls" className="btn btn--primary">
            See all mayoral polls and the trend →
          </Link>
        </ContentSection>
      )}

      <section className="section home-explore" aria-labelledby="explore-heading">
        <div className="wrap home-explore__inner">
          <div>
            <p className="kicker">Beyond the mayoral race</p>
            <h2 id="explore-heading">The election in your neighbourhood</h2>
            <Link href="/how-it-works" className="text-link">How the evidence is handled →</Link>
          </div>
          <nav className="home-explore__actions" aria-label="Explore more">
            <Link href="/wards" className="btn btn--light">Browse all 25 ward races →</Link>
            <Link href="/trustees" className="text-link">School-board races →</Link>
          </nav>
        </div>
      </section>
    </main>
  );
}
