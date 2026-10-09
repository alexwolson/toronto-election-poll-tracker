import Link from "next/link";
import { ContentSection } from "@/components/content-section";
import { ForecastHero } from "@/components/forecast-hero";
import { PollingScopeNote } from "@/components/polling-scope-note";
import { PollsterLink } from "@/components/pollster-link";
import { ResultsHomePanel } from "@/components/results-home-panel";
import { SectionHeading } from "@/components/section-heading";
import { candidateMeta, candidateName } from "@/lib/candidates";
import { loadMayoralForecast, loadMayoralPolling } from "@/lib/feeds";
import { formatDate, formatSharePct } from "@/lib/format";
import { viableField } from "@/lib/mayoral-forecast";
import {
  denominatorPhrase,
  headToHeadLabel,
  headToHeadReading,
  headToHeadSentence,
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
  // A latest poll that offered only two candidates says so beside its denominator.
  const onlyLabel = latest ? headToHeadLabel(latest, field) : null;
  const basis = [denominator, onlyLabel && denominator ? `(${onlyLabel})` : onlyLabel]
    .filter(Boolean)
    .join(" ");
  // Shown only when the head-to-head question belongs to the latest poll itself.
  const headToHead = latest ? headToHeadReading(polling, latest.poll_id) : null;
  const forecastAsOf = latestReferencedPollDate(polling, forecast.final_field_samples);

  return (
    <main id="main-content" className="np-shell">
      <ResultsHomePanel />
      <ForecastHero feed={forecast} asOfDate={forecastAsOf} />

      {ranked.length > 0 && latest && (
        <ContentSection tint className="polling-takeaway" aria-labelledby="poll-snapshot-heading">
          <SectionHeading
            headingId="poll-snapshot-heading"
            title="What the latest poll found"
          >
            <PollingScopeNote />
          </SectionHeading>
          <p className="poll-snapshot-line" aria-label="Latest poll shares">
            <PollsterLink firm={latest.firm} />, {formatDate(latest.date_conducted)}
            {latest.sample_size ? `, ${latest.sample_size.toLocaleString()} respondents` : ""} by{" "}
            {pollMethodLabel(latest.methodology).replace(/^./, (c) => c.toLowerCase())}
            {basis ? `, ${basis}` : ""}:{" "}
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
          {headToHead && (
            <p className="forecast-caption">{headToHeadSentence(headToHead, field)}</p>
          )}
          <Link href="/polls" className="btn btn--primary">
            See all mayoral polls and the trend →
          </Link>
        </ContentSection>
      )}

      <section className="section home-explore" aria-labelledby="explore-heading">
        <div className="wrap home-explore__inner">
          <div>
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
