/**
 * Pure selectors over the mayoral forecast feed (spec §Hero, §Withheld).
 *
 * The publication rules are baked in here so the UI never has to reason about
 * them: only `Forecast Available` quantities are ever returned (withheld ones
 * are hidden, Q11), and we surface the band + frequency phrase, never a raw
 * probability number (ADR 0006).
 */

import { candidateName } from "@/lib/candidates";
import type { ForecastQuantityCard, MayoralForecastFeed } from "@/types/feeds";

export function isPublished(card: ForecastQuantityCard): boolean {
  return card.availability === "Forecast Available" && card.band !== null;
}

/**
 * Render a published frequency band as a sentence unit: "about 4 in 5" →
 * "about 4 times in 5", "less than 1 in 10" → "less than 1 time in 10"
 * (singular for a count of one). The ADR 0006 band vocabulary stays canonical
 * in the feed; this is display wording only, applied to every frequency line.
 * Statements without the "N in M" shape (including the empty withheld case)
 * pass through unchanged.
 */
export function frequencyWithUnit(statement: string): string {
  return statement.replace(
    /(\d+) in (\d+)/,
    (_match, count: string, denominator: string) =>
      `${count} time${count === "1" ? "" : "s"} in ${denominator}`,
  );
}

export interface CandidateWin {
  candidateId: string;
  name: string;
  band: string;
  frequencyStatement: string;
  /** kept for ordering only; never rendered */
  probability: number;
}

function toCandidateWin(
  candidateId: string,
  card: ForecastQuantityCard,
): CandidateWin | null {
  if (!isPublished(card)) return null;
  return {
    candidateId,
    name: candidateName(candidateId),
    band: card.band!,
    frequencyStatement: frequencyWithUnit(card.frequency_statement ?? ""),
    probability: card.probability ?? 0,
  };
}

/** Published candidate wins, favourite first. Withheld candidates are omitted. */
export function publishedCandidateWins(feed: MayoralForecastFeed): CandidateWin[] {
  return Object.entries(feed.candidate_win)
    .map(([id, card]) => toCandidateWin(id, card))
    .filter((win): win is CandidateWin => win !== null)
    .sort((a, b) => b.probability - a.probability);
}

/** The favourite, or null when nothing publishes. */
export function leadForecast(feed: MayoralForecastFeed): CandidateWin | null {
  return publishedCandidateWins(feed)[0] ?? null;
}

export interface AgnosticQuantity {
  key: "close_result";
  label: string;
  frequencyStatement: string;
}

/** Published candidate-agnostic quantities — Close-Result is the only one, and it
 *  stays outside every candidate card. Withheld → omitted (so the section can be
 *  dropped entirely when nothing agnostic publishes). */
export function agnosticQuantities(feed: MayoralForecastFeed): AgnosticQuantity[] {
  if (!isPublished(feed.close_result)) return [];
  return [
    {
      key: "close_result",
      label: "Chance of a close result",
      frequencyStatement: frequencyWithUnit(feed.close_result.frequency_statement ?? ""),
    },
  ];
}

export interface IncumbentDefeat {
  candidateId: string;
  name: string;
  label: string;
  frequencyStatement: string;
}

/** The incumbent's published defeat chance, tied to the incumbent the feed
 *  identifies (name resolved from that id, never hardcoded). Null when the race
 *  is open or the quantity is withheld — so it is omitted everywhere then. */
export function incumbentDefeat(feed: MayoralForecastFeed): IncumbentDefeat | null {
  const id = feed.incumbent_candidate_id;
  if (!id || !isPublished(feed.incumbent_defeat)) return null;
  const name = candidateName(id);
  return {
    candidateId: id,
    name,
    label: `Chance ${name} loses to any candidate`,
    frequencyStatement: frequencyWithUnit(feed.incumbent_defeat.frequency_statement ?? ""),
  };
}

/** The current viable field — the candidate_win keys (includes the incumbent). */
export function viableField(feed: MayoralForecastFeed): string[] {
  return Object.keys(feed.candidate_win);
}

/** Plain-language basis line for the tier (spec §Q12: no "M3" codes surfaced). */
export function evidenceBasisLine(tierLabel: string): string {
  const code = tierLabel.split("—")[0]?.trim().toUpperCase();
  switch (code) {
    case "M3":
      return "Based on repeated final-ballot polling of the confirmed field.";
    case "M2":
      return "Based on final-ballot polling of the confirmed field.";
    case "M1":
      return "Based on early polling, before the ballot was final.";
    case "M0":
      return "Based on the historical record only — no current polling yet.";
    default:
      return "Based on the available polling evidence.";
  }
}
