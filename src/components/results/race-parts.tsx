"use client";

/**
 * The pieces of a race page (results redesign, Alex, 2026-10-24), drawn with the site's existing
 * classes: candidate panels (`.card`, `.mayor-projection__figures`, `.live-progress`), a quiet
 * race's whole field (`.race-compact__bar`, `.live-table`), the catch-up arithmetic
 * (`.forecast-chart` rows), the last result (`.live-table`) and the map locator. Facts of the
 * count; never a call.
 */

import { useId, useState } from "react";
import { candidateMeta } from "@/lib/candidates";
import { figureColour } from "@/lib/live-colour";
import { rangeText, shareText } from "@/lib/live-share";
import { WORDING, electedKey, eliminatedOf } from "@/lib/race-results";
import type { CatchUp } from "@/lib/race-model";
import type { CandidateSetup } from "@/lib/race-setup";
import type { ResultsMapWard } from "@/lib/results-map-data";
import type { PriorResult } from "@/types/feeds";
import type { LiveCandidate, LiveRace } from "@/types/live";

/** Text on a candidate's colour: dark on a light colour, white on a dark one (WCAG luminance). */
export function textOn(colour: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(colour);
  if (!m) return "#fff";
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(m[1].slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.25 ? "var(--ink)" : "#fff";
}

export const votesText = (n: number | null) => (n === null ? "–" : `${n.toLocaleString("en-CA")} ${n === 1 ? "vote" : "votes"}`);

/** Two shares that round alike (a one-vote race) get a second decimal so they don't read as a tie. */
export function sharePair(a: number, b: number): [string, string] {
  return a.toFixed(1) === b.toFixed(1) ? [`${a.toFixed(2)}%`, `${b.toFixed(2)}%`] : [`${a.toFixed(1)}%`, `${b.toFixed(1)}%`];
}

export function CandidateTag({ setup }: { setup: CandidateSetup | null }) {
  return setup?.tag ? <span className="candidate-row__tag">{setup.tag}</span> : null;
}

/** One candidate in the race: name, tag, background, share large in their colour, votes and a bar. */
export function CandidatePanel({ candidate, setup, colour }: { candidate: LiveCandidate; setup: CandidateSetup | null; colour: string }) {
  return (
    <div className="card race-panel" style={{ borderTopColor: colour, ["--c" as string]: colour }}>
      <p className="mayor-projection__name">
        {candidate.full_name} <CandidateTag setup={setup} />
      </p>
      {setup?.line && <p className="t-body-small">{setup.line}</p>}
      <p className="mayor-projection__figures">
        <strong style={{ color: figureColour(colour) }}>{shareText(candidate.share, candidate.votes)}</strong>
        <span className="mayor-projection__span">{votesText(candidate.votes)}</span>
      </p>
      <span className="live-progress__track" aria-hidden="true">
        <span className="live-progress__fill" style={{ width: `${Math.min(100, candidate.share ?? 0)}%`, background: colour }} />
      </span>
    </div>
  );
}

/** A quiet race's whole field: one bar of everyone's share, then a row each. */
export function WholeField({
  candidates,
  colourOf,
  setupOf,
  limit = 10,
}: {
  candidates: LiveCandidate[];
  colourOf: (c: LiveCandidate) => string;
  setupOf: (c: LiveCandidate) => CandidateSetup | null;
  limit?: number;
}) {
  const shown = candidates.slice(0, limit);
  const more = candidates.length - shown.length;
  return (
    <div className="race-field">
      <span className="race-compact__bar" role="img" aria-label={`Share of the vote: ${candidates.map((c) => `${c.full_name} ${shareText(c.share, c.votes)}`).join(", ")}`}>
        {candidates.map((c) => (
          <span key={c.key} style={{ width: `${c.share ?? 0}%`, background: colourOf(c) }} />
        ))}
      </span>
      <div className="live-table-scroll">
        <table className="live-table">
          <tbody>
            {shown.map((c) => {
              const setup = setupOf(c);
              return (
                <tr key={c.key}>
                  <th scope="row">
                    <span className="live-table__swatch" style={{ background: colourOf(c) }} aria-hidden="true" />
                    {c.full_name} <CandidateTag setup={setup} />
                    {setup?.line && <span className="t-meta race-field__line">{setup.line}</span>}
                  </th>
                  <td className="live-num">{c.votes === null ? "–" : c.votes.toLocaleString("en-CA")}</td>
                  <td className="live-num">{shareText(c.share, c.votes)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {more > 0 && (
        <p className="t-meta">
          <a href="#race-candidates">{`${more} more candidate${more === 1 ? "" : "s"}`}</a>
        </p>
      )}
    </div>
  );
}

const ARITHMETIC = "Arithmetic on the count: the votes left assume the remaining areas are the size of those counted.";

function GapRows({ rows }: { rows: { label: string; value: number; colour: string }[] }) {
  const max = Math.max(...rows.map((r) => r.value)) * 1.04;
  return (
    <div className="forecast-chart race-gaps" role="list">
      {rows.map((r) => (
        <div key={r.label} className="forecast-chart__row" role="listitem">
          <span className="forecast-chart__label">{r.label}</span>
          <span className="forecast-chart__track" aria-hidden="true">
            <span className="forecast-chart__bar" style={{ width: `${(100 * r.value) / max}%`, background: r.colour }} />
          </span>
          <strong className="forecast-chart__value">{Math.round(r.value).toLocaleString("en-CA")}</strong>
        </div>
      ))}
    </div>
  );
}

/** What it would take: in a three-way race, each challenger's gap against the votes left; else
 *  the share second place needs of what's left, or the gap against what's left when it can't. */
export function CatchUpFigure({
  catchUp,
  race,
  colourOf,
  nameOf,
}: {
  catchUp: CatchUp;
  /** The race's contenders, in count order. */
  race: LiveCandidate[];
  colourOf: (c: LiveCandidate) => string;
  nameOf: (c: LiveCandidate) => string;
}) {
  const [a, b] = race;
  const left = Math.round(catchUp.votesLeft).toLocaleString("en-CA");
  let body;
  let title: string;
  if (race.length >= 3) {
    title = "The gaps against the votes left";
    body = (
      <GapRows
        rows={[
          ...race.slice(1).map((c) => ({ label: `${nameOf(c)} trails by`, value: (a.votes ?? 0) - (c.votes ?? 0), colour: colourOf(c) })),
          { label: "Votes left (estimate)", value: catchUp.votesLeft, colour: "var(--color-disengaged)" },
        ]}
      />
    );
  } else if (catchUp.out) {
    title = "The gap is bigger than what’s left";
    body = (
      <GapRows
        rows={[
          { label: `Votes between ${nameOf(a)} and ${nameOf(b)}`, value: (a.votes ?? 0) - (b.votes ?? 0), colour: colourOf(a) },
          { label: "Votes left (estimate)", value: catchUp.votesLeft, colour: "var(--color-disengaged)" },
        ]}
      />
    );
  } else {
    const need = Math.round(catchUp.need * 100);
    title = `What ${nameOf(b)} needs from the votes left`;
    body = (
      <>
        <div className="race-catch" role="img" aria-label={`To draw level, ${nameOf(b)} needs about ${need}% of the remaining votes for the top two`}>
          <span style={{ width: `${need}%`, background: colourOf(b), color: textOn(colourOf(b)) }}>{`${nameOf(b)} ${need}%`}</span>
          <span style={{ width: `${100 - need}%`, background: colourOf(a), color: textOn(colourOf(a)) }}>{`${nameOf(a)} ${100 - need}%`}</span>
          <i className="race-catch__even" aria-hidden="true" />
        </div>
        <p className="t-meta race-catch__foot">
          {`About ${left} votes left in ${catchUp.left} voting areas`}
          <span className="race-catch__even-label">Even split</span>
        </p>
      </>
    );
  }
  return (
    <figure className="race-catch-figure">
      <figcaption>
        <h3 className="t-h3">{title}</h3>
      </figcaption>
      {body}
      <p className="t-meta">{ARITHMETIC}</p>
    </figure>
  );
}

/** The last comparable result beside tonight's, a third row in a three-way race. */
export function PriorTable({ prior, race, threeWay, fieldSize, complete = false }: { prior: PriorResult; race: LiveCandidate[]; threeWay: boolean; fieldSize: number; /** Every area in: no "so far". */ complete?: boolean }) {
  const [a, b, c] = race;
  const when = prior.year === 2022 ? "2022" : `${prior.year} by-election`;
  const [w, r] = sharePair(prior.winner_share * 100, (prior.runner_up_share ?? 0) * 100);
  const lead = a && b ? (a.votes ?? 0) - (b.votes ?? 0) : null;
  const margin = a && b ? (a.share ?? 0) - (b.share ?? 0) : null;
  return (
    <div className="live-table-scroll">
      <table className="live-table">
        <thead>
          <tr>
            <th scope="col" />
            <th scope="col">{when}</th>
            <th scope="col">{complete ? "Tonight" : "Tonight so far"}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">First</th>
            <td>{prior.winner_name} <strong className="live-num">{w}</strong></td>
            <td>{a ? <>{a.full_name} <strong className="live-num">{shareText(a.share, a.votes)}</strong></> : "–"}</td>
          </tr>
          <tr>
            <th scope="row">Second</th>
            <td>{prior.runner_up_name ? <>{prior.runner_up_name} <strong className="live-num">{r}</strong></> : "–"}</td>
            <td>{b ? <>{b.full_name} <strong className="live-num">{shareText(b.share, b.votes)}</strong></> : "–"}</td>
          </tr>
          {threeWay && c && (
            <tr>
              <th scope="row">Third</th>
              <td>–</td>
              <td>{c.full_name} <strong className="live-num">{shareText(c.share, c.votes)}</strong></td>
            </tr>
          )}
          <tr>
            <th scope="row">{threeWay ? "Lead over second" : "Margin"}</th>
            <td className="live-num">{prior.margin_votes === null ? "–" : `${votesText(prior.margin_votes)} · ${((prior.margin_share ?? 0) * 100).toFixed(1)} pts`}</td>
            <td className="live-num">{lead === null ? "–" : `${votesText(lead)} · ${(margin ?? 0).toFixed(1)} pts`}</td>
          </tr>
          <tr>
            <th scope="row">Candidates</th>
            <td className="live-num">{prior.field_size}</td>
            <td className="live-num">{fieldSize}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** Toronto with the race's wards filled in. */
export function Locator({ viewBox, wards, covered, label }: { viewBox: string; wards: ResultsMapWard[]; covered: string[]; label: string }) {
  const on = new Set(covered);
  return (
    <svg className="race-locator" viewBox={viewBox} role="img" aria-label={label}>
      {wards.map((w) => (
        <path key={w.num} d={w.path} fill={on.has(w.num) ? "var(--ink)" : "var(--rule)"} stroke="var(--paper)" strokeWidth={1} />
      ))}
    </svg>
  );
}

/** A candidate's colour chip; the forecast's named candidates keep their marker's shape (#16), so
 *  the two Chows and Bradford read apart without colour. */
function Swatch({ candidate, colour }: { candidate: LiveCandidate; colour: string }) {
  const slug = candidate.candidate_id ? candidateMeta(candidate.candidate_id)?.slug : null;
  return slug ? (
    <span className={`live-table__swatch candidate-marker candidate-marker--${slug}`} aria-hidden="true" />
  ) : (
    <span className="live-table__swatch" style={{ background: colour }} aria-hidden="true" />
  );
}

/** Every candidate in one table (Alex, the prototype): votes, then share, then a bar on one scale,
 *  and the votes counted. Counting, by votes, the candidates who can't win under one break (#90,
 *  #105) and the leader "Elected (unofficial)" at Night Close (#51); before then, the named
 *  candidates first, then ballot order, with dashes (#115). Each Possible Range is read out to
 *  screen readers. `fold` keeps that many rows and one "N other candidates" row, with a button
 *  to show everyone; `top` sets the first rows large, as the mayor's leaders are. */
export function CandidateTable({
  race,
  colourOf,
  setupOf,
  closed,
  fold,
  top = 0,
}: {
  race: LiveRace;
  colourOf: (c: LiveCandidate) => string;
  setupOf: (c: LiveCandidate) => CandidateSetup | null;
  closed: boolean;
  fold?: number;
  top?: number;
}) {
  const [all, setAll] = useState(false);
  const listId = useId();
  const counting = race.state === "counting" || race.state === "all_units_in";
  const ordered = counting
    ? [...race.candidates].sort((a, b) => (b.votes ?? -1) - (a.votes ?? -1))
    : [...race.candidates.filter((c) => c.candidate_id), ...race.candidates.filter((c) => !c.candidate_id)];
  const out = eliminatedOf(race);
  const elected = electedKey(race, closed);
  const inIt = ordered.filter((c) => !out.has(c.key));
  const outOf = ordered.filter((c) => out.has(c.key));
  // Folded: the first rows still in it, then the eliminated up to the fold, then everyone else in one row.
  const folds = fold !== undefined && !all && ordered.length > fold + 1;
  const shownIn = folds ? inIt.slice(0, fold) : inIt;
  const shownOut = folds ? outOf.slice(0, Math.max(0, fold! - shownIn.length)) : outOf;
  const rest = folds ? ordered.filter((c) => !shownIn.includes(c) && !shownOut.includes(c)) : [];
  const restOut = rest.length > 0 && rest.every((c) => out.has(c.key));
  const scale = Math.max(50, Math.max(0, ...ordered.map((c) => c.share ?? 0)) + 5);
  const total = race.candidates.reduce((sum, c) => sum + (c.votes ?? 0), 0);
  const sum = (key: "votes" | "share") => rest.reduce((t, c) => t + (c[key] ?? 0), 0);
  const isTop = (c: LiveCandidate) => counting && ordered.indexOf(c) < top && !out.has(c.key);
  const bar = (share: number | null, colour: string) =>
    counting && share !== null && <span className="live-bar"><span style={{ width: `${(100 * share) / scale}%`, background: colour }} /></span>;
  const row = (c: LiveCandidate) => {
    const possible = race.possible?.[c.key];
    const classes = [out.has(c.key) && "race-table__out", isTop(c) && "race-table__top"].filter(Boolean).join(" ");
    return (
      <tr key={c.key} className={classes || undefined}>
        <th scope="row">
          <Swatch candidate={c} colour={colourOf(c)} />
          {c.full_name} <CandidateTag setup={setupOf(c)} />
          {c.key === elected && <> <span className="badge badge--status">{WORDING.elected}</span></>}
          {possible && <span className="visually-hidden">{`Possible ${rangeText(possible.low, possible.high)}`}</span>}
        </th>
        <td className="live-num">{counting && c.votes !== null ? c.votes.toLocaleString("en-CA") : "–"}</td>
        <td className="live-num race-table__share">{counting && c.votes !== null ? shareText(c.share, c.votes) : "–"}</td>
        <td className="race-table__bar" aria-hidden="true">{bar(c.share, colourOf(c))}</td>
      </tr>
    );
  };
  const brk = (
    <tr className="race-table__break">
      <td colSpan={4}>
        {WORDING.eliminatedBelow}
      </td>
    </tr>
  );
  return (
    <>
      <div className="live-table-scroll">
        <table className="live-table race-table" id={listId}>
          <thead>
            <tr>
              <th scope="col">Candidate</th>
              <th scope="col" className="live-num">Votes</th>
              <th scope="col" className="live-num">Share</th>
              <th scope="col" className="race-table__bar"><span className="visually-hidden">Share bar</span></th>
            </tr>
          </thead>
          <tbody>
            {shownIn.map(row)}
            {(shownOut.length > 0 || restOut) && brk}
            {shownOut.map(row)}
            {rest.length > 0 && (
              <tr className={`race-table__rest${restOut ? " race-table__out" : ""}`}>
                <th scope="row">
                  <span className="live-table__swatch" style={{ background: "var(--color-disengaged)" }} aria-hidden="true" />
                  {`${rest.length} other candidates`}
                </th>
                <td className="live-num">{counting ? sum("votes").toLocaleString("en-CA") : "–"}</td>
                <td className="live-num race-table__share">{counting ? shareText(sum("share"), sum("votes")) : "–"}</td>
                <td className="race-table__bar" aria-hidden="true" />
              </tr>
            )}
            {counting && (
              <tr className="race-table__total">
                <th scope="row">Total votes counted</th>
                <td className="live-num">{total.toLocaleString("en-CA")}</td>
                <td colSpan={2} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {fold !== undefined && ordered.length > fold + 1 && (
        <button type="button" className="results-more" aria-controls={listId} aria-expanded={all} onClick={() => setAll((v) => !v)}>
          {all ? "Show fewer" : `Show all ${ordered.length} candidates`}
        </button>
      )}
    </>
  );
}
