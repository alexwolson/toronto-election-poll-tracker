import Link from "next/link";
import { WardLeadHistogram } from "@/components/ward-lead-histogram";
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
  const ranges = context.leader.ranges;
  const crossZero = ranges.filter(
    (range) => range.lower <= 0 && range.upper >= 0,
  ).length;
  return (
    <div className="ward-poll-context">
      <h4 className="font-heading">How uncertain is the lead?</h4>
      <p>
        <strong>
          {crossZero === ranges.length
            ? "The reported lead could reverse."
            : crossZero
              ? "The models disagree about how secure the lead is."
              : "Both error models favour the reported leader."}
        </strong>
      </p>
      <WardLeadHistogram
        name={context.leader.candidate_name}
        scenarios={context.leader.scenarios}
      />
      <p className="ward-poll-context__note">
        Small samples and just {benchmark.contest_count} historical ward races
        from one election cannot establish reliable win odds.{" "}
        <Link href="/how-it-works/#ward-polls">
          How to read these scenarios
        </Link>
        .
      </p>
    </div>
  );
}
