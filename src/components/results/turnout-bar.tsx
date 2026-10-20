/**
 * The voters' list bar (Alex, 2026-10-19): everyone on the voters' list before election day, citywide
 * or in the page's ward, split into who has been counted voting for each mayoral candidate and the
 * rest, with 2023's share marked (only 2023's, Alex). Before 8 p.m. the city's advance voters (the City's
 * figure has no ward breakdown); while counting the rest is "not counted yet, or didn't vote", never
 * labelled as non-voters, since the two can't be told apart until the count is in; then "didn't
 * vote". Facts of the count and the list, never a projection.
 */

import { mayorParts, segmentWidth } from "@/lib/mayor-bar";
import { TURNOUT, TURNOUT_NOTE } from "@/lib/turnout";
import { shareText, votesTotal } from "@/lib/live-share";
import type { LiveRace } from "@/types/live";

const pct = (x: number) => `${x.toFixed(1)}%`;

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
    for (const p of mayorParts(race, (c) => votesOf(c.key, c.votes))) {
      segments.push({ key: p.key, label: p.label, share: (100 * p.votes) / electors, people: p.votes, className: "votes", colour: p.colour });
    }
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

  // One figure for the line: what the bar shows so far.
  const shown = segments.filter((x) => x.className === "votes" || x.className === "advance");
  const shownShare = shown.reduce((a, x) => a + x.share, 0);
  const shownText = shareText(shownShare, shown.reduce((a, x) => a + x.people, 0));
  const summary =
    race.state === "before_results"
      ? ward === null
        ? `${TURNOUT.advance_voters["2026"].toLocaleString("en-CA")} advance voters (${shownText})`
        : null
      : segments.some((x) => x.className === "novote")
        ? `${shownText} voted`
        : `${shownText} counted so far`;
  const where = ward === null ? "" : ` · Ward ${ward}`;
  return (
    <figure className="live-turnout">
      <figcaption className="live-turnout__head t-meta">
        <span>
          Turnout{where} · {electors.toLocaleString("en-CA")} on the voters’ list
        </span>
        {summary && <span className="live-turnout__figure">{summary}</span>}
      </figcaption>
      <div className="live-turnout__track" aria-hidden="true">
        {segments.map((x) => (
          <span
            key={x.key}
            className={`live-turnout__seg live-turnout__seg--${x.className}`}
            style={{ ...segmentWidth(x.share), ...(x.colour ? { background: x.colour } : {}) }}
          />
        ))}
        <span className="live-turnout__mark" style={{ left: `${area.share_2023}%` }} />
      </div>
      {/* The candidates' colours match the rows below, so the bar needs no legend; screen readers get it in words. */}
      <p className="visually-hidden">{segments.map((x) => `${x.label} ${shareText(x.share, x.people)}`).join(", ")}</p>
      <p className="live-turnout__past t-meta">
        <i className="live-turnout__swatch--mark" aria-hidden="true" />
        Turnout in 2023: {pct(area.share_2023)}
      </p>
    </figure>
  );
}

/** What the voters' list bar measures, with the card's other disclosures (quieter pass). */
export function AboutTurnout() {
  return (
    <div className="faq">
      <details className="live-about-turnout">
        <summary>About turnout</summary>
        <div className="faq__a">
          <p className="forecast-caption">{TURNOUT_NOTE}</p>
        </div>
      </details>
    </div>
  );
}
