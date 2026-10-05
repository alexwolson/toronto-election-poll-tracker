/**
 * PROTOTYPE — throwaway (ticket "How should the results page show counts and projections?",
 * alexwolson/toronto-election-live-projection#7). Race shapes are real (the City's zeroed test
 * feed, 2026-09-17); every count and every projection here is a seeded STUB that only imitates
 * the shape of the model's output (Live Tally + Election-Night Projection draws). Nothing here is
 * the model.
 */
import data from "../_data/races.json";

export type Level = "mayor" | "council" | "trustee" | "french";
export type NightState = "pre" | "early" | "tight" | "late" | "final";
export type ProjectionForm = "chance" | "range" | "outcomes";
export interface Gates {
  mayor: boolean;
  council: boolean;
  trustee: boolean;
}

export interface WardShape {
  num: number;
  name: string;
  units: number;
  electors: number;
}

export interface RaceShape {
  id: string;
  officeId: number;
  office: string;
  level: Level;
  num: number;
  units: number;
  electors: number;
  candidates: string[];
  title: string;
  wardName?: string;
  board?: string;
  boardName?: string;
  district?: string | null;
  cityWards?: number[];
  wards?: WardShape[];
  acclaimed: boolean;
}

export interface CandidateProjection {
  median: number;
  lo: number;
  hi: number;
  win: number;
}

export interface CandidateRow {
  name: string;
  votes: number;
  share: number;
  slug?: string;
  projection?: CandidateProjection;
}

export interface Outcomes {
  leader: string;
  challenger: string;
  leaderAhead: number;
  close: number;
  challengerAhead: number;
  threshold: number;
}

export type Status = "acclaimed" | "waiting" | "counting" | "complete";
export type Withheld = "gate" | "no-units" | "complete" | "unqualified-board" | "acclaimed" | "pre";

export interface WardTally {
  num: number;
  name: string;
  unitsIn: number;
  units: number;
  rows: CandidateRow[];
}

export interface RaceView {
  shape: RaceShape;
  status: Status;
  unitsIn: number;
  votes: number;
  rows: CandidateRow[];
  projection: { outcomes: Outcomes } | null;
  withheld: Withheld | null;
  wards?: WardTally[];
}

export interface Night {
  state: NightState;
  clock: string;
  snapshot: string;
  gates: Gates;
  races: RaceView[];
}

export const RACES = data.races as RaceShape[];

export const STATES: { key: NightState; label: string; clock: string }[] = [
  { key: "pre", label: "Before 8 p.m.", clock: "7:42 p.m." },
  { key: "early", label: "Early count", clock: "8:41 p.m." },
  { key: "tight", label: "Close mayor count (alt. night)", clock: "9:26 p.m." },
  { key: "late", label: "Late count", clock: "10:48 p.m." },
  { key: "final", label: "All reported", clock: "12:37 a.m." },
];

export const MAYOR_SLUGS: Record<string, string> = {
  "Olivia Chow": "chow",
  "Brad Bradford": "bradford",
  "Chris Alexander": "alexander",
  "Sarah McVie": "mcvie",
  "Odessa Paloma Parker": "parker",
};

// ── seeded randomness ──────────────────────────────────────────────────────
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}
function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const normal = () => {
    const u = Math.max(next(), 1e-12);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * next());
  };
  return { next, normal, uniform: (lo: number, hi: number) => lo + (hi - lo) * next() };
}
const normalize = (v: number[]) => {
  const s = v.reduce((a, b) => a + Math.max(b, 0), 0) || 1;
  return v.map((x) => Math.max(x, 0) / s);
};

// ── stub "truth" (each race's final shares) ────────────────────────────────
const CLOSE_RACES = new Set(["2-9", "2-14", "2-23", "3-5", "3-10", "4-9"]);
const ZERO_EARLY = new Set(["2-13", "3-7", "4-11", "6-4"]);
const ADVANCE_SHARE = 0.2;

