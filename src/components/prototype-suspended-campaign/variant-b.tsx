/**
 * PROTOTYPE variant B, "Two-candidate race". A dated status strip replaces the
 * banner; the hero becomes a Chow-versus-Bradford face-off; Alexander leaves
 * the charts for an "Also on the ballot" list; recent polls are a short table
 * in which a head-to-head question is an indented row under its own poll.
 */
import { ContentSection } from "@/components/content-section";
import { MarginOutcomes } from "@/components/forecast/margin-outcomes";
import { VoteShareRanges } from "@/components/forecast/vote-share-ranges";
import { SectionHeading } from "@/components/section-heading";
import { candidateName } from "@/lib/candidates";
import { formatDate, formatSharePct } from "@/lib/format";
import { chance, electionDayShares, marginOutcomes } from "@/lib/mayoral-forecast";
import type { MayoralForecastFeed, MayoralPollingFeed } from "@/types/feeds";
import { HEAD_TO_HEAD, withS2 } from "./data";

export function VariantB({
  feed: live,
  polling,
  asOfDate,
}: {
  feed: MayoralForecastFeed;
  polling: MayoralPollingFeed;
  asOfDate: string | null;
}) {
  const feed = withS2(live);
  const margin = marginOutcomes(feed);
  const shares = electionDayShares(feed);
  if (!margin || !shares) return null;
  const pair = [margin.leader.candidateId, margin.challenger.candidateId];
  const chartRows = shares.rows.filter((r) => r.candidateId && pair.includes(r.candidateId));
  const offRows = shares.rows.filter((r) => !r.candidateId || !pair.includes(r.candidateId));
  const alexanderId = shares.rows.find((r) => r.slug === "alexander")?.candidateId ?? "";
  const columns = [...pair, alexanderId];
  const recent = [...polling.polls]
    .sort((a, b) => b.date_conducted.localeCompare(a.date_conducted))
    .slice(0, 4);
  const h2h = HEAD_TO_HEAD.headToHead;
  const cell: React.CSSProperties = { padding: "0.4rem 0.6rem", textAlign: "right", whiteSpace: "nowrap" };

  return (
    <>
      <div className="wrap" style={{ paddingTop: "1rem" }}>
        <p
          style={{
            display: "inline-block",
            margin: 0,
            padding: "0.35rem 0.75rem",
            borderLeft: "4px solid currentColor",
            background: "var(--color-surface-tint, #f3f1ea)",
            fontSize: "0.95rem",
          }}
        >
          <strong>Race update, Oct. 6:</strong> Chris Alexander suspended his campaign. He remains on the
          ballot.
        </p>
      </div>

      <ContentSection className="forecast-lead" aria-labelledby="forecast-heading">
        <h1 id="forecast-heading">
          {margin.leader.surname} vs. {margin.challenger.surname}
        </h1>
        <div
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))", gap: "1rem", margin: "1rem 0" }}
        >
          {chartRows.map((row) => (
            <div key={row.slug} style={{ borderTop: `6px solid ${row.colorVar}`, paddingTop: "0.75rem" }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: "1.1rem" }}>{row.name}</p>
              <p style={{ margin: "0.25rem 0", fontSize: "2.6rem", fontWeight: 800, lineHeight: 1 }}>
                {chance(row.winProbability)}
              </p>
              <p style={{ margin: 0 }}>chance of winning</p>
              <p style={{ margin: "0.5rem 0 0" }}>
                About {Math.round(row.median)}% of the vote (likely {Math.round(row.lower)}–{Math.round(row.upper)}%)
              </p>
            </div>
          ))}
        </div>
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
        <SectionHeading headingId="forecast-details-heading" title="What the vote could look like" />
        <VoteShareRanges view={{ ...shares, rows: chartRows }} />
        <h3 style={{ marginTop: "1.5rem" }}>Also on the ballot</h3>
        <ul>
          {offRows.map((row) => (
            <li key={row.slug}>
              <strong>
                {row.slug === "alexander" ? "Chris Alexander, campaign suspended" : row.name}
              </strong>
              : about {row.median < 1.5 ? row.median.toFixed(1) : Math.round(row.median)}% (likely{" "}
              {row.lower.toFixed(1)}–{row.upper.toFixed(1)}%)
            </li>
          ))}
        </ul>
      </ContentSection>

      <ContentSection tint className="polling-takeaway" aria-labelledby="recent-polls-heading">
        <SectionHeading headingId="recent-polls-heading" title="Recent polls" />
        <table style={{ borderCollapse: "collapse", width: "100%", maxWidth: "48rem" }}>
          <thead>
            <tr>
              <th style={{ ...cell, textAlign: "left" }}>Poll</th>
              {columns.map((id) => (
                <th key={id} style={cell}>
                  {candidateName(id)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recent.flatMap((poll) => {
              const rowsOut = [
                <tr key={poll.poll_id} style={{ borderTop: "1px solid #ccc" }}>
                  <td style={{ ...cell, textAlign: "left" }}>
                    {poll.firm}, {formatDate(poll.date_conducted)}
                    <br />
                    <small>{poll.denominator ?? "denominator not stated"}</small>
                  </td>
                  {columns.map((id) => (
                    <td key={id} style={cell}>
                      {id in poll.shares ? formatSharePct(poll.shares[id]) : "—"}
                    </td>
                  ))}
                </tr>,
              ];
              if (poll.poll_id === HEAD_TO_HEAD.pollId) {
                rowsOut.push(
                  <tr key={`${poll.poll_id}-h2h`}>
                    <td style={{ ...cell, textAlign: "left", paddingLeft: "1.6rem", fontSize: "0.9rem" }}>
                      ↳ Same respondents, Chow or Bradford only
                      <br />
                      <small>All respondents (undecided {formatSharePct(h2h.undecided)})</small>
                      <br />
                      <em>head-to-head question, not counted separately</em>
                    </td>
                    <td style={cell}>{formatSharePct(h2h.chow)}</td>
                    <td style={cell}>{formatSharePct(h2h.bradford)}</td>
                    <td style={cell}>not offered</td>
                  </tr>,
                );
              }
              return rowsOut;
            })}
          </tbody>
        </table>
      </ContentSection>
    </>
  );
}
