import Link from "next/link";
import { ForecastTabs } from "@/components/forecast/forecast-tabs";
import { MarginOutcomes } from "@/components/forecast/margin-outcomes";
import { UncertaintyRange } from "@/components/forecast/uncertainty-range";
import { VoteShareRanges } from "@/components/forecast/vote-share-ranges";
import { SectionHeading } from "@/components/section-heading";
import { formatDate } from "@/lib/format";
import {
  chance,
  electionDayShares,
  forecastAvailable,
  leadForecast,
  marginOutcomes,
  residualPoolNote,
  uncertaintyLadder,
} from "@/lib/mayoral-forecast";
import type { MayoralForecastFeed } from "@/types/feeds";

/**
 * The mayoral forecast hero (ADR 0054; presentation approved 2026-09-14, margin
 * view revised 2026-09-21, tabs 2026-09-22). The margin between the two poll
 * leaders leads, as three named outcomes with their exact shares of the
 * simulated elections. Beneath it, two further views of the same simulations
 * as tabs: each candidate's election-day vote range, and where the forecast's
 * uncertainty comes from (ADR 0056). A feed without the uncertainty block shows
 * the vote ranges as a plain section. When the forecast is withheld, an honest
 * note stands in.
 */
export function ForecastHero({
  feed,
  asOfDate,
}: {
  feed: MayoralForecastFeed;
  asOfDate?: string | null;
}) {
  const lead = leadForecast(feed);
  const margin = marginOutcomes(feed);
  const shares = electionDayShares(feed);
  const ladder = uncertaintyLadder(feed);

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

  const draws = feed.model.draws.toLocaleString();
  const voteRanges = <VoteShareRanges view={shares} />;
  return (
    <>
      <section className="forecast-lead" aria-labelledby="forecast-heading">
        <p className="forecast-kicker">
          The election-day forecast · {formatDate(feed.election_date)}
        </p>
        <h1 id="forecast-heading">{lead.name} is favoured to win</h1>
        <p className="forecast-lede">
          {margin.leader.surname} finishes ahead of {margin.challenger.surname} in{" "}
          {chance(margin.leaderAhead)} of simulated elections. The bars show how big the gap is
          likely to be.
        </p>
        {asOfDate && (
          <p className="forecast-as-of">Forecast evidence through {formatDate(asOfDate)}</p>
        )}
      </section>

      <section className="forecast-margin" aria-labelledby="forecast-margin-heading">
        <SectionHeading
          headingId="forecast-margin-heading"
          title={`How far apart ${margin.leader.surname} and ${margin.challenger.surname} are likely to finish`}
        />
        <MarginOutcomes view={margin} />
        <p className="forecast-caption">
          Percentages are the share of {draws} simulated elections. Counting the close outcomes by
          who is ahead, {margin.leader.surname} finishes ahead in {chance(margin.leaderAhead)} and{" "}
          {margin.challenger.surname} in {chance(margin.challengerAhead)}.
        </p>
      </section>

      {ladder ? (
        <ForecastTabs
          label="More on the forecast"
          tabs={[
            { id: "shares", label: "What the vote could look like", content: voteRanges },
            {
              id: "uncertainty",
              label: "Where the uncertainty comes from",
              content: (
                <>
                  <p className="forecast-tabs__intro">
                    Each row adds one source of doubt to the gap between {ladder.leader.surname}{" "}
                    and {ladder.challenger.surname}. The bar is where the middle{" "}
                    {Math.round(ladder.intervalMass * 100)}% of simulated elections land.
                  </p>
                  <UncertaintyRange view={ladder} />
                  <p className="forecast-caption">
                    The last row is the published forecast. The dark tick is the middle of the
                    range; it barely moves, only the range grows. The number at the right is how
                    often {ladder.challenger.surname} is ahead at that point.
                  </p>
                </>
              ),
            },
          ]}
        />
      ) : (
        <section className="forecast-shares" aria-labelledby="forecast-shares-heading">
          <SectionHeading
            headingId="forecast-shares-heading"
            title="What the vote could look like"
          />
          {voteRanges}
        </section>
      )}

      <details className="forecast-method">
        <summary>What is behind these numbers</summary>
        <p>
          One statistical model, fitted to the {feed.final_field_samples.length} published polls of
          the certified field and to seven past Toronto mayoral campaigns, produces {draws}{" "}
          simulated elections. The margin outcomes, the vote ranges and the uncertainty rows all
          summarize those same simulations.
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
