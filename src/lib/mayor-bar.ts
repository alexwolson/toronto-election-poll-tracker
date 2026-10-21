/**
 * The parts of a mayoral bar, shared by the voters' list bar and the area table (#127): the
 * forecast's named candidates in the payload's order, each in its colour, then everyone else
 * together in the neutral. Callers set each part's share against their own whole.
 */

import type { LiveCandidate, LiveRace } from "@/types/live";
import { liveColour } from "./live-colour";
import { shortLabel } from "./live-labels";

export const NEUTRAL = "var(--color-disengaged)";

export interface MayorPart {
  key: string;
  label: string;
  votes: number;
  colour: string;
}

export function mayorParts(race: LiveRace, votesOf: (candidate: LiveCandidate) => number): MayorPart[] {
  const named = race.candidates.filter((c) => c.candidate_id);
  const rest = race.candidates.filter((c) => !c.candidate_id);
  return [
    ...named.map((c) => ({ key: c.key, label: shortLabel(c), votes: votesOf(c), colour: liveColour(c, NEUTRAL) })),
    { key: "others", label: `${rest.length} others`, votes: rest.reduce((a, c) => a + votesOf(c), 0), colour: NEUTRAL },
  ];
}

/** The parts of a race's bar without forecast-named candidates: its two leaders by votes, each in
 *  its colour, then everyone else together. */
export function leaderParts(race: LiveRace, votesOf: (candidate: LiveCandidate) => number): MayorPart[] {
  const byVotes = [...race.candidates].sort((a, b) => votesOf(b) - votesOf(a));
  const rest = byVotes.slice(2);
  return [
    ...byVotes.slice(0, 2).map((c) => ({ key: c.key, label: shortLabel(c), votes: votesOf(c), colour: liveColour(c, NEUTRAL) })),
    ...(rest.length > 0 ? [{ key: "others", label: `${rest.length} others`, votes: rest.reduce((a, c) => a + votesOf(c), 0), colour: NEUTRAL }] : []),
  ];
}

/** A bar segment's width for a percent share. */
export const segmentWidth = (share: number) => ({ width: `${+share.toFixed(2)}%` });
