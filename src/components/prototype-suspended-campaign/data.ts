/**
 * PROTOTYPE (throwaway, branch prototype/suspended-campaign-presentation).
 *
 * Question: how should the homepage present the forecast once Chris Alexander's
 * Suspended Campaign is modelled (S2: he keeps a share learned from past cases,
 * about 1%), and what replaces the interim notice?
 *
 * Three variants of the homepage on the existing "/" route, switched by
 * ?variant=A|B|C, plus ?variant=live for today's site. Numbers are S2 applied
 * to backend-2026-10-06.1's draws (see s2-numbers.ts), not a release.
 */
import type { MayoralForecastFeed } from "@/types/feeds";
import { S2_NUMBERS } from "./s2-numbers";

export const VARIANTS = [
  { key: "A", name: "Quiet update" },
  { key: "B", name: "Two-candidate race" },
  { key: "C", name: "Explainer first" },
  { key: "D", name: "A, no hero line, Alexander in Other candidates" },
  { key: "live", name: "Live site today" },
];

type Block = (typeof S2_NUMBERS)["s2"];

function apply(feed: MayoralForecastFeed, block: Block): MayoralForecastFeed {
  const out = structuredClone(feed);
  const day = out.election_day;
  if (!day) return out;
  for (const c of day.candidates) {
    const n = block.candidates[c.display_name as keyof Block["candidates"]];
    if (!n) continue;
    c.median = n.median;
    c.lower = n.lower;
    c.upper = n.upper;
    c.win_probability = n.win_probability;
    const card = out.candidate_win[c.candidate_id];
    if (card) card.probability = n.win_probability;
  }
  const m = block.pairwise_margin;
  Object.assign(day.pairwise_margin, {
    median: m.median,
    lower: m.lower,
    upper: m.upper,
    probability_challenger_ahead: m.probability_challenger_ahead,
    outcomes: { ...m.outcomes },
  });
  if (out.uncertainty) {
    out.uncertainty.combined = {
      median: m.median,
      lower: m.lower,
      upper: m.upper,
      probability_leader_ahead: 1 - m.probability_challenger_ahead,
      probability_challenger_ahead: m.probability_challenger_ahead,
    };
  }
  return out;
}

/** The production feed with S2's election-day numbers swapped in. */
export function withS2(feed: MayoralForecastFeed): MayoralForecastFeed {
  return apply(feed, S2_NUMBERS.s2);
}

/** Before/after for Alexander's Suspended Campaign (published vs S2, same draws). */
export const BEFORE_AFTER = {
  alexanderShare: {
    before: S2_NUMBERS.published.candidates["Chris Alexander"].median,
    after: S2_NUMBERS.s2.candidates["Chris Alexander"].median,
    afterLower: S2_NUMBERS.s2.candidates["Chris Alexander"].lower,
    afterUpper: S2_NUMBERS.s2.candidates["Chris Alexander"].upper,
  },
  chowChance: {
    before: S2_NUMBERS.published.candidates["Olivia Chow"].win_probability,
    after: S2_NUMBERS.s2.candidates["Olivia Chow"].win_probability,
  },
  bradfordChance: {
    before: S2_NUMBERS.published.candidates["Brad Bradford"].win_probability,
    after: S2_NUMBERS.s2.candidates["Brad Bradford"].win_probability,
  },
};

/**
 * Mainstreet's Sept. 28–29 Head-to-Head Reading, as printed (all respondents,
 * n = 1,000; docs/research/mainstreet-head-to-head-2026-10-02.md). Not in the
 * polling feed today: the archive carries one reading per poll.
 */
export const HEAD_TO_HEAD = {
  firm: "Mainstreet Research",
  pollId: "mainstreet-2026-09-29",
  fieldwork: "Sept. 28–29",
  sampleSize: 1000,
  denominator: "all respondents",
  headToHead: { chow: 0.471, bradford: 0.409, undecided: 0.12 },
  fullField: {
    chow: 0.381,
    bradford: 0.322,
    alexander: 0.072,
    others: 0.065,
    undecided: 0.16,
  },
};
