import { MarginDistribution } from "@/components/margin-distribution";
import { candidateMeta } from "@/lib/candidates";
import {
  incumbentDefeat,
  leadForecast,
  marginDistribution,
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
  const margins = marginDistribution(feed);
  const defeat = incumbentDefeat(feed);

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
        <h1 id="forecast-heading">{lead.name} is favoured to win</h1>
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
                <div className="band-card__freq">Wins {win.frequencyStatement}</div>
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

      {margins && (
        <section className="margin-panel" aria-labelledby="margin-panel-heading">
          <div className="simple-section-heading">
            <p className="np-kicker">How close might it be?</p>
            <h2 id="margin-panel-heading" className="section-title">
              The margin between the top two
            </h2>
          </div>
          <p className="margin-panel__lede">
            The gap between the leading two candidates, split into four outcomes
            from a close result to a landslide. The taller and darker a bar, the
            likelier the 2026 result lands there; the seven past Toronto mayoral
            results sit underneath at the margins they finished with.
          </p>
          <MarginDistribution view={margins} />
        </section>
      )}
    </>
  );
}
