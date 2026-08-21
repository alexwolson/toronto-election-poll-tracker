/**
 * Pure council-index logic (spec §Q13). Attention markers only — the council
 * feed publishes no win probabilities, and neither do we. Sorting defaults to
 * most-exposed-first; open seats are classed separately and flagged in the UI.
 */

import type { CouncilRaceCard, CouncilRaceCardsFeed } from "@/types/feeds";

export type AttentionLevel = "high" | "elevated" | "quiet" | "open";

/** Editorial thresholds (judgment, not fitting). A fired trigger means attention,
 *  not a likely defeat — see the feed's base_rate_note. */
const HIGH_DEFEATABILITY = 60;
const ELEVATED_DEFEATABILITY = 45;

export function wardAttentionLevel(card: CouncilRaceCard): AttentionLevel {
  if (card.is_open_seat) return "open";
  const triggers = card.incumbent.exposure_triggers.length;
  const score = card.incumbent.defeatability_score ?? 0;
  if (triggers >= 2 || score >= HIGH_DEFEATABILITY) return "high";
  if (triggers >= 1 || score >= ELEVATED_DEFEATABILITY) return "elevated";
  return "quiet";
}

// Attention cohorts, higher = earlier. Open seats and high-attention incumbents
// lead; the +intensity (capped < 1000) orders within a band without crossing it.
const LEVEL_BASE: Record<AttentionLevel, number> = {
  open: 4000,
  high: 3000,
  elevated: 2000,
  quiet: 1000,
};

/** Ordering key for the default attention sort (higher = earlier). Open seats
 *  and high-attention incumbents form the leading cohort; within the incumbent
 *  bands, more fired triggers and higher defeatability sort first. */
export function attentionScore(card: CouncilRaceCard): number {
  const level = wardAttentionLevel(card);
  if (level === "open") return LEVEL_BASE.open;
  const triggers = card.incumbent.exposure_triggers.length;
  const score = card.incumbent.defeatability_score ?? 0;
  return LEVEL_BASE[level] + Math.min(triggers * 100 + score, 999);
}

export type SortMode = "attention" | "ward";

export interface WardEntry {
  ward: string;
  card: CouncilRaceCard;
}

export function sortWards(
  feed: CouncilRaceCardsFeed,
  mode: SortMode = "attention",
): WardEntry[] {
  const entries: WardEntry[] = Object.entries(feed.wards).map(([ward, card]) => ({
    ward,
    card,
  }));
  if (mode === "ward") {
    return entries.sort((a, b) => Number(a.ward) - Number(b.ward));
  }
  return entries.sort(
    (a, b) =>
      attentionScore(b.card) - attentionScore(a.card) ||
      Number(a.ward) - Number(b.ward),
  );
}

export interface WardIndexItem {
  ward: string;
  wardNum: number;
  name: string;
  incumbentName: string | null;
  isOpen: boolean;
  attention: AttentionLevel;
  score: number;
  triggers: string[];
}

/** Flattened, attention-ordered view for the council index (spec §Q13). */
export function wardIndexView(feed: CouncilRaceCardsFeed): WardIndexItem[] {
  return sortWards(feed, "attention").map(({ ward, card }) => ({
    ward,
    wardNum: Number(ward),
    name: card.ward_name ?? `Ward ${ward}`,
    incumbentName: card.is_open_seat ? null : card.incumbent.name,
    isOpen: card.is_open_seat,
    attention: wardAttentionLevel(card),
    score: attentionScore(card),
    triggers: card.incumbent.exposure_triggers.map((t) => t.copy),
  }));
}

export interface IndexCounts {
  total: number;
  open: number;
  contestedIncumbents: number;
  withTriggers: number;
}

export function indexCounts(feed: CouncilRaceCardsFeed): IndexCounts {
  const cards = Object.values(feed.wards);
  const open = cards.filter((c) => c.is_open_seat).length;
  const withTriggers = cards.filter(
    (c) => !c.is_open_seat && c.incumbent.exposure_triggers.length > 0,
  ).length;
  return {
    total: cards.length,
    open,
    contestedIncumbents: cards.length - open,
    withTriggers,
  };
}
