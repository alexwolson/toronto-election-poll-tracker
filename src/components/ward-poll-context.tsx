import Link from "next/link";
import { ShareRangeChart } from "@/components/share-range-chart";
import { formatDate, formatSharePct } from "@/lib/format";
import type { WardPoll, WardPollBenchmark } from "@/types/feeds";

export function WardPollContext({
  poll,
  benchmark,
}: {
  poll: WardPoll;
  benchmark: WardPollBenchmark;
}) {
  const context = poll.modelled_context;
  if (!context) return null;
  const base = context.unweighted_base ?? context.reported_base;
  return (
    <div className="ward-poll-context">
      <h3>What the named-candidate vote could look like</h3>
      <p className="font-mono">
        {poll.firm} · {formatDate(poll.date_conducted)}
        {base !== null && <> · {base} decided/leaning respondents</>}
        {poll.source_url && (
          <>
            {" "}
            · <a href={poll.source_url}>Source</a>
          </>
        )}
      </p>
      <p>
        Shares among the candidates named in this poll. Other candidates are
        excluded.
      </p>
      <ShareRangeChart
        rows={context.rows.map((row) => ({
          id: row.candidate_id,
          name: row.candidate_name,
          point: row.median * 100,
          lower: row.lower * 100,
          upper: row.upper * 100,
          color: "var(--text-strong)",
        }))}
        middleLabel="50%"
        pointLabel="Median"
        pointDescription="modelled median"
        rangeDescription="central 80% modelled range"
        caption={
          <>
            Median and central 80% range, using polling errors from{" "}
            {benchmark.contest_count} past ward races. These are model-based
            ranges, not chances of winning.
          </>
        }
      />
      <details>
        <summary>Published toplines</summary>
        <p>{poll.denominator}; original percentages.</p>
        <ul>
          {poll.candidates.map((candidate) => (
            <li key={candidate.candidate_id}>
              {formatSharePct(candidate.share)} — {candidate.candidate_name}
            </li>
          ))}
        </ul>
      </details>
      <p className="ward-poll-context__note">
        {poll.methodology}. Effective sample size is not published. The
        historical evidence covers one election.{" "}
        <Link href="/how-it-works/#ward-polls">How to read these ranges</Link>.
      </p>
    </div>
  );
}
