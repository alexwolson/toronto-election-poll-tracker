import { describe, expect, it } from "vitest";
import pollingFixture from "../../fixtures/mayoral_polling.json";
import type { MayoralPollingFeed } from "@/types/feeds";
import { latestFieldShares, pollRows, pollsterRegistry } from "./polling";

const feed = pollingFixture as unknown as MayoralPollingFeed;
const FIELD = ["chow", "bradford", "alexander"];

describe("poll rows for the chart", () => {
  it("emits one chronological row per poll, restricted to the current field", () => {
    const rows = pollRows(feed, FIELD);
    // chronological: dates non-decreasing
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].date >= rows[i - 1].date).toBe(true);
    }
    const last = rows[rows.length - 1];
    expect(last.poll_id).toBe("liaison-2026-08-16");
    expect(last.chow).toBeCloseTo(0.4851, 4);
    expect(last.bradford).toBeCloseTo(0.3762, 4);
    expect(last.alexander).toBeCloseTo(0.1089, 4);
  });

  it("leaves a candidate null in polls that did not test them", () => {
    const rows = pollRows(feed, FIELD);
    const early = rows.find((r) => r.poll_id === "liaison-2026-07-26");
    expect(early).toBeDefined();
    // Alexander was not in the field for that poll.
    expect(early!.alexander).toBeNull();
    expect(early!.chow).toBeCloseTo(0.49, 2);
  });

  it("ignores candidates outside the requested field", () => {
    const rows = pollRows(feed, FIELD);
    for (const row of rows) {
      expect("tory" in row).toBe(false);
      expect("ford" in row).toBe(false);
    }
  });
});

describe("latest field shares", () => {
  it("reads the newest poll, restricted to the field", () => {
    const shares = latestFieldShares(feed, FIELD);
    expect(shares.chow).toBeCloseTo(0.4851, 4);
    expect(shares.alexander).toBeCloseTo(0.1089, 4);
    expect("other" in shares).toBe(false);
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
