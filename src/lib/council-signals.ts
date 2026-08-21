/**
 * Compose concise, candidate-specific explanations of fired historical-hint
 * signals from their structured provenance (ticket 03), replacing the generic
 * catalog copy. Each carries a signed direction for the up/down icon. Descriptive
 * and non-predictive — no magnitude, probability, or causal claim.
 */

import { formatSharePct } from "@/lib/format";
import { ordinal } from "@/lib/council-history";
import type { CouncilRaceCard, FiredHint, SignalSource } from "@/types/feeds";

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

function officeName(office: string | null): string {
  switch (office) {
    case "councillor":
      return "council";
    case "trustee":
      return "school-board trustee";
    case "mpp":
      return "MPP";
    case "mp":
      return "MP";
    case "mayor":
      return "mayoral";
    default:
      return office ?? "election";
  }
}

function describeRace(source: SignalSource | null): string | null {
  if (!source || source.year == null || source.office_type == null) return null;
  const office = officeName(source.office_type);
  const district = source.district_name ? ` in ${source.district_name}` : "";
  const points = source.margin == null ? null : Math.round(Math.abs(source.margin) * 100);
  if (source.result === "won") {
    const margin = points != null ? ` by about ${points} points` : "";
    return `won the ${source.year} ${office} race${district}${margin}`;
  }
  const place =
    source.rank != null && source.field_size != null
      ? `${ordinal(source.rank)} of ${source.field_size} in `
      : "ran in ";
  const margin = points != null ? `, about ${points} points behind` : "";
  return `${place}the ${source.year} ${office} race${district}${margin}`;
}

function historyCountSignal(hint: FiredHint): HistorySignal {
  const races = hint.source?.qualifying_candidacy_count;
  return {
    key: hint.hint_id,
    direction: direction(hint),
    text:
      races != null
        ? `Has run in ${races} previous ${races === 1 ? "race" : "races"}.`
        : "Has previous election experience.",
  };
}

/** Own-history findings for one candidate. Overlapping catalog rows are composed
 * into one reader-facing fact where they describe the same visible race history;
 * both sides of the required prior-council-loss comparison remain separate. */
export function ownHistorySignals(hints: FiredHint[]): HistorySignal[] {
  const own = new Map(
    hints.filter((hint) => hint.subject === "own_history").map((hint) => [hint.hint_id, hint]),
  );
  const out: HistorySignal[] = [];

  const returning = own.get("own_returning_councillor__open_contest");
  if (returning) {
    out.push({
      key: returning.hint_id,
      direction: direction(returning),
      text: "Previously served as a Toronto councillor.",
    });
  }

  const trustee = own.get("own_prior_win_type__trustee");
  if (trustee) {
    out.push({
      key: trustee.hint_id,
      direction: direction(trustee),
      text: "Previously elected as a school-board trustee.",
    });
  }

  const priorWin = own.get(
    "own_any_all_past_race_victory__non_incumbent_non_returning",
  );
  const multiple = own.get("own_multiple_all_past_races__non_incumbent_non_returning");
  const anyRace = own.get("own_any_all_past_race__non_incumbent_non_returning");
  const mpp = own.get("own_prior_mpp_race__non_incumbent_non_returning");
  const historyHint = multiple ?? anyRace;
  const raceCount =
    priorWin?.source?.qualifying_candidacy_count ??
    historyHint?.source?.qualifying_candidacy_count;
  const soleNamedOfficeRace = raceCount === 1 && Boolean(trustee || mpp);

  if (priorWin && !(raceCount === 1 && trustee)) {
    const wins = priorWin.source?.victory_count;
    const races = priorWin.source?.qualifying_candidacy_count;
    out.push({
      key: priorWin.hint_id,
      direction: direction(priorWin),
      text:
        wins != null && races != null
          ? `Won ${wins} of ${races} previous ${races === 1 ? "race" : "races"}.`
          : "Won at least one previous race.",
    });
  }

  // A win count already includes the total number of races. A sole MPP or
  // trustee race is also better expressed through its more specific finding.
  if (!priorWin && !soleNamedOfficeRace) {
    if (multiple) out.push(historyCountSignal(multiple));
    else if (anyRace) out.push(historyCountSignal(anyRace));
  }

  if (mpp) {
    const race = describeRace(mpp.source);
    out.push({
      key: mpp.hint_id,
      direction: direction(mpp),
      text: race ? `Previously ${race}.` : "Previously ran for MPP.",
    });
  }

  // Continuous recent-margin rows have no evidence-backed candidate-level
  // positive/negative cutoff. Their underlying result is already visible in the
  // history list, so do not manufacture an arrow. The paired unsuccessful-
  // council-run comparison is retained in the feed but intentionally omitted
  // from candidate cards at the editor's request.

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
