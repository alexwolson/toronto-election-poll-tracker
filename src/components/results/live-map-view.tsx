"use client";

/**
 * The results Map (live-projection #103): the 25 wards shaded by one contest and one
 * measure, with a panel for the chosen ward and the same figures as a table. Facts of the
 * count only: who leads, by how much, how much is in, and whether a running incumbent
 * leads. Never a call, and never the forecast (#12).
 *
 * The ward shapes and keyboard model follow `race-map.tsx`: one roving tab stop, arrow
 * keys move to the nearest ward in that direction, Enter or Space holds a ward.
 */

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent } from "react";
import { CHOW_2023, chowCandidate, chowVs2023, chowWard, type ChowWard } from "@/lib/chow-2023";
import { liveColour } from "@/lib/live-colour";
import { placeCard } from "@/lib/live-map-card";
import { shareText, wardShare } from "@/lib/live-share";
import {
  incumbentStatus,
  leadTier,
  mayorWardLead,
  raceLead,
  reportingTier,
  type IncumbentStatus,
  type Lead,
  type ReportingTier,
} from "@/lib/live-map";
import {
  mapSelectionFrom,
  mapSelectionHref,
  shownMeasure,
  type MapContest as Contest,
  type MapMeasure as Measure,
  type MapSelection,
} from "@/lib/live-map-url";
import type { ResultsMapData, ResultsMapWard } from "@/lib/results-map-data";
import type { ResultsWard } from "@/lib/results-wards";
import type { LiveCandidate, LivePayload, LiveRace } from "@/types/live";
import { shortLabel } from "@/lib/live-labels";
import { raceTitle } from "./race-cards";

const CONTESTS: { id: Contest; label: string }[] = [
  { id: "mayor", label: "Mayor" },
  { id: "council", label: "Council" },
  { id: "tdsb", label: "TDSB" },
  { id: "tcdsb", label: "TCDSB" },
];

/** The fill for a ward's lead: stronger for a wider lead. */
const TIER_MIX = { narrow: 42, clear: 70, wide: 100 } as const;
const OTHER = "var(--live-other)";

const STATUS_WORDS: Record<IncumbentStatus, string> = {
  incumbent_leading: "Incumbent leading",
  incumbent_trailing: "Incumbent trailing",
  tied: "Tied",
  open_seat: "Open seat",
  not_known: "Incumbent not known",
  no_results: "No votes counted yet",
};

const STATUS_COLOUR: Partial<Record<IncumbentStatus, string>> = {
  incumbent_leading: "var(--live-inc-lead)",
  incumbent_trailing: "var(--live-inc-trail)",
  open_seat: "var(--live-open)",
};

const REPORTING_WORDS: Record<ReportingTier, string> = {
  none: "None in",
  some: "Under half",
  half: "Half or more",
  most: "90% or more",
  all: "All in",
};

const REPORTING_STEP: Record<ReportingTier, string | null> = {
  none: null,
  some: "var(--live-seq-1)",
  half: "var(--live-seq-2)",
  most: "var(--live-seq-3)",
  all: "var(--live-seq-4)",
};

/** The "vs 2023" steps (#110), from better for Chow than her change across the counted wards to
 *  worse: within 2 points, 2–5, and 5 or more, each way. */
const VS_STEPS = [
  { label: "5+ points better", fill: "var(--live-div-better-2)" },
  { label: "2–5 points better", fill: "var(--live-div-better-1)" },
  { label: "Within 2 points", fill: "var(--live-div-0)" },
  { label: "2–5 points worse", fill: "var(--live-div-worse-1)" },
  { label: "5+ points worse", fill: "var(--live-div-worse-2)" },
] as const;

type WardStyle = CSSProperties & { "--ward-fill"?: string };

interface Shade {
  /** The fill, or null for the empty ground. */
  fill: string | null;
  hatch?: boolean;
  /** What the shade says, in words, for the accessible name and the table. */
  words: string;
}

interface WardFacts {
  ward: ResultsMapWard;
  name: string;
  /** The race the contest shows in this ward; the mayor's citywide race for the mayor. */
  race: LiveRace | null;
  lead: Lead | null;
  reported: { received: number; total: number } | null;
  shade: Shade;
  /** Mayor only: Chow's live share in the ward beside her 2023 share there (#108). */
  chow?: ChowWard | null;
}

