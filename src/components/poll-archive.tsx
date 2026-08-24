import { PollsterLink } from "@/components/pollster-link";
import { candidateName } from "@/lib/candidates";
import { formatDate, formatSharePct } from "@/lib/format";
import type { Poll } from "@/types/feeds";

/** Full poll archive, newest first (spec §/polls). Shows each poll's share for
 *  the current field; "—" where a candidate was not tested. */
export function PollArchive({ polls, field }: { polls: Poll[]; field: string[] }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="w-full border-collapse text-left" style={{ fontSize: "0.8rem" }}>
        <thead>
          <tr className="font-mono" style={{ borderBottom: "2px solid var(--line-strong)" }}>
            <th className="py-2 pr-3">Date</th>
            <th className="py-2 pr-3">Firm</th>
            <th className="py-2 pr-3">n</th>
            {field.map((id) => (
              <th key={id} className="py-2 pr-3 text-right">
                {candidateName(id)}
              </th>
            ))}
            <th className="py-2 pr-3">Method</th>
          </tr>
        </thead>
        <tbody>
          {polls.map((poll) => (
            <tr key={poll.poll_id} style={{ borderBottom: "1px solid var(--line-inner)" }}>
              <td className="py-2 pr-3 whitespace-nowrap">{formatDate(poll.date_conducted)}</td>
              <td className="py-2 pr-3">
                <PollsterLink firm={poll.firm} />
              </td>
              <td className="py-2 pr-3 font-mono">{poll.sample_size ?? "—"}</td>
              {field.map((id) => (
                <td key={id} className="py-2 pr-3 text-right font-mono">
                  {id in poll.shares ? formatSharePct(poll.shares[id]) : "—"}
                </td>
              ))}
              <td className="py-2 pr-3" style={{ color: "var(--text-faint)" }}>
                {poll.methodology}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
