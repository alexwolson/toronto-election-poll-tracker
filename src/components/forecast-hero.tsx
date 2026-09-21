import Link from "next/link";
import { MarginChart } from "@/components/forecast/margin-chart";
import { VoteShareRanges } from "@/components/forecast/vote-share-ranges";
import { WinProbabilities } from "@/components/forecast/win-probabilities";
import { SectionHeading } from "@/components/section-heading";
import { formatDate } from "@/lib/format";
import {
  chance,
  electionDayShares,
  forecastAvailable,
  leadForecast,
  pairwiseMargin,
  residualPoolNote,
  winProbabilities,
} from "@/lib/mayoral-forecast";
import type { MayoralForecastFeed } from "@/types/feeds";

/**
 * The mayoral forecast hero (ADR 0054; presentation approved 2026-09-14).
 * Margin first: how far apart the two poll leaders are likely to finish and how
 * often that order reverses; then each candidate's election-day vote range; then
 * full-race win chances. Every number is a summary of the same joint draws.
 * When the forecast is withheld, an honest note stands in.
 */
export function ForecastHero({
  feed,
  asOfDate,
}: {
  feed: MayoralForecastFeed;
  asOfDate?: string | null;
}) {
  const lead = leadForecast(feed);
  const margin = pairwiseMargin(feed);
  const shares = electionDayShares(feed);
  const odds = winProbabilities(feed);

  if (!lead || !margin || !shares || !forecastAvailable(feed)) {
    return (
      <section className="forecast-lead" aria-labelledby="forecast-heading">
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

  const ahead = margin.medianPp >= 0;
  const gap = Math.abs(margin.medianPp).toFixed(0);
  return (
    <>
      <section className="forecast-lead" aria-labelledby="forecast-heading">
        <p className="forecast-kicker">
          The election-day forecast · {formatDate(feed.election_date)}
        </p>
        <h1 id="forecast-heading">{lead.name} is favoured to win</h1>
        <p className="forecast-lede">
          The middle outcome puts {margin.leader.surname} {gap} points{" "}
          {ahead ? "ahead of" : "behind"} {margin.challenger.surname}. The whole range of
          outcomes shows how often that order could reverse.
        </p>
        {asOfDate && (
          <p className="forecast-as-of">Forecast evidence through {formatDate(asOfDate)}</p>
        )}
      </section>

      <section className="forecast-margin" aria-labelledby="forecast-margin-heading">
        <SectionHeading
          headingId="forecast-margin-heading"
          title={`The margin between ${margin.leader.surname} and ${margin.challenger.surname}`}
        />
        <div className="forecast-margin__layout">
          <MarginChart view={margin} />
          <aside className="forecast-margin__aside">
            <span className="forecast-kicker">
              {margin.challenger.surname} finishes ahead of {margin.leader.surname}
            </span>
            <strong className="forecast-margin__chance" style={{ color: margin.challenger.colorVar }}>
              {chance(margin.challengerAhead)}
            </strong>
            <p>of simulated outcomes</p>
            <p className="forecast-caption">
              This compares two candidates. Winning also requires finishing ahead of everyone
              else.
            </p>
          </aside>
        </div>
      </section>

      <section className="forecast-shares" aria-labelledby="forecast-shares-heading">
        <SectionHeading headingId="forecast-shares-heading" title="What the vote could look like" />
        <VoteShareRanges view={shares} />
      </section>

      <section className="forecast-odds" aria-labelledby="forecast-odds-heading">
        <SectionHeading headingId="forecast-odds-heading" title="Who wins the full race?">
          <p>All candidates compete in the same simulated elections.</p>
        </SectionHeading>
        <WinProbabilities view={odds} />
      </section>

      <details className="forecast-method">
        <summary>What is behind these numbers</summary>
        <p>
          One statistical model, fitted to the {feed.final_field_samples.length} published polls of
          the certified field and to seven past Toronto mayoral campaigns, produces{" "}
          {feed.model.draws.toLocaleString()} simulated elections. The margin, the vote ranges and
          the win chances all summarize those same simulations.
        </p>
        <p>Other candidates: {residualPoolNote(feed)}</p>
        <p>
          <Link href="/how-it-works#mayoral-forecast" className="text-link">
            How the forecast is built →
          </Link>
        </p>
      </details>
    </>
  );
}
