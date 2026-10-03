import { ContentSection } from "@/components/content-section";
import { WardPollContext } from "@/components/ward-poll-context";
import { formatDate, formatSharePct } from "@/lib/format";
import type { WardPoll, WardPollBenchmark } from "@/types/feeds";

function namedCandidates(poll: WardPoll) {
  return poll.candidates.filter((candidate) => !candidate.is_residual);
}

function fieldLabel(poll: WardPoll, baseline: WardPoll) {
  if (poll === baseline) return "Reported field";
  const baselineIds = new Set(
    namedCandidates(baseline).map((candidate) => candidate.candidate_id),
  );
  const added = namedCandidates(poll).filter(
    (candidate) => !baselineIds.has(candidate.candidate_id),
  );
  if (added.length > 0)
    return `With ${added.map((candidate) => candidate.candidate_name).join(" and ")}`;
  const ids = new Set(
    namedCandidates(poll).map((candidate) => candidate.candidate_id),
  );
  const removed = namedCandidates(baseline).filter(
    (candidate) => !ids.has(candidate.candidate_id),
  );
  if (removed.length > 0)
    return `Without ${removed.map((candidate) => candidate.candidate_name).join(" and ")}`;
  return poll.denominator.charAt(0).toUpperCase() + poll.denominator.slice(1);
}

function PollReading({
  poll,
  benchmark,
  label,
}: {
  poll: WardPoll;
  benchmark?: WardPollBenchmark | null;
  label?: string;
}) {
  const hasModel = Boolean(poll.modelled_context && benchmark);
  return (
    <div className="ward-poll-reading">
      {label && (
        <h4 className="ward-poll-report__title font-heading">{label}</h4>
      )}
      <div
        className={
          hasModel
            ? "ward-poll-report__body ward-poll-report__body--modelled"
            : "ward-poll-report__body"
        }
      >
        <div className="ward-poll-report__results">
          {hasModel && <h4 className="font-heading">Published results</h4>}
          <p className="ward-poll-report__denominator">
            {poll.denominator.charAt(0).toUpperCase() +
              poll.denominator.slice(1)}
          </p>
          <table className="ward-poll-results">
            <caption className="sr-only">
              Published results · {formatDate(poll.date_conducted)}
              {label && ` · ${label}`}
            </caption>
            <thead>
              <tr>
                <th scope="col">Candidate</th>
                <th scope="col">Support</th>
              </tr>
            </thead>
            <tbody>
              {poll.candidates.map((candidate) => (
                <tr key={candidate.candidate_id}>
                  <th scope="row">
                    {candidate.candidate_name}
                    {candidate.is_incumbent && (
                      <span className="candidate-row__tag">incumbent</span>
                    )}
                  </th>
                  <td>{formatSharePct(candidate.share)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {poll.undecided_share !== null && (
            <p className="ward-poll-report__note">
              Undecided, reported separately:{" "}
              {formatSharePct(poll.undecided_share)}.
            </p>
          )}
          {poll.modelled_context && (
            <p className="ward-poll-report__note">
              Effective sample size is not published.
            </p>
          )}
        </div>
        {benchmark && <WardPollContext poll={poll} benchmark={benchmark} />}
      </div>
    </div>
  );
}

function PollReport({
  polls,
  benchmark,
  latest = false,
}: {
  polls: WardPoll[];
  benchmark?: WardPollBenchmark | null;
  latest?: boolean;
}) {
  // Start with the smallest published field, then label fields that add names.
  // This is a presentation order; every reading and source percentage is retained.
  const readings = [...polls].sort(
    (a, b) => namedCandidates(a).length - namedCandidates(b).length,
  );
  const poll = readings[0];
  const Heading = latest ? "h3" : "h4";
  const base =
    poll.modelled_context?.unweighted_base ??
    poll.modelled_context?.reported_base;
  return (
    <article
      className="ward-poll-report"
      aria-label={`${poll.firm}, ${formatDate(poll.date_conducted)}`}
    >
      <header className="ward-poll-report__header">
        <Heading className="ward-poll-report__title font-heading">
          {latest && "Latest poll · "}
          <time dateTime={poll.date_conducted}>
            {formatDate(poll.date_conducted)}
          </time>
        </Heading>
        <p className="ward-poll-report__metadata">
          {poll.firm} · {poll.methodology}
          {base != null ? (
            <> · {base} decided/leaning respondents</>
          ) : (
            poll.sample_size !== null && <> · sample size {poll.sample_size}</>
          )}
          {poll.source_url && (
            <>
              {" "}
              · <a href={poll.source_url}>Source</a>
            </>
          )}
        </p>
      </header>
      <div
        className={
          readings.length > 1
            ? `ward-poll-fields${readings.some((reading) => reading.modelled_context && benchmark) ? " ward-poll-fields--modelled" : ""}`
            : undefined
        }
      >
        {readings.map((reading) => (
          <PollReading
            key={reading.poll_id}
            poll={reading}
            benchmark={benchmark}
            label={readings.length > 1 ? fieldLabel(reading, poll) : undefined}
          />
        ))}
      </div>
    </article>
  );
}

export function WardPolls({
  polls,
  benchmark,
}: {
  polls: WardPoll[];
  benchmark?: WardPollBenchmark | null;
}) {
  const ordered = [...polls].sort(
    (a, b) =>
      b.date_conducted.localeCompare(a.date_conducted) ||
      b.date_published.localeCompare(a.date_published),
  );
  const reports = new Map<string, WardPoll[]>();
  for (const poll of ordered) {
    // Group fields from the same dated source; do not infer a shared sample when
    // the feed has no source link or the reported sample metadata differs.
    const key = poll.source_url
      ? JSON.stringify([
          poll.firm,
          poll.date_conducted,
          poll.date_published,
          poll.source_url,
          poll.sample_size,
          poll.methodology,
          poll.modelled_context?.unweighted_base ?? null,
          poll.modelled_context?.reported_base ?? null,
        ])
      : poll.poll_id;
    const group = reports.get(key);
    if (group) group.push(poll);
    else reports.set(key, [poll]);
  }
  const [latest, ...earlier] = [...reports.values()];
  if (!latest) return null;
  return (
    <ContentSection className="ward-detail-section">
      <h2>Ward polls</h2>
      <PollReport polls={latest} benchmark={benchmark} latest />
      {earlier.length > 0 && (
        <div className="ward-poll-history">
          <h3>Earlier polls</h3>
          {earlier.map((report) => (
            <PollReport
              key={report[0].poll_id}
              polls={report}
              benchmark={benchmark}
            />
          ))}
        </div>
      )}
    </ContentSection>
  );
}