function mayorTruth(shape: RaceShape, state: NightState): number[] {
  const tight = state === "tight";
  const named: Record<string, number> = tight
    ? { "Olivia Chow": 0.445, "Brad Bradford": 0.405, "Chris Alexander": 0.06, "Sarah McVie": 0.03, "Odessa Paloma Parker": 0.02 }
    : { "Olivia Chow": 0.468, "Brad Bradford": 0.335, "Chris Alexander": 0.072, "Sarah McVie": 0.041, "Odessa Paloma Parker": 0.028 };
  const r = rng(hash("mayor-minor"));
  const rest = 1 - Object.values(named).reduce((a, b) => a + b, 0);
  const minorWeights = shape.candidates.map((c) => (c in named ? 0 : Math.exp(1.3 * r.normal())));
  const minorSum = minorWeights.reduce((a, b) => a + b, 0);
  return shape.candidates.map((c, i) => named[c] ?? (rest * minorWeights[i]) / minorSum);
}

function raceTruth(shape: RaceShape): number[] {
  const r = rng(hash(`truth-${shape.id}`));
  const order = shape.candidates.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(r.next() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const weights = shape.candidates.map(() => 0);
  order.forEach((idx, rank) => {
    const boost = rank === 0 ? 1.5 : rank === 1 ? 1.1 : rank === 2 ? 0.4 : 0;
    weights[idx] = Math.exp(boost + 0.55 * r.normal());
  });
  let shares = normalize(weights);
  if (CLOSE_RACES.has(shape.id) && shape.candidates.length > 1) {
    const [a, b] = [...shares.keys()].sort((x, y) => shares[y] - shares[x]);
    const pair = shares[a] + shares[b];
    shares = shares.map((s, i) => (i === a ? pair / 2 + 0.006 : i === b ? pair / 2 - 0.006 : s));
  }
  return shares;
}

/** Direction-free early-vote shift for the stub (advance/mail blocks vote differently). */
function advanceShift(shape: RaceShape, truth: number[], state: NightState): number[] {
  if (shape.level === "mayor") {
    const big = state === "tight" ? 0.13 : 0.06;
    return shape.candidates.map((c) => (c === "Olivia Chow" ? big : c === "Brad Bradford" ? -big : 0));
  }
  const r = rng(hash(`shift-${shape.id}`));
  return truth.map((t) => 0.25 * Math.sqrt(t) * r.normal() * 0.3);
}

// ── progress per state ─────────────────────────────────────────────────────
function progressFor(shape: RaceShape, state: NightState): number {
  const r = rng(hash(`progress-${shape.id}-${state}`));
  if (shape.acclaimed || state === "pre") return 0;
  if (state === "final") return 1;
  if (shape.level === "mayor") return { early: 0.22, tight: 0.84, late: 0.93 }[state];
  if (state === "early") return ZERO_EARLY.has(shape.id) ? 0 : r.uniform(0.04, 0.45);
  if (state === "tight") return r.next() < 0.12 ? 1 : r.uniform(0.6, 0.97);
  return r.next() < 0.35 ? 1 : r.uniform(0.72, 0.99);
}

function advanceAt(shape: RaceShape): number {
  if (shape.level === "mayor") return 0.9;
  const r = rng(hash(`adv-${shape.id}`));
  return [0.15, 0.5, 0.9][Math.floor(r.next() * 3)];
}

function turnout(shape: RaceShape): number {
  return shape.level === "trustee" ? 0.24 : shape.level === "french" ? 0.03 : 0.41;
}

// ── counted shares ─────────────────────────────────────────────────────────
function countedShares(shape: RaceShape, truth: number[], shift: number[], p: number, salt: string) {
  const a = ADVANCE_SHARE;
  const adv = normalize(truth.map((t, i) => t + shift[i]));
  const ed = normalize(truth.map((t, i) => (t - a * adv[i]) / (1 - a)));
  const advIn = p >= advanceAt(shape) ? 1 : 0;
  const f = p >= 1 ? 1 : (1 - a) * p + a * advIn;
  if (f <= 0) return { f: 0, shares: truth.map(() => 0) };
  const r = rng(hash(`count-${shape.id}-${salt}`));
  const noiseScale = p >= 1 ? 0 : 0.012 * Math.sqrt((1 - p) / (p + 0.02));
  const raw = ed.map((e, i) => ((1 - a) * p * e + a * advIn * adv[i]) / f + noiseScale * Math.sqrt(truth[i]) * r.normal());
  return { f, shares: p >= 1 ? truth : normalize(raw) };
}

// ── stub projection draws ──────────────────────────────────────────────────
const DRAWS = 3000;
function quantile(sorted: Float64Array, q: number) {
  const i = Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))));
  return sorted[i];
}

