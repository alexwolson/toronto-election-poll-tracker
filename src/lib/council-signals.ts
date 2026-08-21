/**
 * Compose concise, candidate-specific explanations of fired historical-hint
 * signals from their structured provenance. Each displayed categorical hint
 * names the *condition the historical analysis tested* and plainly says whether
 * it helps or hurts (from the approved hint's supplied direction). The specific
 * result that establishes the condition stays in the candidate's chronological
 * election history, not here. Descriptive and non-predictive — no magnitude,
 * probability, or causal claim.
 */

import { formatSharePct } from "@/lib/format";
import type { CouncilRaceCard, FiredHint } from "@/types/feeds";

function withCommas(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export interface HistorySignal {
  key: string;
  text: string;
  direction: "positive" | "negative";
}

function direction(hint: FiredHint): "positive" | "negative" {
  return hint.direction === "positive" ? "positive" : "negative";
}

/** ", which helps" / ", which hurts" from the approved hint's supplied direction. */
function directionClause(hint: FiredHint): string {
  return direction(hint) === "positive" ? ", which helps" : ", which hurts";
}

/** Own-history findings for one candidate, each as a tested condition plus its
 * direction. Generic all-history race-count hints are omitted because the card
 * already shows the count and lists those races; the paired unsuccessful-council-
 * run comparison and the continuous recent-margin row are likewise not surfaced. */
export function ownHistorySignals(hints: FiredHint[]): HistorySignal[] {
  const own = new Map(
    hints.filter((hint) => hint.subject === "own_history").map((hint) => [hint.hint_id, hint]),
  );
  const out: HistorySignal[] = [];

  const add = (hint: FiredHint | undefined, condition: string) => {
    if (!hint) return;
    out.push({
      key: hint.hint_id,
      direction: direction(hint),
      text: `${condition}${directionClause(hint)}.`,
    });
  };

  const trustee = own.get("own_prior_win_type__trustee");
  const priorWin = own.get("own_any_all_past_race_victory__non_incumbent_non_returning");
  const raceCount = priorWin?.source?.qualifying_candidacy_count;

  add(own.get("own_returning_councillor__open_contest"), "Previously served as a Toronto councillor");
  add(trustee, "Previously elected as a school-board trustee");
  // A sole prior win that IS the trustee race is already stated by the trustee
  // line; only surface the general "won a previous election" when it adds more.
  if (!(raceCount === 1 && trustee)) add(priorWin, "Won a previous election");
  add(own.get("own_prior_mpp_race__non_incumbent_non_returning"), "Previously ran for MPP");

  return out;
}

/** Opponent-history findings are ward facts. Deduplicate them across candidates
 * and show each once instead of repeating the same opponent under every card. */
export function raceHistorySignals(card: CouncilRaceCard): HistorySignal[] {
  const out: HistorySignal[] = [];
  const seen = new Set<string>();
  for (const candidate of card.candidates) {
    for (const hint of candidate.historical_hints) {
      if (hint.subject !== "opponent_history") continue;
      const source = hint.source;
      const key = `${hint.hint_id}:${source?.opponent_name ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);

      if (hint.hint_id === "opponent_returning_councillor__open_contest") {
        if (!source?.opponent_name) continue;
        out.push({
          key,
          direction: direction(hint),
          text: `${source.opponent_name} previously served as a councillor — a disadvantage for the rest of this open field.`,
        });
      }
    }
  }
  return out;
}

// ── incumbent CDI exposure, as concrete ward facts (ticket 05) ──────────────

export interface ExposureFact {
  key: string;
  text: string;
}

/**
 * Translate the incumbent's fired CDI components into concrete ward facts using
 * the ward's actual values (ticket 05) — no "combined index" / "structurally
 * exposed" jargon. A high CDI is explained through its components (prior vote
 * share, votes as a share of eligible electors); electorate growth is a separate
 * fact so the index explanation covers the remaining meaning, not a repeat.
 * Gated on the same fired triggers, so thresholds are unchanged.
 */
export function incumbentExposureFacts(card: CouncilRaceCard): ExposureFact[] {
  if (card.is_open_seat) return [];
  const inc = card.incumbent;
  const prior = card.prior_result;
  const triggers = new Set(inc.exposure_triggers.map((t) => t.key));
  const ward = card.ward_name ?? `Ward ${card.ward}`;
  const facts: ExposureFact[] = [];

  if (
    triggers.has("ward_growth_exceeds_cushion") &&
    inc.new_voter_margin != null &&
    prior?.margin_votes != null
  ) {
    const newElectors = inc.new_voter_margin + prior.margin_votes;
    facts.push({
      key: "growth",
      text: `${ward} has gained an estimated ${withCommas(newElectors)} more voters since ${prior.year} — far more than ${inc.name}'s ${withCommas(prior.margin_votes)}-vote winning margin.`,
    });
  }

  if (triggers.has("high_structural_exposure")) {
    if (inc.vote_share != null && inc.electorate_share != null) {
      facts.push({
        key: "cdi",
        text: `${inc.name} won with ${formatSharePct(inc.vote_share)} of votes cast and support from ${formatSharePct(inc.electorate_share)} of eligible voters — both among the lowest for Toronto incumbents.`,
      });
    } else {
      facts.push({
        key: "cdi",
        text: `${inc.name} has a high Councillor Defeatability Index rating from City Hall Watcher.`,
      });
    }
  } else if (triggers.has("narrow_prior_win") && inc.vote_share != null) {
    facts.push({
      key: "narrow",
      text: `${inc.name} won with only ${formatSharePct(inc.vote_share)} of votes cast — below where incumbents typically feel safe.`,
    });
  }
  return facts;
}
