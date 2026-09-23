import { PollsterLink } from "@/components/pollster-link";
import { candidateName } from "@/lib/candidates";
import { formatDate, formatSharePct } from "@/lib/format";
import { pollMethodLabel, residualShares } from "@/lib/polling";
import type { CSSProperties } from "react";
import type { Poll } from "@/types/feeds";

type PollArchiveRowStyle = CSSProperties & { "--poll-field-count": number };

/** Full poll archive, newest fieldwork first (spec §/polls). Shows each poll's share for
 *  the current field, "—" where a candidate was not tested, its undecided share when
 *  its denominator keeps undecideds in, and which denominator it is. */
export function PollArchive({ polls, field }: { polls: Poll[]; field: string[] }) {
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
            const residual = residualShares(poll, field);
            return (
              <tr
                key={poll.poll_id}
                style={{
                  "--poll-field-count": Math.max(field.length + 2, 1),
                } as PollArchiveRowStyle}
              >
              <td data-label="Conducted" className="poll-archive__date">
                {formatDate(poll.date_conducted)}
              </td>
              <td data-label="Pollster" className="poll-archive__pollster">
                <PollsterLink firm={poll.firm} />
              </td>
              <td data-label="Sample" className="poll-archive__sample font-mono">
                {poll.sample_size ?? "—"}
              </td>
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
                {poll.denominator ?? "—"}
              </td>
              <td data-label="Survey method" className="poll-archive__method">
                {pollMethodLabel(poll.methodology)}
              </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
