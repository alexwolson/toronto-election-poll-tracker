import { describe, expect, it } from "vitest";
import pollingFixture from "../../fixtures/mayoral_polling.json";
import type { MayoralPollingFeed } from "@/types/feeds";
import { candidateTrends, latestFieldShares, pollsterRegistry } from "./polling";

const feed = pollingFixture as unknown as MayoralPollingFeed;
const FIELD = ["chow", "bradford", "alexander"];

describe("latest field shares", () => {
  it("reads the newest poll, restricted to the field", () => {
    const shares = latestFieldShares(feed, FIELD);
    expect(shares.chow).toBeCloseTo(0.4851, 4);
    expect(shares.alexander).toBeCloseTo(0.1089, 4);
    expect("other" in shares).toBe(false);
  });
});

describe("candidate trends", () => {
  it("fits a LOESS curve per candidate from that candidate's own polls", () => {
    const trends = candidateTrends(feed, FIELD);
    const chow = trends.find((t) => t.id === "chow")!;
    // markers are that candidate's polls, chronological, shares in (0,1)
    expect(chow.markers.length).toBeGreaterThan(5);
    for (let i = 1; i < chow.markers.length; i++) {
      expect(chow.markers[i].x >= chow.markers[i - 1].x).toBe(true);
    }
    expect(chow.markers.every((m) => m.y > 0 && m.y < 1)).toBe(true);
    // enough observations → a curve, bounded to the observed date range
    expect(chow.curve).not.toBeNull();
    expect(chow.curve![0].x).toBe(chow.markers[0].x);
    expect(chow.curve![chow.curve!.length - 1].x).toBe(
      chow.markers[chow.markers.length - 1].x,
    );
  });

  it("leaves a thin series as markers only (no curve)", () => {
    const alexander = candidateTrends(feed, FIELD).find((t) => t.id === "alexander")!;
    expect(alexander.markers.length).toBeLessThan(5); // tested in only a few polls
    expect(alexander.curve).toBeNull();
  });

  it("does not zero-fill a candidate not tested in a poll", () => {
    const bradford = candidateTrends(feed, FIELD).find((t) => t.id === "bradford")!;
    // every marker is a real reported share, never a 0 stand-in
    expect(bradford.markers.every((m) => m.y > 0)).toBe(true);
    // fewer markers than total polls, because some polls didn't test bradford
    expect(bradford.markers.length).toBeLessThan(feed.polls.length);
  });
});

describe("pollster registry", () => {
  it("counts polls per firm, most frequent first", () => {
    const registry = pollsterRegistry(feed);
    const total = registry.reduce((sum, r) => sum + r.count, 0);
    expect(total).toBe(feed.polls.length);
    // sorted descending by count
    for (let i = 1; i < registry.length; i++) {
      expect(registry[i].count <= registry[i - 1].count).toBe(true);
    }
    const liaison = registry.find((r) => r.firm === "Liaison Strategies");
    expect(liaison).toBeDefined();
    expect(liaison!.count).toBeGreaterThan(1);
  });
});
