/**
 * Council-index presentation helpers (spec §Q13). Backend publishes the
 * attention category and ordering key; this layer only sorts and formats them.
 * The feed publishes no win probabilities, and neither does the UI.
 */

import { incumbentExposureFacts } from "@/lib/council-signals";
import type { CouncilRaceCard, CouncilRaceCardsFeed } from "@/types/feeds";

export type AttentionLevel = "high" | "elevated" | "quiet" | "open";

export function wardAttentionLevel(card: CouncilRaceCard): AttentionLevel {
  return card.attention.level;
}

/** Backend-owned ordering key for the default attention sort (higher = earlier). */
export function attentionScore(card: CouncilRaceCard): number {
  return card.attention.score;
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
    // Concrete ward-fact explanations (ticket 05), not the generic catalog copy.
    triggers: incumbentExposureFacts(card).map((f) => f.text),
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
