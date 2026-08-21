/**
 * Compose concise, candidate-specific explanations of fired historical-hint
 * signals from their structured provenance (ticket 03), replacing the generic
 * catalog copy. Each carries a signed direction for the up/down icon. Descriptive
 * and non-predictive — no magnitude, probability, or causal claim.
 */

import { officeLabel, ordinal } from "@/lib/council-history";
import type { CouncilRaceCard, FiredHint, PastElection } from "@/types/feeds";

export interface HistorySignal {
  key: string;
  text: string;
  direction: "positive" | "negative";
}

function signalOfficeLabel(officeType: string | null): string {
  switch (officeType) {
    case "mp":
      return "MP";
    case "mpp":
      return "MPP";
    case "councillor":
      return "councillor";
    case "mayor":
      return "mayor";
    case "trustee":
      return "school-board trustee";
    default:
      return "elected office";
  }
}

function direction(hint: FiredHint): "positive" | "negative" {
  return hint.direction === "positive" ? "positive" : "negative";
}

function explainOwnHint(hint: FiredHint): HistorySignal | null {
  const s = hint.source;
  const key = hint.hint_id;
  switch (hint.hint_id) {
    // The "has held office before" fact is already visible in the "Former X"
    // headline and the past-races list — omit it rather than restate it.
    case "own_any_prior_elected_office__open_contest":
      return null;

    case "own_prior_win_type__trustee":
      return { key, direction: "positive", text: "Previously elected as a school-board trustee." };

    case "own_most_recent_prior_elected_margin": {
      if (!s) return null;
      const office = signalOfficeLabel(s.office_type);
      const when = s.year ? ` — ${s.year} ${office}` : "";
      if (s.result === "won") {
        return { key, direction: "positive", text: `Won their most recent race${when}.` };
      }
      const place =
        s.rank && s.field_size ? `${ordinal(s.rank)} of ${s.field_size}` : "a loss";
      const behind =
        s.margin != null && s.margin < 0
          ? `, ~${Math.round(Math.abs(s.margin) * 100)} points behind`
          : "";
      return { key, direction: "negative", text: `Most recent race: ${place}${when}${behind}.` };
    }

    case "own_prior_elected_victory_count": {
      const wins = s?.victory_count ?? 0;
      if (wins >= 1) {
        return {
          key,
          direction: "positive",
          text: `Won elected office ${wins} ${wins === 1 ? "time" : "times"} before.`,
        };
      }
      const races = s?.qualifying_candidacy_count ?? 0;
      return {
        key,
        direction: "negative",
        text: `No wins in ${races} prior elected ${races === 1 ? "race" : "races"}.`,
      };
    }

    default:
      return null;
  }
}

/** Own-history signals for a candidate, as specific explanations with a signed
 *  direction. Opponent signals (subject "opponent_history") are placed at race
 *  level by ticket 04, not here. */
export function ownHistorySignals(hints: FiredHint[]): HistorySignal[] {
  const out: HistorySignal[] = [];
  for (const hint of hints) {
    if (hint.subject !== "own_history") continue;
    const signal = explainOwnHint(hint);
    if (signal) out.push({ ...signal, direction: signal.direction ?? direction(hint) });
  }
  return out;
}

// ── race-level opponent history (ticket 04) ─────────────────────────────────

const OFFICE_SENIORITY: Record<string, number> = {
  mayor: 5,
  mp: 4,
  mpp: 3,
  councillor: 2,
  trustee: 1,
};

export interface NotableChallenger {
  name: string;
  /** e.g. "MP" — the most senior office they previously won */
  office: string;
  year: number;
}

/**
 * Notable challengers, surfaced once at race level rather than as per-candidate
 * opponent signals (ticket 04): each non-incumbent candidate who has previously
 * *won* elected office, identified by their most senior prior win. The sitting
 * incumbent is excluded — their record is already first-class in the incumbent
 * section, so an opponent signal about them would merely duplicate it. Derived
 * from each candidate's own linked history, so it is not gated by which other
 * candidates are identity-matched.
 */
export function notableChallengers(card: CouncilRaceCard): NotableChallenger[] {
  const incumbentName = card.is_open_seat ? null : card.incumbent.name;
  const out: NotableChallenger[] = [];
  for (const candidate of card.candidates) {
    if (incumbentName && candidate.display_name === incumbentName) continue;
    const wins = candidate.past_elections.filter((e) => e.result === "won");
    if (wins.length === 0) continue;
    const top = wins.reduce((a: PastElection, b: PastElection) =>
      (OFFICE_SENIORITY[b.office_type] ?? 0) > (OFFICE_SENIORITY[a.office_type] ?? 0)
        ? b
        : a,
    );
    out.push({ name: candidate.display_name, office: officeLabel(top), year: top.year });
  }
  return out;
}
