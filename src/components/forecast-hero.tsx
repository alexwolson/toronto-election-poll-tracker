import { MarginDistribution } from "@/components/margin-distribution";
import { SectionHeading } from "@/components/section-heading";
import { candidateMeta } from "@/lib/candidates";
import {
  incumbentDefeat,
  leadForecast,
  marginDistribution,
  publishedCandidateWins,
} from "@/lib/mayoral-forecast";
import type { MayoralForecastFeed } from "@/types/feeds";
import { formatDate } from "@/lib/format";

/**
 * The mayoral forecast hero (spec §Hero). Lead-first: the favourite and their
 * frequency phrase, then the full band board, then the published derived
 * quantities. Bands and frequency phrases only — never a raw number. Withheld
 * quantities never appear. When nothing publishes, an honest note stands in.
 */
export function ForecastHero({
  feed,
  asOfDate,
}: {
  feed: MayoralForecastFeed;
  asOfDate?: string | null;
}) {
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
            Toronto&rsquo;s mayoral ballot and the available polling do not yet meet
            the requirements for a published forecast. The forecast will appear
            once both do.
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
        {asOfDate && (
          <p className="forecast-as-of">Forecast evidence through {formatDate(asOfDate)}</p>
        )}
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
          <SectionHeading
            headingId="margin-panel-heading"
            kicker="How close might it be?"
            title="The margin between the top two"
          />
          <p className="margin-panel__lede">
            The chart groups the gap between the top two candidates into four
            outcomes, from a close result to a landslide. Taller bars mean a result
            is more likely; each colour identifies the winner in those simulations.
            Past Toronto mayoral results appear below for comparison.
          </p>
          <MarginDistribution view={margins} />
        </section>
      )}
    </>
  );
}