function mix(colour: string, percent: number): string {
  return percent >= 100 ? colour : `color-mix(in srgb, ${colour} ${percent}%, var(--paper))`;
}

function pct(value: number | null, digits = 1): string {
  // A candidate's share, never "0.0%"; whole percents (voting areas in) stay as they are.
  if (digits === 1) return shareText(value);
  return value === null ? "–" : `${value.toFixed(digits)}%`;
}

function nameOf(race: LiveRace | null, key: string | null): string {
  if (key === null) return "–";
  const candidate = race?.candidates.find((c) => c.key === key);
  return candidate ? shortLabel(candidate) : key;
}

/** Forecast-named mayoral candidates keep the forecast pages' colours (#16); others take their
 *  campaign colour where one was assigned, else the neutral. */
function candidateColour(candidate: LiveCandidate | undefined): string {
  return liveColour(candidate, OTHER);
}

function leadWords(race: LiveRace | null, lead: Lead): string {
  if (lead.leader === null) return "No votes counted yet";
  if (lead.tied) return `${nameOf(race, lead.leader)} and ${nameOf(race, lead.runnerUp)} tied`;
  return `${nameOf(race, lead.leader)} leads by ${lead.margin!.toFixed(1)} points`;
}

function wardRace(payload: LivePayload | null, data: ResultsMapData, contest: Contest, num: string): LiveRace | null {
  if (!payload) return null;
  const id =
    contest === "mayor" ? "mayor" : contest === "council" ? `councillor-${num}` : data.areas[num]?.[contest] ?? null;
  return id === null ? null : (payload.races.find((r) => r.id === id) ?? null);
}

function reportingShade(fraction: number | null): Shade {
  const tier = reportingTier(fraction);
  return { fill: REPORTING_STEP[tier], words: `${REPORTING_WORDS[tier]}${fraction === null ? "" : ` (${pct(100 * fraction, 0)})`}` };
}

function vsShade(vs: number | undefined, name: string): Shade {
  if (vs === undefined) return { fill: null, words: "No votes counted yet" };
  // Stepped on the figure as shown, so a ward reading "2.0 points" never sits in the band under 2.
  const shown = Math.round(vs * 10) / 10;
  const size = Math.abs(shown);
  const step = size < 2 ? 2 : shown > 0 ? (size < 5 ? 1 : 0) : size < 5 ? 3 : 4;
  const words =
    shown === 0
      ? `${name} in line with her 2023 pattern`
      : `${name} ${size.toFixed(1)} points ${shown > 0 ? "better" : "worse"} than her 2023 pattern`;
  return { fill: VS_STEPS[step].fill, words };
}

export interface LiveMapViewProps {
  data: ResultsMapData;
  payload: LivePayload | null;
  wards: ResultsWard[];
  /** The ward whose page this is: it starts held. */
  ward: string | null;
}

