import { describe, expect, it } from "vitest";
import councilFixture from "../../fixtures/council_race_cards.json";
import type { CouncilRaceCardsFeed } from "@/types/feeds";
import {
  attentionScore,
  indexCounts,
  sortWards,
  wardAttentionLevel,
  wardIndexView,
} from "./council";

const feed = councilFixture as unknown as CouncilRaceCardsFeed;

describe("ward sorting", () => {
  it("returns every ward, sorted by attention score descending (most-exposed first)", () => {
    const sorted = sortWards(feed);
    expect(sorted).toHaveLength(25);
    for (let i = 1; i < sorted.length; i++) {
      expect(attentionScore(sorted[i].card) <= attentionScore(sorted[i - 1].card)).toBe(
        true,
      );
    }
  });

  it("can sort by ward number instead", () => {
    const byWard = sortWards(feed, "ward");
    expect(byWard.map((w) => Number(w.ward))).toEqual(
      Array.from({ length: 25 }, (_, i) => i + 1),
    );
  });

  it("puts open seats and high-attention races ahead of elevated and quiet ones", () => {
    const levels = sortWards(feed).map(({ card }) => wardAttentionLevel(card));
    const idx = (pred: (l: string) => boolean) =>
      levels.map((l, i) => (pred(l) ? i : -1)).filter((i) => i >= 0);
    const leading = idx((l) => l === "open" || l === "high");
    const trailing = idx((l) => l === "elevated" || l === "quiet");
    // every open/high race precedes every elevated/quiet race
    expect(Math.max(...leading)).toBeLessThan(Math.min(...trailing));
    // and open seats specifically lead
    const opens = idx((l) => l === "open");
    expect(opens.length).toBeGreaterThan(0);
    expect(Math.max(...opens)).toBeLessThan(Math.min(...trailing));
  });
});

describe("ward attention level", () => {
  it("bands an exposed incumbent as elevated (ward 5: 1 trigger, defeatability 53)", () => {
    expect(wardAttentionLevel(feed.wards["5"])).toBe("elevated");
  });

  it("reads the backend's open-seat category", () => {
    expect(wardAttentionLevel(feed.wards["4"])).toBe("open");
  });

  it("reads the backend's lower-attention category", () => {
    expect(wardAttentionLevel(feed.wards["15"])).toBe("quiet");
  });
});

describe("ward index view", () => {
  it("flattens all 25 wards, most-exposed first, with attention + numeric ward", () => {
    const view = wardIndexView(feed);
    expect(view).toHaveLength(25);
    for (let i = 1; i < view.length; i++) {
      expect(view[i].score <= view[i - 1].score).toBe(true);
    }
    const ward5 = view.find((w) => w.ward === "5")!;
    expect(ward5.wardNum).toBe(5);
    expect(ward5.name).toBe("York South-Weston");
    expect(ward5.attention).toBe("elevated");
    expect(ward5.incumbentName).toBe("Frances Nunziata");
  });
});

describe("index counts", () => {
  it("summarises the 25 wards", () => {
    const counts = indexCounts(feed);
    expect(counts.total).toBe(25);
    expect(counts.open + counts.contestedIncumbents).toBe(25);
    expect(counts.withTriggers).toBeLessThanOrEqual(25);
  });
});
