/**
 * PROTOTYPE variant D: A without the hero sentence, and with Alexander rolled
 * into "Other candidates" in the vote ranges (pool + Alexander summed per
 * draw). The head-to-head stays one reference sentence under the latest poll.
 */
import { ContentSection } from "@/components/content-section";
import { ForecastTabs } from "@/components/forecast/forecast-tabs";
import { MarginOutcomes } from "@/components/forecast/margin-outcomes";
import { UncertaintyRange } from "@/components/forecast/uncertainty-range";
import { VoteShareRanges } from "@/components/forecast/vote-share-ranges";
import { SectionHeading } from "@/components/section-heading";
import { formatDate, formatSharePct } from "@/lib/format";
import {
  chance,
  electionDayShares,
  leadForecast,
  marginOutcomes,
  uncertaintyBreakdown,
  viableField,
} from "@/lib/mayoral-forecast";
import type { MayoralForecastFeed, MayoralPollingFeed } from "@/types/feeds";
import { HEAD_TO_HEAD, withS2 } from "./data";
import { OTHER_WITH_ALEXANDER } from "./s2-numbers";
import { LatestPoll } from "./latest-poll";

export function VariantD({
  feed: live,
  polling,
  asOfDate,
}: {
  feed: MayoralForecastFeed;
  polling: MayoralPollingFeed;
  asOfDate: string | null;
}) {
  const feed = withS2(live);
  const lead = leadForecast(feed);
  const margin = marginOutcomes(feed);
  const shares = electionDayShares(feed);
  const breakdown = uncertaintyBreakdown(feed);
  if (!lead || !margin || !shares) return null;
  const rows = shares.rows
    .filter((row) => row.slug !== "alexander")
    .map((row) =>
      row.candidateId === null
        ? {
            ...row,
            median: OTHER_WITH_ALEXANDER.median * 100,
            lower: OTHER_WITH_ALEXANDER.lower * 100,
            upper: OTHER_WITH_ALEXANDER.upper * 100,
          }
        : row,
    );
  const h2h = HEAD_TO_HEAD.headToHead;
  return (
    <>
      <ContentSection className="forecast-lead" aria-labelledby="forecast-heading">
        <h1 id="forecast-heading">{lead.name} is favoured to win</h1>
        <p className="forecast-lede">
          {margin.leader.surname} finishes ahead of {margin.challenger.surname} in{" "}
          {chance(margin.leaderAhead)} of simulated elections.
        </p>
        <p className="forecast-as-of">
          Forecast for election day, {formatDate(feed.election_date)}.
          {asOfDate ? ` Evidence through ${formatDate(asOfDate)}.` : ""}
        </p>
      </ContentSection>

      <ContentSection tint className="forecast-margin" aria-labelledby="forecast-margin-heading">
        <SectionHeading
          headingId="forecast-margin-heading"
          title={`How far apart ${margin.leader.surname} and ${margin.challenger.surname} are likely to finish`}
        />
        <MarginOutcomes view={margin} />
      </ContentSection>

      <ContentSection className="forecast-details" aria-labelledby="forecast-details-heading">
        <SectionHeading headingId="forecast-details-heading" title="Explore the simulated results" />
        <ForecastTabs
          label="More on the forecast"
          tabs={[
            {
              id: "shares",
              label: "What the vote could look like",
              content: (
                <>
                  <p className="forecast-tabs__intro">Each candidate&rsquo;s share of all votes cast on election day.</p>
                  <VoteShareRanges view={{ ...shares, rows }} />
                </>
              ),
            },
            ...(breakdown
              ? [
                  {
                    id: "uncertainty",
                    label: "Where the uncertainty comes from",
                    content: <UncertaintyRange view={breakdown} />,
                  },
                ]
              : []),
          ]}
        />
      </ContentSection>

      <LatestPoll
        polling={polling}
        field={viableField(feed)}
        extra={
          <p className="forecast-caption">
            {HEAD_TO_HEAD.firm}&rsquo;s {HEAD_TO_HEAD.fieldwork} poll also asked the same respondents to
            choose between only Chow and Bradford. Of all respondents: Chow {formatSharePct(h2h.chow)}, Bradford{" "}
            {formatSharePct(h2h.bradford)}, undecided {formatSharePct(h2h.undecided)}. It is shown for
            reference and not counted as a separate poll.
          </p>
        }
      />
    </>
  );
}
