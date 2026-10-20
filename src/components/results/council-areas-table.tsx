/**
 * The mayoral Live Tally by community council area (live-projection #127), under the Map: each
 * area's voting areas in, votes counted and candidates' shares, summed from the mayor's ward rows.
 * Facts of the count only: never a call, never the forecast (#12).
 */

import { areaTallies, type AreaTally } from "@/lib/council-areas";
import { shortLabel } from "@/lib/live-labels";
import { shareText } from "@/lib/live-share";
import { mayorParts, segmentWidth } from "@/lib/mayor-bar";
import type { LiveCandidate, LivePayload, LiveRace } from "@/types/live";

/** The area's two highest, by votes. */
function leaders(mayor: LiveRace, area: AreaTally): { candidate: LiveCandidate; votes: number }[] {
  return mayor.candidates
    .map((candidate) => ({ candidate, votes: area.votes[candidate.key] ?? 0 }))
    .filter((x) => x.votes > 0)
    .sort((a, b) => b.votes - a.votes)
    .slice(0, 2);
}

function Shares({ mayor, area }: { mayor: LiveRace; area: AreaTally }) {
  const share = (votes: number) => (100 * votes) / area.counted;
  const parts = mayorParts(mayor, (c) => area.votes[c.key] ?? 0);
  return (
    <>
      <span className="live-areas__leaders">
        {leaders(mayor, area).map(({ candidate, votes }) => (
          <span key={candidate.key}>
            {shortLabel(candidate)} {shareText(share(votes), votes)}
          </span>
        ))}
      </span>
      {/* The voters' list bar's track and segments, so a candidate's colour reads the same in both. */}
      <span className="live-turnout__track" aria-hidden="true">
        {parts.map((p) => (
          <span key={p.key} className="live-turnout__seg live-turnout__seg--votes" style={{ ...segmentWidth(share(p.votes)), background: p.colour }} />
        ))}
      </span>
      <span className="visually-hidden">{parts.map((p) => `${p.label} ${shareText(share(p.votes), p.votes)}`).join(", ")}</span>
    </>
  );
}

export function CouncilAreasTable({ payload, ward = null }: { payload: LivePayload | null; ward?: string | null }) {
  const mayor = payload?.races.find((r) => r.id === "mayor") ?? null;
  const tallies = areaTallies(mayor);
  let body;
  if (payload?.state !== "results") body = <p>The table fills in as wards report, from 8 p.m.</p>;
  else if (!mayor || mayor.state === "no_figures" || mayor.state === "acclaimed") body = <p>The mayor’s figures by area aren’t available.</p>;
  else
    body = (
      <>
        <div className="live-table-scroll">
          <table className="live-table">
            <thead>
              <tr>
                <th scope="col">Area</th>
                {/* Leading second, so it stays in view when a phone scrolls the table. */}
                <th scope="col">Leading</th>
                <th scope="col">Voting areas in</th>
                <th scope="col">Votes counted</th>
              </tr>
            </thead>
            <tbody>
              {tallies.map((area) => {
                const p = area.progress;
                return (
                  <tr key={area.name}>
                    <th scope="row">
                      {area.name}
                      {ward !== null && area.wards.includes(ward) && <span className="t-meta live-areas__ward">Includes Ward {ward}</span>}
                    </th>
                    <td className="live-areas__shares">{area.counted === 0 ? "No votes counted yet" : <Shares mayor={mayor} area={area} />}</td>
                    <td className="live-num">{p ? `${p.received} of ${p.total}` : "–"}</td>
                    <td className="live-num">{area.counted.toLocaleString("en-CA")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="t-meta">Bars show each area’s counted vote: the named candidates in their colours; grey is every other candidate.</p>
      </>
    );
  return (
    <section className="live-areas" aria-labelledby="live-areas-heading">
      <h2 id="live-areas-heading">Mayor by part of the city</h2>
      <p className="t-meta">The City’s four community council areas, summed from their wards.</p>
      {body}
    </section>
  );
}
