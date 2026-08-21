import Link from "next/link";
import { ForecastHero } from "@/components/forecast-hero";
import { candidateMeta, candidateName } from "@/lib/candidates";
import { loadMayoralForecast, loadMayoralPolling } from "@/lib/feeds";
import { formatDate, formatSharePct } from "@/lib/format";
import { viableField } from "@/lib/mayoral-forecast";
import { latestFieldShares } from "@/lib/polling";

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

  return (
    <main id="main-content" className="np-shell">
      <ForecastHero feed={forecast} />

      {ranked.length > 0 && latest && (
        <section className="polling-takeaway" aria-labelledby="poll-snapshot-heading">
          <div className="simple-section-heading">
            <p className="np-kicker">Latest polling</p>
            <h2 id="poll-snapshot-heading" className="section-title">
              Where the polls stand
            </h2>
          </div>
          <div className="poll-snapshot" aria-label="Latest poll shares">
            {ranked.map((id) => {
              const meta = candidateMeta(id);
              return (
                <div key={id} className="poll-snapshot__row">
                  <span>
                    <span
                      className={`candidate-marker candidate-marker--${meta.slug}`}
                      aria-hidden="true"
                    />
                    {candidateName(id)}
                  </span>
                  <span className="poll-snapshot__bar">
                    <span
                      style={{ width: `${shares[id] * 100}%`, background: meta.colorVar }}
                    />
                  </span>
                  <span className="poll-snapshot__value">{formatSharePct(shares[id])}</span>
                </div>
              );
            })}
          </div>
          <p className="race-hero-meta font-mono">
            {latest.firm} · {formatDate(latest.date_conducted)}
          </p>
          <Link href="/polls" className="text-link">
            View every poll and the trend →
          </Link>
        </section>
      )}

      <section className="model-home" aria-labelledby="council-entry-heading">
        <div className="simple-section-heading">
          <p className="np-kicker">Council</p>
          <h2 id="council-entry-heading" className="section-title">
            The 25 ward races
          </h2>
        </div>
        <Link href="/wards" className="text-link">
          Browse the ward races →
        </Link>
      </section>

      <aside className="methodology-prompt" aria-label="Methodology">
        <strong>How is this calculated?</strong>
        <span>The mayoral forecast, the polling, and the council assessment are kept separate.</span>
        <Link href="/how-it-works">Read how it works</Link>
      </aside>
    </main>
  );
}
