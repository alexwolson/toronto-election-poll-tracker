import { candidateMeta } from "@/lib/candidates";
import {
  agnosticQuantities,
  evidenceBasisLine,
  incumbentDefeat,
  leadForecast,
  publishedCandidateWins,
} from "@/lib/mayoral-forecast";
import type { MayoralForecastFeed } from "@/types/feeds";

/**
 * The mayoral forecast hero (spec §Hero). Lead-first: the favourite and their
 * frequency phrase, then the full band board, then the published derived
 * quantities. Bands and frequency phrases only — never a raw number. Withheld
 * quantities never appear. When nothing publishes, an honest note stands in.
 */
export function ForecastHero({ feed }: { feed: MayoralForecastFeed }) {
  const wins = publishedCandidateWins(feed);
  const lead = leadForecast(feed);
  const agnostic = agnosticQuantities(feed);
  const defeat = incumbentDefeat(feed);
  const basis = evidenceBasisLine(feed.evidence_tier);

  if (!lead) {
    return (
      <section className="forecast-lead" aria-labelledby="forecast-heading">
        <p className="np-kicker">Toronto mayor · 2026 forecast</p>
        <h1 id="forecast-heading">The forecast isn&rsquo;t available yet</h1>
        <div className="forecast-unavailable">
          <p>
            There isn&rsquo;t yet enough agreed-upon evidence to publish a
            forecast for the mayor&rsquo;s race. This page will show the odds as
            soon as the ballot is final and the polling supports it.
          </p>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="forecast-lead" aria-labelledby="forecast-heading">
        <p className="np-kicker">Toronto mayor · 2026 forecast</p>
        <h1 id="forecast-heading">
          {lead.name} is favoured to win —{" "}
          <span className="lead-freq">{lead.frequencyStatement}</span>
        </h1>
        <p className="evidence-basis">{basis}</p>
      </section>

      <section aria-label="Chance of winning, by candidate">
        <div className="band-board">
          {wins.map((win) => {
            const meta = candidateMeta(win.candidateId);
            return (
              <div key={win.candidateId} className="band-card">
                <div className="band-card__head">
                  <span
                    className={`band-swatch band-swatch--${meta.slug}`}
                    aria-hidden="true"
                  />
                  <h3 className="band-card__name">{win.name}</h3>
                </div>
                <div className="band-card__freq">{win.frequencyStatement}</div>
                {defeat && defeat.candidateId === win.candidateId && (
                  <p className="band-card__defeat">
                    <span className="band-card__defeat-label">{defeat.label}</span>
                    <span className="band-card__defeat-freq">
                      {defeat.frequencyStatement}
                    </span>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {agnostic.length > 0 && (
        <section aria-label="Other forecast quantities">
          <div className="derived-row">
            {agnostic.map((item) => (
              <div key={item.key} className="derived-item">
                <p className="derived-item__label">{item.label}</p>
                <span className="derived-item__freq">{item.frequencyStatement}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
