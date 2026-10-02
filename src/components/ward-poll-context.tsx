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
  const context = poll.historical_context;
  if (!context) return null;
  const base = context.unweighted_base ?? context.reported_base;
  const other = poll.candidates.filter((candidate) => candidate.is_residual);
  return (
    <div className="ward-poll-context">
      <h3>How far a ward poll can miss</h3>
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
        Published support among {poll.denominator}, with past polling errors
        shown alongside.
      </p>
      <ShareRangeChart
        rows={context.rows.map((row) => ({
          id: row.candidate_id,
          name: row.candidate_name,
          point: row.reported_share * 100,
          lower: row.lower * 100,
          upper: row.upper * 100,
          color: "var(--text-strong)",
        }))}
        middleLabel="50%"
        pointLabel="Poll"
        pointDescription="published share"
        rangeDescription="historical comparison"
        caption={
          <>
            Tick: published share. Band: the range of misses in{" "}
            {benchmark.contest_count} past ward polls. This is a historical
            comparison, not a confidence interval.
          </>
        }
      />
      {other.map((candidate) => (
        <p key={candidate.candidate_id} className="font-mono">
          {candidate.candidate_name}: {formatSharePct(candidate.share)}
        </p>
      ))}
      <p className="ward-poll-context__note">
        {poll.methodology}. Effective sample size is not published. The
        historical evidence covers{" "}
        {benchmark.cycle_count === 1
          ? "one election"
          : `${benchmark.cycle_count} elections`}
        . <Link href="/how-it-works/#ward-polls">How to read these bands</Link>.
      </p>
    </div>
  );
}
