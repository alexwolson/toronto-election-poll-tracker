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
  const byLeader = new Map<string, { name: string; colour: string; left: number }>();
  for (const r of ordered) {
    if (!r.leader) continue;
    const at = byLeader.get(r.leader.key) ?? { name: shortLabel(r.leader), colour: liveColour(r.leader), left: 0 };
    byLeader.set(r.leader.key, { ...at, left: at.left + r.left });
  }
  const split = [...byLeader.values()].sort((a, b) => b.left - a.left);
  // The prototype's layout: the total and its split on the left, each ward's squares on the right.
  return (
    <div className="outstanding">
      <div className="outstanding__total">
        <p className="outstanding__big">{total.toLocaleString("en-CA")}</p>
        <p className="outstanding__label">{total === 1 ? "voting area is not yet in" : "voting areas are not yet in"}</p>
        {total > 0 && (
          <>
            <span className="outstanding__split" aria-hidden="true">
              {split.map((l) => <span key={l.name} style={{ width: `${(100 * l.left) / total}%`, background: l.colour }} />)}
            </span>
            <ul className="outstanding__key">
              {split.map((l) => (
                <li key={l.name}>
                  <span className="live-table__swatch" style={{ background: l.colour }} aria-hidden="true" />
                  {`In wards ${l.name} leads`}
                  <b>{l.left.toLocaleString("en-CA")}</b>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <ul className="outstanding__list">
        {ordered.map((r) => (
          <li key={r.num}>
            <span className="outstanding__ward">{`${r.num} ${name.get(r.num) ?? ""}`}</span>
            <span className="outstanding__squares" aria-label={`${r.left} voting areas not yet in`}>
              {Array.from({ length: r.left }, (_, i) => (
                <i key={i} style={{ background: r.leader ? liveColour(r.leader) : "var(--color-disengaged)" }} />
              ))}
            </span>
            <span className="outstanding__margin">{r.leader && r.margin !== null ? `${shortLabel(r.leader)} +${r.margin.toFixed(1)}` : "–"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
