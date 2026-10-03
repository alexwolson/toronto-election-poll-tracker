import Link from "next/link";
import { WardLeadHistogram } from "@/components/ward-lead-histogram";
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
  const ranges = context.leader.ranges;
  const crossZero = ranges.filter(
    (range) => range.lower <= 0 && range.upper >= 0,
  ).length;
  return (
    <div className="ward-poll-context">
      <h3>How uncertain is the lead?</h3>
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
        <strong>
          {crossZero === ranges.length
            ? "The reported lead could reverse."
            : crossZero
              ? "The models disagree about how secure the lead is."
              : "Both error models favour the reported leader."}
        </strong>
      </p>
      <p>
        A small mixed-method sample and little historical evidence leave
        substantial uncertainty about who will win. The histogram shows how{" "}
        {context.leader.candidate_name}’s lead could change after allowing for
        polling error.
      </p>
      <WardLeadHistogram
        name={context.leader.candidate_name}
        scenarios={context.leader.scenarios}
      />
      <p className="ward-poll-context__note">
        These models draw on just {benchmark.contest_count} ward races from one
        election. They cannot establish reliable chances of winning.{" "}
        <Link href="/how-it-works/#ward-polls">
          How to read these scenarios
        </Link>
        .
      </p>
      <h4>Published toplines</h4>
      <p>{poll.denominator}; original percentages.</p>
      <ul>
        {poll.candidates.map((candidate) => (
          <li key={candidate.candidate_id}>
            {formatSharePct(candidate.share)} — {candidate.candidate_name}
          </li>
        ))}
      </ul>
      <p className="ward-poll-context__note">
        {poll.methodology}. Effective sample size is not published.
      </p>
    </div>
  );
}