export function LiveMapView({ data, payload, wards, ward }: LiveMapViewProps) {
  // The URL sets the map it opens with (#126); the reader's changes are written back to it.
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pageWard = ward ?? data.wards[0]?.num ?? "1";
  const [fromUrl] = useState(() => mapSelectionFrom(searchParams, data.wards.map((w) => w.num)));
  const [selection, setSelection] = useState<MapSelection>({ ...fromUrl, ward: fromUrl.ward ?? pageWard });
  const { contest, measure, candidate: shareKey } = selection;
  const held = selection.ward ?? pageWard;
  const mayor = payload?.races.find((r) => r.id === "mayor") ?? null;
  const counting = payload?.state === "results";
  const shareChoices = (mayor?.candidates ?? []).filter((c) => (c.votes ?? 0) > 0).slice(0, 6);
  const shareCandidate = shareChoices.find((c) => c.key === shareKey) ?? shareChoices[0];
  const effectiveMeasure = shownMeasure(contest, measure);

  const names = new Map(wards.map((w) => [w.num, w.name]));

  const facts: WardFacts[] = (() => {
    const mayorWards = new Map((mayor?.wards ?? []).map((w) => [w.num, w]));
    // One scale for the share layer: up to the highest ward, rounded up to 10 points.
    const shareOf = (num: string) => (shareCandidate ? wardShare(mayorWards.get(num)?.votes, shareCandidate.key) : null);
    const top = Math.max(10, ...data.wards.map((w) => shareOf(w.num) ?? 0));
    const scaleMax = Math.ceil(top / 10) * 10;
    const vs2023 = chowVs2023(mayor);
    const chowName = chowCandidate(mayor)?.full_name ?? "Olivia Chow";

    return data.wards.map((shape): WardFacts => {
      const name = names.get(shape.num) ?? "";
      // Chow's 2023 share is static, so it shows from before results (#108).
      const chow = contest === "mayor" ? chowWard(mayor, mayorWards.get(shape.num) ?? { num: shape.num, votes: null }) : undefined;
      if (!counting) {
        return { ward: shape, name, race: null, lead: null, reported: null, shade: { fill: null, words: "Results from 8 p.m." }, chow };
      }
      if (contest === "mayor") {
        const mw = mayorWards.get(shape.num);
        const lead = mw ? mayorWardLead(mw) : null;
        const reported = mw?.progress ?? null;
        let shade: Shade;
        if (effectiveMeasure === "reporting") shade = reportingShade(lead?.reported ?? null);
        else if (effectiveMeasure === "vs2023") shade = vsShade(vs2023[shape.num], chowName);
        else if (effectiveMeasure === "share") {
          const share = shareOf(shape.num);
          shade =
            share === null
              ? { fill: null, words: "No votes counted yet" }
              : {
                  fill: mix(candidateColour(shareCandidate), Math.round(12 + (88 * share) / scaleMax)),
                  words: `${nameOf(mayor, shareCandidate?.key ?? null)} ${pct(share)}`,
                };
        } else if (!lead || lead.leader === null) shade = { fill: null, words: "No votes counted yet" };
        else if (lead.tied) shade = { fill: "var(--live-tied)", words: leadWords(mayor, lead) };
        else {
          const leader = mayor?.candidates.find((c) => c.key === lead.leader);
          shade = { fill: mix(candidateColour(leader), TIER_MIX[leadTier(lead.margin!)]), words: leadWords(mayor, lead) };
        }
        return { ward: shape, name, race: mayor, lead, reported, shade, chow };
      }
      const race = wardRace(payload, data, contest, shape.num);
      const lead = race ? raceLead(race) : null;
      const reported = race?.progress ?? null;
      let shade: Shade;
      if (!race) shade = { fill: null, words: "No race" };
      else if (race.state === "acclaimed") shade = { fill: "var(--live-tied)", hatch: true, words: "Acclaimed" };
      else if (effectiveMeasure === "reporting") shade = reportingShade(lead?.reported ?? null);
      else {
        const incumbents = contest === "council" ? data.council[shape.num] : data.trustee[race.id];
        const status = incumbentStatus(race, incumbents ?? null);
        const colour = STATUS_COLOUR[status];
        const words = `${STATUS_WORDS[status]}${lead && lead.leader !== null ? `: ${leadWords(race, lead)}` : ""}`;
        if (status === "no_results") shade = { fill: null, words: STATUS_WORDS[status] };
        else if (status === "tied") shade = { fill: "var(--live-tied)", words };
        else if (status === "not_known") shade = { fill: "var(--live-tied)", hatch: true, words };
        else shade = { fill: mix(colour!, TIER_MIX[leadTier(lead!.margin!)]), words };
      }
      return { ward: shape, name, race, lead, reported, shade };
    });
  })();

  const [preview, setPreview] = useState<string | null>(null);
  // The ward card (#130): under the mouse, or pinned where it was clicked (map units), or at the
  // ward's label point when the keyboard or a shared link picked it (`at` null).
  const [hovered, setHovered] = useState<string | null>(null);
  const [pin, setPin] = useState<{ num: string; at: { x: number; y: number } | null } | null>(
    fromUrl.ward === null ? null : { num: fromUrl.ward, at: null },
  );
  const svgRef = useRef<SVGSVGElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const mouse = useRef({ x: 0, y: 0 });
  // Set while Close hands focus back to the ward, so that focus doesn't pin the card again.
  const closing = useRef(false);
  // Keyboard focus only: a click also focuses the ward, but the held outline already shows it.
  const [focused, setFocused] = useState<string | null>(null);
  const pointerDown = useRef(false);
  const [announcement, setAnnouncement] = useState("");
  const refs = useRef<Record<string, SVGPathElement | null>>({});
  const pathOf = (num: string) => data.wards.find((w) => w.num === num)?.path;
  // The side panel keeps the held ward; the card is the quick look at others (#130).
  const active = facts.find((f) => f.ward.num === held) ?? facts[0];
  const cardFacts = facts.find((f) => f.ward.num === (pin?.num ?? hovered)) ?? null;

  /** The selection as a link gives it: what the map shows, and no parameter for the page's own ward. */
  const linkable = (next: MapSelection): MapSelection => ({
    contest: next.contest,
    measure: shownMeasure(next.contest, next.measure),
    candidate: (shareChoices.find((c) => c.key === next.candidate) ?? shareChoices[0])?.key ?? null,
    ward: next.ward === pageWard ? null : next.ward,
  });
  /** Applies a change and writes it to the URL, replacing the entry, so Back leaves the page. */
  const select = (change: Partial<MapSelection>) => {
    const next = { ...selection, ...change };
    setSelection(next);
    window.history.replaceState(null, "", mapSelectionHref(pathname, searchParams, linkable(next)));
  };

  /** The card's point in the stage's pixels: the pin's, its ward's label point, or the mouse's. */
  const cardPoint = (): { x: number; y: number } | null => {
    const svg = svgRef.current;
    const stage = svg?.parentElement;
    if (!svg || !stage) return null;
    const box = stage.getBoundingClientRect();
    if (!pin) return { x: mouse.current.x - box.left, y: mouse.current.y - box.top };
    const label = data.wards.find((w) => w.num === pin.num)?.label;
    const at = pin.at ?? (label ? { x: label.x, y: label.y } : null);
    const ctm = svg.getScreenCTM?.();
    if (!at || !ctm) return null;
    const p = new DOMPoint(at.x, at.y).matrixTransform(ctm);
    return { x: p.x - box.left, y: p.y - box.top };
  };
  /** Moves the card beside its point, without re-rendering the map. */
  const placeCardNow = () => {
    const el = cardRef.current;
    const stage = svgRef.current?.parentElement;
    const point = cardPoint();
    if (!el || !stage || !point) return;
    const { left, top } = placeCard(point, { w: el.offsetWidth, h: el.offsetHeight }, { w: stage.clientWidth, h: stage.clientHeight });
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  };
  useLayoutEffect(placeCardNow);
  // The window's listeners, added once, call the latest render's handlers.
  const latest = useRef({ placeCardNow, closeCard: () => {} });
  useEffect(() => {
    const onResize = () => latest.current.placeCardNow();
    const onKeyDown = (e: globalThis.KeyboardEvent) => e.key === "Escape" && latest.current.closeCard();
    window.addEventListener("resize", onResize);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("resize", onResize);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  /** A click pins the card where it landed; a second click on the pinned ward unpins it. */
  const clickWard = (event: MouseEvent<SVGPathElement>, num: string) => {
    // A tap's emulated mouseenter has no mouseleave, so a pin or unpin clears the hover.
    setHovered(null);
    if (pin?.num === num) {
      setPin(null);
      return;
    }
    hold(num);
    const ctm = svgRef.current?.getScreenCTM?.();
    const at = ctm ? new DOMPoint(event.clientX, event.clientY).matrixTransform(ctm.inverse()) : null;
    setPin({ num, at: at ? { x: at.x, y: at.y } : null });
  };
  /** Unpins the card and hands focus back to its ward (Close, Escape). */
  const closeCard = () => {
    const num = pin?.num;
    if (!num) return;
    setPin(null);
    setHovered(null);
    closing.current = true;
    refs.current[num]?.focus();
    closing.current = false;
  };
  useLayoutEffect(() => {
    latest.current = { placeCardNow, closeCard };
  });

  const hold = (num: string) => {
    select({ ward: num });
    const f = facts.find((x) => x.ward.num === num);
    if (f) setAnnouncement(`Ward ${num} ${f.name}: ${f.shade.words}`);
  };

  const onKey = (event: KeyboardEvent<SVGPathElement>, num: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      // Like a click: Enter on the pinned ward unpins it, else holds and pins it.
      if (pin?.num === num) setPin(null);
      else {
        hold(num);
        setPin({ num, at: null });
      }
      return;
    }
    const next = nearestWard(data.wards, num, event.key);
    if (next === null) return;
    event.preventDefault();
    hold(next);
    refs.current[next]?.focus();
  };

  const measures: { id: Measure; label: string }[] =
    contest === "mayor"
      ? [
          { id: "leader", label: "Leader" },
          { id: "share", label: "Candidate share" },
          { id: "reporting", label: "Voting areas in" },
          { id: "vs2023", label: "vs 2023" },
        ]
      : [
          { id: "leader", label: "Incumbent" },
          { id: "reporting", label: "Voting areas in" },
        ];

  const legend = legendFor(contest, effectiveMeasure, mayor, facts, candidateColour(shareCandidate));

  return (
    <section className="live-map" aria-labelledby="live-map-heading">
      <div className="live-map__head">
        <h2 id="live-map-heading">Results by ward</h2>
        <div className="live-map__controls">
          <div className="ward-index-sort live-seg" role="group" aria-label="Race">
            {CONTESTS.map((c) => (
              <button key={c.id} type="button" aria-pressed={contest === c.id} onClick={() => select({ contest: c.id })}>
                {c.label}
              </button>
            ))}
          </div>
          <div className="ward-index-sort live-seg" role="group" aria-label="Show">
            {measures.map((m) => (
              <button key={m.id} type="button" aria-pressed={effectiveMeasure === m.id} onClick={() => select({ measure: m.id })}>
                {m.label}
              </button>
            ))}
          </div>
          {contest === "mayor" && effectiveMeasure === "share" && shareChoices.length > 0 && (
            <label className="live-map__candidate">
              <span>Candidate</span>
              <select value={shareCandidate?.key} onChange={(e) => select({ candidate: e.target.value })}>
                {shareChoices.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.full_name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>

      <div className={`live-map__body${pin ? " has-pin" : ""}`}>
        {/* A click anywhere on the stage but a ward or the card unpins it. */}
        <div
          className="live-map__stage"
          onClick={(e) => !(e.target as Element).closest(".live-map__ward, .live-map__card") && setPin(null)}
        >
          {!counting && <p className="live-map__empty">The map fills in as wards report, from 8 p.m.</p>}
          <svg
            ref={svgRef}
            viewBox={data.view_box}
            role="group"
            aria-label="Map of Toronto's 25 wards"
            onMouseMove={(e) => {
              mouse.current = { x: e.clientX, y: e.clientY };
              if (!pin) placeCardNow();
            }}
          >
            <defs>
              <pattern id="live-map-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="8" height="8" fill="var(--rule-soft)" />
                <line x1="0" y1="0" x2="0" y2="8" stroke="var(--live-hatch)" strokeWidth="3" />
              </pattern>
            </defs>
            {facts.map((f) => (
              <path
                key={f.ward.num}
                ref={(el) => {
                  refs.current[f.ward.num] = el;
                }}
                d={f.ward.path}
                className="live-map__ward"
                style={{ "--ward-fill": f.shade.hatch ? "url(#live-map-hatch)" : (f.shade.fill ?? undefined) } as WardStyle}
                role="button"
                tabIndex={f.ward.num === held ? 0 : -1}
                aria-label={`Ward ${f.ward.num} ${f.name}: ${f.shade.words}`}
                aria-pressed={f.ward.num === held}
                onMouseEnter={(e) => {
                  setPreview(f.ward.num);
                  setHovered(f.ward.num);
                  mouse.current = { x: e.clientX, y: e.clientY };
                }}
                onMouseLeave={() => {
                  setPreview(null);
                  setHovered(null);
                }}
                onPointerDown={() => (pointerDown.current = true)}
                onFocus={() => {
                  setPreview(f.ward.num);
                  if (!pointerDown.current) {
                    setFocused(f.ward.num);
                    if (!closing.current) setPin({ num: f.ward.num, at: null });
                  }
                  pointerDown.current = false;
                }}
                onBlur={() => {
                  setPreview(null);
                  setFocused(null);
                }}
                onClick={(e) => clickWard(e, f.ward.num)}
                onKeyDown={(e) => onKey(e, f.ward.num)}
              />
            ))}
            {/* Outlines go above every ward, so no neighbour drawn later paints over one (#126). */}
            <g className="live-map__outlines" aria-hidden="true" pointerEvents="none">
              {ward !== null && ward !== held && <path className="is-home" d={pathOf(ward)} />}
              <path className="is-held" d={pathOf(held)} />
              {preview !== null && <path className="is-active" d={pathOf(preview)} />}
              {focused !== null && <path className="is-focus" d={pathOf(focused)} />}
            </g>
            <g className="live-map__labels" aria-hidden="true">
              {data.wards.map((w) =>
                w.label.leader_line ? (
                  <line key={`${w.num}-line`} {...w.label.leader_line} />
                ) : null,
              )}
              {data.wards.map((w) => (
                <text key={w.num} x={w.label.x} y={w.label.y}>
                  {w.label.text}
                </text>
              ))}
            </g>
          </svg>
          {cardFacts && (
            <div
              ref={cardRef}
              className={`live-map__card${pin ? "" : " is-hover"}`}
              role={pin ? "region" : undefined}
              aria-label={pin ? `Ward ${cardFacts.ward.num} ${cardFacts.name} results` : undefined}
              aria-hidden={pin ? undefined : true}
            >
              <WardDetails facts={cardFacts} contest={contest} home={ward} selection={linkable({ ...selection, ward: null })} />
              {pin && (
                <button type="button" className="btn btn--ghost btn--sm live-map__card-close" onClick={closeCard}>
                  Close
                </button>
              )}
            </div>
          )}
          <p className="t-meta live-map__hint">
            <span className="live-map__hint--hover">Hover over a ward to see its results; click to keep them open.</span>
            <span className="live-map__hint--touch">Tap a ward to see its results.</span>
          </p>
          {legend.length > 0 && (
            <ul className="live-map__legend" aria-label="Map legend">
              {legend.map((item) => (
                <li key={item.label}>
                  <span
                    className={`live-map__swatch${item.hatch ? " live-map__swatch--hatch" : ""}`}
                    style={{ background: item.hatch ? undefined : (item.fill ?? "var(--rule-soft)") }}
                    aria-hidden="true"
                  />
                  {item.label}
                </li>
              ))}
            </ul>
          )}
          {legend.length > 0 && effectiveMeasure === "vs2023" && (
            <p className="t-meta live-map__key-note">
              Olivia Chow&apos;s change since 2023 in each ward, against her change across all the wards counted so far.
              Not an estimate of tonight&apos;s result.
            </p>
          )}
        </div>
        {active && <WardPanel facts={active} contest={contest} home={ward} selection={linkable({ ...selection, ward: null })} />}
      </div>

      <details className="live-table-toggle">
        <summary>Show the map as a table</summary>
        <div className="live-table-scroll">
          <table className="live-table">
            <caption className="sr-only">
              {CONTESTS.find((c) => c.id === contest)!.label} by ward
            </caption>
            <thead>
              <tr>
                <th scope="col">Ward</th>
                {contest !== "mayor" && <th scope="col">Race</th>}
                <th scope="col">On the map</th>
                {contest === "mayor" && (
                  <>
                    <th scope="col">Olivia Chow now</th>
                    <th scope="col">Olivia Chow in 2023</th>
                  </>
                )}
                <th scope="col">Voting areas in</th>
              </tr>
            </thead>
            <tbody>
              {facts.map((f) => (
                <tr key={f.ward.num}>
                  <th scope="row">
                    {f.ward.num} {f.name}
                  </th>
                  {contest !== "mayor" && <td>{f.race ? raceTitle(f.race) : "–"}</td>}
                  <td>{f.shade.words}</td>
                  {contest === "mayor" && (
                    <>
                      <td className="live-num">{pct(f.chow?.live ?? null)}</td>
                      <td className="live-num">{f.chow ? pct(f.chow.share2023) : "–"}</td>
                    </>
                  )}
                  <td className="live-num">{f.reported ? `${f.reported.received} of ${f.reported.total}` : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      {contest === "mayor" && (
        <p className="t-meta">
          Olivia Chow&apos;s 2023 shares ({pct(CHOW_2023.citywide.share)} citywide) are from the{" "}
          <a className="text-link" href={CHOW_2023.source_url}>
            City of Toronto&apos;s certified results of the 2023 by-election <span aria-hidden="true">↗</span>
          </a>
          . {CHOW_2023.licence}
        </p>
      )}
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </section>
  );
}

/** A candidate's last name, for ordering (#122): the registry's short label where it is one
 *  (it is the full Ballot Name when two candidates share a last name), else the name's last word. */
function lastName(race: LiveRace | null, key: string): string {
  const c = race?.candidates.find((candidate) => candidate.key === key);
  if (!c) return key;
  return c.short_label && c.short_label !== c.full_name ? c.short_label : (c.full_name.split(" ").at(-1) ?? c.full_name);
}

interface WardDetailsProps {
  facts: WardFacts;
  contest: Contest;
  home: string | null;
  /** The map's selection, so the ward's page opens the same map. */
  selection: MapSelection;
}

/** The held ward beside the map on wide screens; narrow screens use the ward card (#130). */
function WardPanel(props: WardDetailsProps) {
  return (
    <aside className="live-map__panel" aria-label={`Ward ${props.facts.ward.num} details`}>
      <WardDetails {...props} />
    </aside>
  );
}

/** A ward's figures, in the side panel and the ward card. */
function WardDetails({ facts, contest, home, selection }: WardDetailsProps) {
  const { ward, name, race, lead, reported, shade } = facts;
  const raceName = contest === "mayor" ? "Mayor, votes in this ward" : race ? raceTitle(race) : null;
  // Each figure once: the lead is in the status line, so the list is just who has what. Its rows
  // keep one alphabetical order by last name, whoever leads, so they don't swap places from ward
  // to ward (#122). Chow's row carries her 2023 share in the ward (#108), and joins the list if
  // she isn't top two.
  const standings: { name: string; sortKey: string; share: number | null; share2023?: number }[] = [];
  const entry = (key: string, share: number | null) => ({ name: nameOf(race, key), sortKey: lastName(race, key), share });
  if (lead && lead.leader !== null) {
    standings.push(entry(lead.leader, lead.leaderShare));
    if (lead.runnerUp) standings.push(entry(lead.runnerUp, lead.leaderShare! - lead.margin!));
  }
  if (facts.chow) {
    const key = chowCandidate(race)?.key ?? null;
    const row = key === null ? undefined : standings.find((r) => r.name === nameOf(race, key));
    if (row) row.share2023 = facts.chow.share2023;
    else if (key === null) standings.push({ name: "Olivia Chow", sortKey: "Chow", share: facts.chow.live, share2023: facts.chow.share2023 });
    else standings.push({ ...entry(key, facts.chow.live), share2023: facts.chow.share2023 });
  }
  standings.sort((a, b) => a.sortKey.localeCompare(b.sortKey, "en-CA") || a.name.localeCompare(b.name, "en-CA"));
  const meta = [
    lead && lead.leader !== null ? `${lead.counted.toLocaleString("en-CA")} votes counted` : null,
    reported ? `${reported.received} of ${reported.total} voting areas in` : null,
  ].filter((part) => part !== null);
  return (
    <>
      <h3>
        Ward {ward.num} {name}
      </h3>
      {raceName && <p className="live-map__race">{raceName}</p>}
      <p className="live-map__status">{shade.words}</p>
      {standings.length > 0 && (
        <ol className="live-map__standings">
          {standings.map((row) => (
            <li key={row.name}>
              <span>{row.name}</span>
              <span className="live-map__shares">
                {row.share !== null && (
                  <span className="live-num">
                    <span className="live-bar" aria-hidden="true">
                      <span style={{ width: `${row.share}%` }} />
                    </span>
                    {pct(row.share)}
                  </span>
                )}
                {row.share2023 !== undefined && <span className="live-map__then">{pct(row.share2023)} in 2023</span>}
              </span>
            </li>
          ))}
        </ol>
      )}
      {meta.length > 0 && (
        <p className="live-map__reported">
          {meta.map((part, i) => (
            <span key={part}>
              {i > 0 && " · "}
              <span className="live-map__nowrap">{part}</span>
            </span>
          ))}
        </p>
      )}
      {home !== ward.num && (
        <Link className="text-link live-map__link" href={mapSelectionHref(`/results/${ward.num}/`, new URLSearchParams("view=map"), selection)}>
          Ward {ward.num} results <span aria-hidden="true">→</span>
        </Link>
      )}
    </>
  );
}

interface LegendItem {
  label: string;
  fill: string | null;
  hatch?: boolean;
}

function legendFor(
  contest: Contest,
  measure: Measure,
  mayor: LiveRace | null,
  facts: WardFacts[],
  shareColour: string,
): LegendItem[] {
  if (facts.every((f) => f.race === null && f.lead === null)) return [];
  const present = (words: (f: WardFacts) => boolean) => facts.some(words);
  const items: LegendItem[] = [];
  if (measure === "reporting") {
    (Object.keys(REPORTING_WORDS) as ReportingTier[]).forEach((tier) =>
      items.push({ label: REPORTING_WORDS[tier], fill: REPORTING_STEP[tier] }),
    );
    return items;
  }
  if (contest === "mayor" && measure === "vs2023") {
    items.push(...VS_STEPS);
    if (present((f) => f.shade.fill === null)) items.push({ label: "No votes counted yet", fill: null });
    return items;
  }
  if (contest === "mayor" && measure === "share") {
    return [
      { label: "Lower share", fill: mix(shareColour, 20) },
      { label: "Higher share", fill: shareColour },
    ];
  }
  if (contest === "mayor") {
    const leaders = new Set(facts.map((f) => (f.lead && !f.lead.tied ? f.lead.leader : null)));
    for (const c of mayor?.candidates ?? []) {
      if (c.candidate_id && leaders.has(c.key)) items.push({ label: `${shortLabel(c)} leads`, fill: candidateColour(c) });
    }
    const othersLead = (mayor?.candidates ?? []).some((c) => !c.candidate_id && leaders.has(c.key));
    if (othersLead) items.push({ label: "Another candidate leads", fill: OTHER });
    if (present((f) => f.lead?.tied === true)) items.push({ label: "Tied", fill: "var(--live-tied)" });
  } else {
    items.push({ label: "Incumbent leading", fill: "var(--live-inc-lead)" });
    items.push({ label: "Incumbent trailing", fill: "var(--live-inc-trail)" });
    items.push({ label: "Open seat", fill: "var(--live-open)" });
    if (present((f) => f.shade.hatch === true)) items.push({ label: "Acclaimed, or incumbent not known", fill: null, hatch: true });
  }
  items.push({ label: "Paler: lead under 5 points", fill: "color-mix(in srgb, var(--ink) 18%, var(--paper))" });
  if (present((f) => f.shade.fill === null)) items.push({ label: "No votes counted yet", fill: null });
  return items;
}

/** The ward nearest `from` in the arrow key's direction, by label position; Home/End by number. */
function nearestWard(wards: ResultsMapWard[], from: string, key: string): string | null {
  if (key === "Home") return wards[0]?.num ?? null;
  if (key === "End") return wards[wards.length - 1]?.num ?? null;
  const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[key];
  if (!dir) return null;
  const origin = wards.find((w) => w.num === from);
  if (!origin) return null;
  let best: { num: string; score: number } | null = null;
  for (const w of wards) {
    if (w.num === from) continue;
    const dx = w.label.x - origin.label.x;
    const dy = w.label.y - origin.label.y;
    const along = dx * dir[0] + dy * dir[1];
    if (along <= 0) continue;
    const across = Math.abs(dx * dir[1] - dy * dir[0]);
    const score = along + 2 * across;
    if (!best || score < best.score) best = { num: w.num, score };
  }
  return best?.num ?? null;
}