function project(shape: RaceShape, counted: number[], f: number, advanceOut: boolean, keep: number[]) {
  const r = rng(hash(`draws-${shape.id}-${f.toFixed(4)}`));
  const o = 1 - f;
  const k = keep.length;
  const finals = keep.map(() => new Float64Array(DRAWS));
  const wins = new Array(k).fill(0);
  const sharedScale = advanceOut ? 0.22 : 0.08;
  const local = 0.05 + 0.04 * Math.sqrt(o / (f + 0.02));
  const restCounted = 1 - keep.reduce((s, i) => s + counted[i], 0);
  for (let d = 0; d < DRAWS; d++) {
    const out = keep.map((i) => Math.max(0, counted[i] + Math.sqrt(counted[i]) * (sharedScale * r.normal() + local * r.normal())));
    const outRest = Math.max(0, restCounted * (1 + 0.2 * r.normal()));
    const norm = out.reduce((a, b) => a + b, 0) + outRest || 1;
    let best = -1;
    let bestShare = -1;
    for (let j = 0; j < k; j++) {
      const share = f * counted[keep[j]] + (o * out[j]) / norm;
      finals[j][d] = share;
      if (share > bestShare) {
        bestShare = share;
        best = j;
      }
    }
    wins[best]++;
  }
  const summary = finals.map((arr, j) => {
    const sorted = Float64Array.from(arr).sort();
    return { median: quantile(sorted, 0.5), lo: quantile(sorted, 0.05), hi: quantile(sorted, 0.95), win: wins[j] / DRAWS };
  });
  const threshold = 0.02;
  let leaderAhead = 0;
  let close = 0;
  for (let d = 0; d < DRAWS; d++) {
    const diff = finals[0][d] - finals[1][d];
    if (diff >= threshold) leaderAhead++;
    else if (diff > -threshold) close++;
  }
  return {
    summary,
    outcomes: {
      leaderAhead: leaderAhead / DRAWS,
      close: close / DRAWS,
      challengerAhead: (DRAWS - leaderAhead - close) / DRAWS,
      threshold: 2,
    },
  };
}

// ── one race ───────────────────────────────────────────────────────────────
function gateFor(level: Level, gates: Gates): boolean {
  if (level === "french") return false;
  return gates[level];
}

