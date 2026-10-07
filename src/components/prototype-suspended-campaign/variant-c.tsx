/**
 * PROTOTYPE variant C, "Explainer first". The banner becomes a dated section
 * right under the headline that says what changed on Oct. 6, with a
 * before/after table; Alexander keeps his chart row with its pre-exit level
 * named; the head-to-head opens from the latest-poll section as a paired
 * comparison on one denominator.
 */
import Link from "next/link";
import { ContentSection } from "@/components/content-section";
import { ForecastTabs } from "@/components/forecast/forecast-tabs";
import { MarginOutcomes } from "@/components/forecast/margin-outcomes";
import { UncertaintyRange } from "@/components/forecast/uncertainty-range";
import { VoteShareRanges } from "@/components/forecast/vote-share-ranges";
import { SectionHeading } from "@/components/section-heading";
import { formatDate, formatDetailedSharePct, formatSharePct } from "@/lib/format";
import {
  chance,
  electionDayShares,
  leadForecast,
  marginOutcomes,
  uncertaintyBreakdown,
  viableField,
} from "@/lib/mayoral-forecast";
import type { MayoralForecastFeed, MayoralPollingFeed } from "@/types/feeds";
import { BEFORE_AFTER, HEAD_TO_HEAD, withS2 } from "./data";
import { LatestPoll } from "./latest-poll";

export function VariantC({
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
  const before = BEFORE_AFTER;
  const rows = shares.rows.map((row) =>
    row.slug === "alexander"
      ? { ...row, name: `Chris Alexander (was ${formatSharePct(before.alexanderShare.before)} before Oct. 6)` }
      : row,
  );
  const full = HEAD_TO_HEAD.fullField;
  const h2h = HEAD_TO_HEAD.headToHead;
  const cell: React.CSSProperties = { padding: "0.4rem 0.75rem", textAlign: "right" };

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

      <ContentSection tint aria-labelledby="oct6-heading">
        <SectionHeading headingId="oct6-heading" title="What changed on Oct. 6" />
        <p>
          Chris Alexander ended his campaign but is still on the ballot. Candidates who did this in past
          Canadian mayoral races kept between about 3% and 25% of their last poll support. The forecast now
          uses that record for Alexander, and shares the rest of his support out among the other
          candidates in proportion to their own.
        </p>
        <table style={{ borderCollapse: "collapse", margin: "1rem 0" }}>
          <thead>
            <tr>
              <th style={{ ...cell, textAlign: "left" }} />
              <th style={cell}>Before Oct. 6</th>
              <th style={cell}>Now</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderTop: "1px solid #ccc" }}>
              <td style={{ ...cell, textAlign: "left" }}>Alexander&rsquo;s expected share of the vote</td>
              <td style={cell}>{formatSharePct(before.alexanderShare.before)}</td>
              <td style={cell}>
                <strong>{formatSharePct(before.alexanderShare.after)}</strong>
              </td>
            </tr>
            <tr style={{ borderTop: "1px solid #ccc" }}>
              <td style={{ ...cell, textAlign: "left" }}>Chow&rsquo;s chance of winning</td>
              <td style={cell}>{formatDetailedSharePct(before.chowChance.before)}</td>
              <td style={cell}>
                <strong>{formatDetailedSharePct(before.chowChance.after)}</strong>
              </td>
            </tr>
            <tr style={{ borderTop: "1px solid #ccc" }}>
              <td style={{ ...cell, textAlign: "left" }}>Bradford&rsquo;s chance of winning</td>
              <td style={cell}>{formatDetailedSharePct(before.bradfordChance.before)}</td>
              <td style={cell}>
                <strong>{formatDetailedSharePct(before.bradfordChance.after)}</strong>
              </td>
            </tr>
          </tbody>
        </table>
        <p>
          We don&rsquo;t assume where his supporters go. The latest poll that forced a choice between only
          Chow and Bradford split the extra votes almost evenly, which leaves the odds where they are.
          Polls taken from now on will show where they actually went.{" "}
          <Link href="/how-it-works#mayoral-forecast" className="text-link">
            How we handle this →
          </Link>
        </p>
      </ContentSection>

      <ContentSection className="forecast-margin" aria-labelledby="forecast-margin-heading">
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
              content: <VoteShareRanges view={{ ...shares, rows }} />,
            },
            ...(breakdown
              ? [{ id: "uncertainty", label: "Where the uncertainty comes from", content: <UncertaintyRange view={breakdown} /> }]
              : []),
          ]}
        />
      </ContentSection>

      <LatestPoll
        polling={polling}
        field={viableField(feed)}
        extra={
          <details style={{ margin: "0.5rem 0 1rem" }}>
            <summary>
              {HEAD_TO_HEAD.firm} ({HEAD_TO_HEAD.fieldwork}) also asked a Chow-or-Bradford question
            </summary>
            <p className="forecast-caption">
              The same {HEAD_TO_HEAD.sampleSize.toLocaleString()} respondents, {HEAD_TO_HEAD.denominator},
              asked two ways. A head-to-head question is not counted as a separate poll.
            </p>
            <table style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...cell, textAlign: "left" }}>Question</th>
                  <th style={cell}>Chow</th>
                  <th style={cell}>Bradford</th>
                  <th style={cell}>Alexander</th>
                  <th style={cell}>Others</th>
                  <th style={cell}>Undecided</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderTop: "1px solid #ccc" }}>
                  <td style={{ ...cell, textAlign: "left" }}>Full field</td>
                  <td style={cell}>{formatSharePct(full.chow)}</td>
                  <td style={cell}>{formatSharePct(full.bradford)}</td>
                  <td style={cell}>{formatSharePct(full.alexander)}</td>
                  <td style={cell}>{formatSharePct(full.others)}</td>
                  <td style={cell}>{formatSharePct(full.undecided)}</td>
                </tr>
                <tr style={{ borderTop: "1px solid #ccc" }}>
                  <td style={{ ...cell, textAlign: "left" }}>Chow or Bradford only</td>
                  <td style={cell}>{formatSharePct(h2h.chow)}</td>
                  <td style={cell}>{formatSharePct(h2h.bradford)}</td>
                  <td style={cell}>—</td>
                  <td style={cell}>—</td>
                  <td style={cell}>{formatSharePct(h2h.undecided)}</td>
                </tr>
              </tbody>
            </table>
          </details>
        }
      />
    </>
  );
}
