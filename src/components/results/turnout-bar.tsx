/**
 * The voters' list bar (Alex, 2026-10-19): everyone on the voters' list before election day, citywide
 * or in the page's ward, split into who has been counted voting for each mayoral candidate and the
 * rest, with 2022's and 2023's share marked. Before 8 p.m. the city's advance voters (the City's
 * figure has no ward breakdown); while counting the rest is "not counted yet, or didn't vote", never
 * labelled as non-voters, since the two can't be told apart until the count is in; then "didn't
 * vote". Facts of the count and the list, never a projection.
 */

import { liveColour } from "@/lib/live-colour";
import { shortLabel } from "@/lib/live-labels";
import { TURNOUT, TURNOUT_NOTE } from "@/lib/turnout";
import { shareText, votesTotal } from "@/lib/live-share";
import type { LiveRace } from "@/types/live";

const NEUTRAL = "var(--color-disengaged)";
const pct = (x: number) => `${x.toFixed(1)}%`;
const width = (x: number) => ({ width: `${+x.toFixed(2)}%` });

interface Segment {
  key: string;
  label: string;
  share: number;
  /** The people the segment counts, so a tiny share reads "<0.1%", never "0.0%" (`shareText`). */
  people: number;
  className: string;
  colour?: string;
}

export function TurnoutBar({ race, ward }: { race: LiveRace; ward: string | null }) {
  if (race.level !== "mayor") return null;
  const area = ward === null ? TURNOUT.city : TURNOUT.wards[ward];
  if (!area || area.electors_2026 <= 0) return null;
  const electors = area.electors_2026;
  const wardRow = ward === null ? null : (race.wards?.find((w) => w.num === ward) ?? null);
  const votesOf = (key: string, cityVotes: number | null) =>
    ward === null ? (cityVotes ?? 0) : (wardRow?.votes?.[key] ?? 0);

  const segments: Segment[] = [];
  if (race.state === "before_results") {
    if (ward === null) {
      const advance = TURNOUT.advance_voters["2026"];
      segments.push({ key: "advance", label: "Advance voters", share: (100 * advance) / electors, people: advance, className: "advance" });
    }
  } else {
    // The forecast's two, in the payload's order, then everyone else together: the mayor card's rows.
    const named = race.candidates.filter((c) => c.candidate_id);
    const rest = race.candidates.filter((c) => !c.candidate_id);
    for (const c of named) {
      const votes = votesOf(c.key, c.votes);
      segments.push({ key: c.key, label: shortLabel(c), share: (100 * votes) / electors, people: votes, className: "votes", colour: liveColour(c, NEUTRAL) });
    }
    const others = rest.reduce((a, c) => a + votesOf(c.key, c.votes), 0);
    segments.push({ key: "others", label: `${rest.length} others`, share: (100 * others) / electors, people: others, className: "votes", colour: NEUTRAL });
    const counted = ward === null ? race.candidates.reduce((a, c) => a + (c.votes ?? 0), 0) : votesTotal(wardRow?.votes);
    const complete =
      ward === null
        ? race.state === "all_units_in"
        : !!wardRow?.progress && wardRow.progress.total > 0 && wardRow.progress.received >= wardRow.progress.total;
    const remaining = Math.max(0, 100 - (100 * counted) / electors);
    const people = Math.max(0, electors - counted);
    segments.push(
      complete
        ? { key: "novote", label: "Didn’t vote", share: remaining, people, className: "novote" }
        : { key: "pending", label: "Not counted yet, or didn’t vote", share: remaining, people, className: "pending" },
    );
  }

  const where = ward === null ? "Citywide" : `Ward ${ward}`;
  return (
    <figure className="live-turnout">
      <figcaption className="kicker">
        Voters’ list · {where} · {electors.toLocaleString("en-CA")} electors
      </figcaption>
      <div className="live-turnout__track" aria-hidden="true">
        {segments.map((s) => (
          <span
            key={s.key}
            className={`live-turnout__seg live-turnout__seg--${s.className}`}
            style={{ ...width(s.share), ...(s.colour ? { background: s.colour } : {}) }}
          />
        ))}
        <span className="live-turnout__mark" style={{ left: `${area.share_2022}%` }} />
        <span className="live-turnout__mark" style={{ left: `${area.share_2023}%` }} />
      </div>
      <p className="live-turnout__legend t-meta">
        {segments.map((s) => (
          <span key={s.key} className="live-turnout__item">
            <i className={`live-turnout__swatch live-turnout__seg--${s.className}`} style={s.colour ? { background: s.colour } : undefined} />
            {s.label} {shareText(s.share, s.people)}
          </span>
        ))}
        <span className="live-turnout__item">
          <i className="live-turnout__swatch live-turnout__swatch--mark" />
          Votes for mayor in 2022 {pct(area.share_2022)} · 2023 {pct(area.share_2023)}
        </span>
      </p>
      <p className="forecast-caption live-turnout__note">{TURNOUT_NOTE}</p>
    </figure>
  );
}
