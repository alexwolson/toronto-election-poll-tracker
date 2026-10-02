import Link from "next/link";
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
              : "Both ranges favour the reported leader."}
        </strong>
      </p>
      <p>
        A small mixed-method sample and little historical evidence leave substantial
        uncertainty about who will win. These bands show how uncertain {context.leader.candidate_name}’s lead is under two plausible models of polling error.
      </p>
      <div className="ward-lead-chart">
        <div className="ward-lead-chart__axis" aria-hidden="true">
          <span />
          <div>
            <span>Another named candidate ahead</span>
            <span>{context.leader.candidate_name} ahead</span>
          </div>
        </div>
        {ranges.map((range, index) => (
          <div className="ward-lead-chart__row" key={range.model}>
            <span>{index === 0 ? "Model" : "Alternative assumptions"}</span>
            <span
              className="ward-lead-chart__track"
              role="img"
              aria-label={`${context.leader.candidate_name}'s lead over the strongest other named candidate: ${index === 0 ? "model" : "alternative assumptions"}, central 80% range ${(range.lower * 100).toFixed(1)} to ${(range.upper * 100).toFixed(1)} percentage points`}
            >
              <span
                className="ward-lead-chart__band"
                style={{
                  left: `${(range.lower + 1) * 50}%`,
                  width: `${(range.upper - range.lower) * 50}%`,
                }}
              />
              <span className="ward-lead-chart__zero" />
            </span>
          </div>
        ))}
        <p className="forecast-caption">
          Central 80% modelled ranges. The line marks a tie. Shares are among
          poll-named candidates; unreported candidates are outside the model.
        </p>
      </div>
      <p className="ward-poll-context__note">
        These models draw on just {benchmark.contest_count} ward races from one
        election. They cannot establish reliable chances of winning.{" "}
        <Link href="/how-it-works/#ward-polls">How to read these ranges</Link>.
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
