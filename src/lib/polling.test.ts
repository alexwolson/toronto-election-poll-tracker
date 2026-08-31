import { describe, expect, it } from "vitest";
import pollingFixture from "../../fixtures/mayoral_polling.json";
import type { MayoralPollingFeed, Poll } from "@/types/feeds";
import {
  candidateTrends,
  explicitOtherShare,
  latestFieldShares,
  latestReferencedPollDate,
  pollMethodLabel,
  pollsterRegistry,
  pollsterWebsite,
} from "./polling";

const feed = pollingFixture as unknown as MayoralPollingFeed;
const CHOW = "per_a4291ca7539b53e2acc1c4f108bc73e6";
const BRADFORD = "per_d8dfddfb642358e299f4b428292666bf";
const ALEXANDER = "per_345dd6a9ee645c0bb5a8ade615f91579";
const FIELD = [CHOW, BRADFORD, ALEXANDER];

describe("latest field shares", () => {
  it("reads the newest poll, restricted to the field", () => {
    const shares = latestFieldShares(feed, FIELD);
    expect(shares[CHOW]).toBeCloseTo(0.5, 4);
    expect(shares[ALEXANDER]).toBeCloseTo(0.08, 4);
    expect("other" in shares).toBe(false);
  });
});

describe("poll context", () => {
  it("shows only explicitly reported responses outside the forecast field", () => {
    expect(explicitOtherShare(feed.latest!, FIELD)).toBeCloseTo(0.03, 4);

    const incompleteWithoutResidual: Poll = {
      ...feed.latest!,
      shares: { [CHOW]: 0.5, [BRADFORD]: 0.35 },
    };
    expect(explicitOtherShare(incompleteWithoutResidual, FIELD)).toBeNull();
  });

  it("expands terse method codes without rewriting unfamiliar labels", () => {
    expect(pollMethodLabel("IVR")).toBe("Interactive voice response (IVR)");
    expect(pollMethodLabel("online")).toBe("Online survey");
    expect(pollMethodLabel("Telephone interviews")).toBe("Telephone interviews");
  });

  it("dates the forecast from the newest poll it references", () => {
    expect(
      latestReferencedPollDate(feed, ["forum-2026-07-29", "pallas-2026-08-21"]),
    ).toBe("2026-08-21");
    expect(latestReferencedPollDate(feed, ["missing-poll"])).toBeNull();
  });
});

describe("candidate trends", () => {
  it("fits a LOESS curve per candidate from that candidate's own polls", () => {
    const trends = candidateTrends(feed, FIELD);
    const chow = trends.find((t) => t.id === CHOW)!;
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
    const alexander = candidateTrends(feed, FIELD).find((t) => t.id === ALEXANDER)!;
    expect(alexander.markers.length).toBeLessThan(5); // tested in only a few polls
    expect(alexander.curve).toBeNull();
  });

  it("does not zero-fill a candidate not tested in a poll", () => {
    const bradford = candidateTrends(feed, FIELD).find((t) => t.id === BRADFORD)!;
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
    expect(liaison!.website).toBe("https://press.liaisonstrategies.ca/");
  });

  it("links known firms and leaves unknown firms unlinked", () => {
    expect(pollsterWebsite("Forum Research")).toBe("https://forumresearch.com/");
    expect(pollsterWebsite("Future Pollster")).toBeNull();
  });
});