function buildRace(shape: RaceShape, state: NightState, gates: Gates): RaceView {
  const slugOf = (name: string) => (shape.level === "mayor" ? MAYOR_SLUGS[name] : undefined);
  if (shape.acclaimed) {
    return {
      shape,
      status: "acclaimed",
      unitsIn: 0,
      votes: 0,
      rows: shape.candidates.map((name) => ({ name, votes: 0, share: 0 })),
      projection: null,
      withheld: "acclaimed",
    };
  }
  const truth = shape.level === "mayor" ? mayorTruth(shape, state) : raceTruth(shape);
  const shift = advanceShift(shape, truth, state);
  const p = progressFor(shape, state);
  const expected = shape.electors * turnout(shape);

  let wards: WardTally[] | undefined;
  let unitsIn: number;
  let counted: number[];
  let f: number;
  if (shape.level === "mayor" && shape.wards) {
    const wr = rng(hash(`mayor-wards-${state}`));
    const totals = shape.candidates.map(() => 0);
    let votesAll = 0;
    let fWeighted = 0;
    unitsIn = 0;
    wards = shape.wards.map((ward) => {
      const lean = wr.normal() * 0.09;
      const wardTruth = normalize(truth.map((t, i) => t + (shape.candidates[i] === "Olivia Chow" ? lean : shape.candidates[i] === "Brad Bradford" ? -lean * 0.8 : 0)));
      const wp = p === 0 ? 0 : p >= 1 ? 1 : Math.min(0.99, Math.max(0.02, p + wr.normal() * 0.12));
      const c = countedShares(shape, wardTruth, shift, wp, `${state}-w${ward.num}`);
      const wardExpected = ward.electors * turnout(shape);
      const wardVotes = Math.round(wardExpected * c.f);
      const wUnits = wp === 0 ? 0 : Math.max(1, Math.round(wp * ward.units));
      unitsIn += wUnits;
      votesAll += wardVotes;
      fWeighted += c.f * wardExpected;
      c.shares.forEach((s, i) => (totals[i] += s * wardVotes));
      return {
        num: ward.num,
        name: ward.name,
        unitsIn: wUnits,
        units: ward.units,
        rows: shape.candidates
          .map((name, i) => ({ name, votes: Math.round(c.shares[i] * wardVotes), share: c.shares[i], slug: slugOf(name) }))
          .sort((a, b) => b.votes - a.votes),
      };
    });
    counted = votesAll ? totals.map((t) => t / votesAll) : totals;
    f = fWeighted / shape.wards.reduce((s, w) => s + w.electors * turnout(shape), 0);
  } else {
    const c = countedShares(shape, truth, shift, p, state);
    counted = c.shares;
    f = c.f;
    unitsIn = p === 0 ? 0 : Math.max(1, Math.round(p * shape.units));
  }

  const votes = Math.round(expected * f);
  const status: Status = p === 0 ? "waiting" : p >= 1 ? "complete" : "counting";
  let rows: CandidateRow[] = shape.candidates.map((name, i) => ({
    name,
    votes: Math.round(counted[i] * votes),
    share: counted[i],
    slug: slugOf(name),
  }));
  if (status !== "waiting") rows = rows.sort((a, b) => b.votes - a.votes);

  let withheld: Withheld | null = null;
  let projection: RaceView["projection"] = null;
  if (state === "pre") withheld = "pre";
  else if (status === "waiting") withheld = "no-units";
  else if (status === "complete") withheld = "complete";
  else if (shape.level === "french") withheld = "unqualified-board";
  else if (!gateFor(shape.level, gates)) withheld = "gate";
  else {
    const order = counted.map((_, i) => i).sort((a, b) => counted[b] - counted[a]);
    const keep = order.slice(0, Math.min(order.length, shape.level === "mayor" ? 5 : 6));
    const advanceOut = p < advanceAt(shape);
    const proj = project(shape, counted, f, advanceOut, keep);
    const byName = new Map(keep.map((idx, j) => [shape.candidates[idx], proj.summary[j]]));
    rows = rows.map((row) => ({ ...row, projection: byName.get(row.name) }));
    projection = {
      outcomes: {
        leader: shape.candidates[keep[0]],
        challenger: shape.candidates[keep[1]],
        ...proj.outcomes,
      },
    };
  }
  return { shape, status, unitsIn, votes, rows, projection, withheld, wards };
}

export function buildNight(state: NightState, gates: Gates): Night {
  const meta = STATES.find((s) => s.key === state) ?? STATES[0];
  return {
    state,
    clock: meta.clock,
    snapshot: state === "pre" ? "—" : String(1793059200000 + STATES.indexOf(meta) * 2_160_000),
    gates,
    races: RACES.map((shape) => buildRace(shape, state, gates)),
  };
}

// ── wording helpers shared by the variants ─────────────────────────────────
/** ADR 0006 out-of-ten Probability Bands. */
export function chanceBand(p: number): string {
  if (p < 0.05) return "less than 1 in 10";
  if (p >= 0.95) return "more than 9 in 10";
  if (p < 0.15) return "about 1 in 10";
  if (p >= 0.85) return "about 9 in 10";
  return `about ${Math.round(p * 10)} in 10`;
}

export const pct = (share: number, digits = 1) => `${(share * 100).toFixed(digits)}%`;

export function surname(name: string): string {
  return name.trim().split(/\s+/).at(-1) ?? name;
}

/** Public wording for a Reporting Unit (on-night wording is Alex's call; kept in one place). */
export const UNIT_WORD = { one: "voting area", many: "voting areas" };

export function progressText(race: RaceView): string {
  return `${race.unitsIn.toLocaleString()} of ${race.shape.units.toLocaleString()} ${UNIT_WORD.many} in`;
}

export function levelLabel(level: Level): string {
  return { mayor: "Mayor", council: "City council", trustee: "School board trustees", french: "French-language school boards" }[level];
}

export function gateOffNote(level: Level): string {
  const what = { mayor: "the mayor's race", council: "council races", trustee: "school-board races", french: "" }[level];
  return `No projection for ${what} tonight. In replays of past election nights it did not beat simply reading the count, so this page shows the count as the City reports it.`;
}

export const FRENCH_NOTE = "Count only: there are no past results by voting area to test a projection against.";
