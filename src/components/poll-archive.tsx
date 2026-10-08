import { PollsterLink } from "@/components/pollster-link";
import { candidateName } from "@/lib/candidates";
import { formatDate, formatSharePct } from "@/lib/format";
import { headToHeadLabel, pollMethodLabel, residualShares } from "@/lib/polling";
import { Fragment, type CSSProperties } from "react";
import type { Poll } from "@/types/feeds";

type PollArchiveRowStyle = CSSProperties & { "--poll-field-count": number };

/** The reading's denominator, with "Chow or Bradford only" beside it when the
 *  reading offered only those two candidates. */
function denominatorLabel(poll: Poll, field: string[]): string {
  const only = headToHeadLabel(poll, field);
  if (poll.denominator && only) return `${poll.denominator} (${only})`;
  return poll.denominator ?? only ?? "—";
}

/** The share cells every archive row carries: the field, undecided, other reported
 *  choices, the denominator and the survey method. */
function ReadingCells({ poll, field }: { poll: Poll; field: string[] }) {
  const residual = residualShares(poll, field);
  return (
    <>
      {field.map((id) => (
        <td
          key={id}
          data-label={candidateName(id)}
          className="poll-archive__candidate-value font-mono"
        >
          {id in poll.shares ? formatSharePct(poll.shares[id]) : "—"}
        </td>
      ))}
      <td
        data-label="Undecided"
        className="poll-archive__candidate-value font-mono"
      >
        {residual.undecided === null ? "—" : formatSharePct(residual.undecided)}
      </td>
      <td
        data-label="Other reported choices"
        className="poll-archive__candidate-value font-mono"
      >
        {residual.other === null ? "—" : formatSharePct(residual.other)}
      </td>
      <td data-label="Denominator" className="poll-archive__denominator">
        {denominatorLabel(poll, field)}
      </td>
      <td data-label="Survey method" className="poll-archive__method">
        {pollMethodLabel(poll.methodology)}
      </td>
    </>
  );
}

/** Full poll archive, newest fieldwork first (spec §/polls). Shows each poll's share for
 *  the current field, "—" where a candidate was not tested, its undecided share when
 *  its denominator keeps undecideds in, and which denominator it is. A poll's
 *  Head-to-Head Reading sits indented beneath it: the same respondents, asked a
 *  second question, so it is not counted as a separate poll. An Excluded Poll is
 *  muted, badged "Not used in the forecast", and followed by its openable reason. */
export function PollArchive({
  polls,
  field,
  headToHead = [],
}: {
  polls: Poll[];
  field: string[];
  headToHead?: Poll[];
}) {
  const style = { "--poll-field-count": Math.max(field.length + 2, 1) } as PollArchiveRowStyle;
  // Date, firm, sample, the field, undecided, other, denominator and method.
  const columnCount = field.length + 7;
  return (
    <div className="poll-archive">
      <table className="poll-archive__table">
        <caption className="sr-only">Public mayoral polls, newest first</caption>
        <thead>
          <tr className="font-mono">
            <th>Date</th>
            <th>Firm</th>
            <th>Sample</th>
            {field.map((id) => (
              <th key={id} className="poll-archive__candidate-heading">
                {candidateName(id)}
              </th>
            ))}
            <th className="poll-archive__candidate-heading">Undecided</th>
            <th className="poll-archive__candidate-heading">Other reported choices</th>
            <th>Denominator</th>
            <th>Survey method</th>
          </tr>
        </thead>
        <tbody>
          {polls.map((poll) => {
            const reading = headToHead.find((entry) => entry.poll_id === poll.poll_id);
            const exclusion = poll.model_exclusion;
            return (
              <Fragment key={poll.poll_id}>
                <tr
                  style={style}
                  className={exclusion ? "poll-archive__row--excluded" : undefined}
                >
                  <td data-label="Conducted" className="poll-archive__date">
                    {formatDate(poll.date_conducted)}
                  </td>
                  <td data-label="Pollster" className="poll-archive__pollster">
                    <PollsterLink firm={poll.firm} />
                    {exclusion && (
                      <span className="badge poll-archive__unused">Not used in the forecast</span>
                    )}
                  </td>
                  <td data-label="Sample" className="poll-archive__sample font-mono">
                    {poll.sample_size ?? "—"}
                  </td>
                  <ReadingCells poll={poll} field={field} />
                </tr>
                {exclusion && (
                  <tr className="poll-archive__row--exclusion" style={style}>
                    <td colSpan={columnCount} className="poll-archive__exclusion">
                      <details className="poll-archive__why">
                        <summary>Why this poll is not used in the forecast</summary>
                        <p>{exclusion.explanation}</p>
                      </details>
                    </td>
                  </tr>
                )}
                {reading && (
                  <tr className="poll-archive__row--head-to-head" style={style}>
                    <td colSpan={3} className="poll-archive__subrow-label">
                      <span aria-hidden="true">↳ </span>Not counted separately
                    </td>
                    <ReadingCells poll={reading} field={field} />
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
