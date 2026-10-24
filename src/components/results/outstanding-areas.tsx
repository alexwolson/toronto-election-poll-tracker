"use client";

/**
 * The mayor's voting areas not yet in, ward by ward (results redesign): one square per area the
 * City hasn't reported, in the colour of whoever leads that ward, most outstanding first. Counts
 * areas, not votes.
 */

import { liveColour } from "@/lib/live-colour";
import { shortLabel } from "@/lib/live-labels";
import type { ResultsWard } from "@/lib/results-wards";
import type { LiveRace } from "@/types/live";

export function OutstandingAreas({ mayor, wards }: { mayor: LiveRace; wards: ResultsWard[] }) {
  const name = new Map(wards.map((w) => [w.num, w.name]));
  const rows = (mayor.wards ?? []).flatMap((w) => {
    if (!w.progress || !w.votes) return [];
    const left = Math.max(0, w.progress.total - w.progress.received);
    const ranked = Object.entries(w.votes).sort((a, b) => b[1] - a[1]);
    const leader = mayor.candidates.find((c) => c.key === ranked[0]?.[0]);
    const margin = w.votes_counted && ranked[1] ? (100 * (ranked[0][1] - ranked[1][1])) / w.votes_counted : null;
    return [{ num: w.num, left, leader, margin }];
  });
  const total = rows.reduce((a, r) => a + r.left, 0);
  const ordered = rows.filter((r) => r.left > 0).sort((a, b) => b.left - a.left || Number(a.num) - Number(b.num));
  // How many of them lie in wards each candidate leads, most first.
  const byLeader = new Map<string, { name: string; left: number }>();
  for (const r of ordered) {
    if (!r.leader) continue;
    const at = byLeader.get(r.leader.key) ?? { name: shortLabel(r.leader), left: 0 };
    byLeader.set(r.leader.key, { ...at, left: at.left + r.left });
  }
  const split = [...byLeader.values()].sort((a, b) => b.left - a.left).map((l) => `${l.left.toLocaleString("en-CA")} in wards ${l.name} leads`);
  return (
    <div className="outstanding">
      <p className="t-body">
        <strong>{`${total.toLocaleString("en-CA")} ${total === 1 ? "voting area is" : "voting areas are"} not yet in`}</strong>
        {split.length > 0 && `: ${split.join(", ")}.`}
      </p>
      <div className="live-table-scroll">
        <table className="live-table">
          <tbody>
            {ordered.map((r) => (
              <tr key={r.num}>
                <th scope="row">{`${r.num} ${name.get(r.num) ?? ""}`}</th>
                <td>
                  <span className="outstanding__squares" aria-label={`${r.left} voting areas not yet in`}>
                    {Array.from({ length: r.left }, (_, i) => (
                      <i key={i} style={{ background: r.leader ? liveColour(r.leader) : "var(--color-disengaged)" }} />
                    ))}
                  </span>
                </td>
                <td className="live-num">{r.leader && r.margin !== null ? `${shortLabel(r.leader)} +${r.margin.toFixed(1)}` : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
