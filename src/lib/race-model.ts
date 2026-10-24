/**
 * Each race as the results pages present it (results redesign, Alex, 2026-10-24): which candidates
 * are "the race" (a contest's featured three, else the top two), why the count moves a race into
 * the watch list, the catch-up arithmetic, colours that always tell a race's leaders apart, and the
 * race pages' URL slugs. Pure: the pages pass in the payload's race and the editor's set-up.
 */

import { shortLabel } from "@/lib/live-labels";
import { estimated } from "@/lib/race-results";
import type { LiveCandidate, LiveRace } from "@/types/live";

/** The editor's call on a race (#editorial-races.json): how the overview shows it and what its
 *  page opens on. Trustee races default to their race card's category. */
export type EditorialType = "contest" | "head" | "favourite" | "incumbent" | "open" | "acclaimed";

export interface EditorialPoll {
  firm: string;
  /** ISO date the fieldwork ended, for ordering. */
  date: string;
  /** As printed: "Oct. 14–16". */
  dates: string;
  n: number;
  method?: string;
  source?: string;
  shares: { name: string; share: number }[];
}

export interface EditorialRace {
  type: EditorialType;
  /** Candidates by full name, in the editor's order. */
  featured: string[];
  /** Named on the page but not featured (Ward 4's Raponi). */
  outside?: string[];
  /** One line of background per candidate, by full name. */
  lines?: Record<string, string>;
  /** What a head-to-head compares against: the last result, or the first poll below. */
  compare?: "prior" | "poll";
  polls?: EditorialPoll[];
}

/** Within this many points, with no Estimated Range to compare, two candidates count as close. */
export const CLOSE_POINTS = 2;

const byVotes = (race: LiveRace) => [...race.candidates].sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0));
const lastName = (c: LiveCandidate) => shortLabel(c);

/** Whether any vote is counted yet. */
export function counted(race: LiveRace): boolean {
  return race.candidates.some((c) => (c.votes ?? 0) > 0);
}

/** "The race": a contest's featured candidates with the leader always among them, else the top two;
 *  in count order. */
export function contenders(race: LiveRace, ed: EditorialRace): LiveCandidate[] {
  const ordered = byVotes(race);
  if (ed.type !== "contest") return ordered.slice(0, 2);
  const featured = new Set(ed.featured);
  return ordered.filter((c, i) => i === 0 || featured.has(c.full_name)).slice(0, 3);
}

/** Why the count overrides the editor's set-up and moves a race into the watch list: a candidate
 *  the editor didn't feature leads, or two of the race's contenders are close (overlapping
 *  Estimated Ranges, or within CLOSE_POINTS where no range shows). Never before a vote is counted,
 *  never for an acclaimed race. A Withdrawal or fault takes the ranges out of it. */
export function promotionReasons(race: LiveRace, ed: EditorialRace): string[] {
  if (race.state === "acclaimed" || ed.type === "acclaimed" || !counted(race)) return [];
  const reasons: string[] = [];
  const [first] = byVotes(race);
  if (ed.featured.length && !ed.featured.includes(first.full_name)) {
    const named = race.candidates.find((c) => c.full_name === ed.featured[0]);
    const name = (c: LiveCandidate | undefined, full: string) => (c ? lastName(c) : full.split(" ").slice(-1)[0]);
    if (ed.type === "incumbent") reasons.push(`Incumbent ${name(named, ed.featured[0])} is not leading`);
    else if (ed.type === "favourite") reasons.push(`${ed.featured[0]} is not leading`);
    else if (ed.type === "head") {
      const other = race.candidates.find((c) => c.full_name === ed.featured[1]);
      reasons.push(`Neither ${name(named, ed.featured[0])} nor ${name(other, ed.featured[1] ?? "")} is leading`);
    } else if (ed.type === "contest") reasons.push("None of the three featured candidates is leading");
  }
  const race_ = contenders(race, ed);
  if (race_.length < 2) return reasons;
  const bands = race.withdrawal || race.fault ? null : estimated(race);
  const banded = bands !== null && race_.every((c) => bands[c.key]);
  const pairs: [LiveCandidate, LiveCandidate][] = [];
  race_.forEach((p, i) => race_.slice(i + 1).forEach((q) => pairs.push([p, q])));
  const close = pairs.filter(([p, q]) =>
    banded
      ? Math.min(bands[p.key].high, bands[q.key].high) - Math.max(bands[p.key].low, bands[q.key].low) > 0
      : Math.abs((p.share ?? 0) - (q.share ?? 0)) < CLOSE_POINTS,
  );
  if (close.length) {
    const two = race_.length === 2;
    const [p, q] = close[0];
    if (banded) {
      reasons.push(two ? "The top two’s estimated ranges overlap" : close.length === 1 ? `${lastName(p)}’s and ${lastName(q)}’s estimated ranges overlap` : "The leading candidates’ estimated ranges overlap");
    } else {
      reasons.push(two ? `Under ${CLOSE_POINTS} points apart` : `${lastName(p)} and ${lastName(q)} are under ${CLOSE_POINTS} points apart`);
    }
  }
  return reasons;
}

export interface CatchUp {
  /** Voting areas not yet in. */
  left: number;
  /** Votes left, at the average size of the areas counted so far. */
  votesLeft: number;
  /** Share of the remaining votes for the top two that second place needs to draw level. */
  need: number;
  /** The gap is bigger than the votes left. */
  out: boolean;
}

/** The catch-up arithmetic (Alex: kept, labelled as arithmetic on the count): an estimate of the
 *  votes left from the areas counted, not an approved projection. Null with nothing to compute. */
export function catchUp(race: LiveRace): CatchUp | null {
  const [first, second] = byVotes(race);
  if (!second || !race.progress || race.progress.received <= 0 || !counted(race)) return null;
  const total = race.candidates.reduce((a, c) => a + (c.votes ?? 0), 0);
  const left = Math.max(0, race.progress.total - race.progress.received);
  const votesLeft = (left * total) / race.progress.received;
  const lead = (first.votes ?? 0) - (second.votes ?? 0);
  if (votesLeft <= 0) return { left, votesLeft: 0, need: Infinity, out: true };
  const need = (votesLeft + lead) / (2 * votesLeft);
  return { left, votesLeft, need, out: need > 1 };
}

const NEUTRAL = "var(--color-disengaged)";
/** Fallbacks for a contender with no campaign colour, never one already in the race. */
const FALLBACK = ["#274490", "#c4501b", "#2f8f83", "#8a4f9e", "#b8860b", "#3a7d44"];

/** Each candidate's colour in a race: their campaign colour (`campaign`), else, for the race's
 *  contenders, a fallback distinct from every colour in the race, else the neutral. */
export function raceColours(
  race: LiveRace,
  contendersOf: LiveCandidate[],
  campaign: (c: LiveCandidate) => string | null,
): Record<string, string> {
  const colours: Record<string, string> = {};
  for (const c of race.candidates) {
    const own = campaign(c);
    if (own) colours[c.key] = own;
  }
  const used = new Set(Object.values(colours).map((h) => h.toLowerCase()));
  const spare = FALLBACK.filter((h) => !used.has(h.toLowerCase()));
  for (const c of contendersOf) if (!colours[c.key]) colours[c.key] = spare.shift() ?? NEUTRAL;
  for (const c of race.candidates) colours[c.key] ??= NEUTRAL;
  return colours;
}
