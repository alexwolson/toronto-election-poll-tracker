import { describe, expect, it } from "vitest";
import pollingFixture from "../../fixtures/mayoral_polling.json";
import type { MayoralPollingFeed, Poll } from "@/types/feeds";
import {
  allRespondentTrends,
  ALL_RESPONDENT_OTHER_ID,
  ALL_RESPONDENT_UNDECIDED_ID,
  candidateTrends,
  candidateTrendsForPolls,
  candidateChoiceShares,
  denominatorPhrase,
  explicitOtherShare,
  latestFieldShares,
  latestPoll,
  latestReferencedPollDate,
  pollsByFieldwork,
  pollsSinceNominationsClosed,
  pollMethodLabel,
  pollsterRegistry,
  pollsterWebsite,
  residualShares,
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
  // Older offline fixtures predate denominator metadata. These tests exercise
  // known decided readings; separate cases below test missing metadata.
  const decidedFeed = { ...feed, polls: feed.polls.map((poll) => ({
    ...poll, denominator: "Decided voters",
  })) };
  it("selects post-nomination full-field markers while preserving the full-history fit", () => {
    const recentFeed = { ...decidedFeed, polls: decidedFeed.polls.map((poll, index) =>
      index < 3 ? { ...poll, date_conducted: `2026-09-0${5 + index}` } : poll,
    ) };
    const polls = pollsSinceNominationsClosed(recentFeed, FIELD);
    const allTrends = candidateTrends(recentFeed, FIELD);
    const qualified = candidateTrendsForPolls(allTrends, polls);
    expect(polls).toHaveLength(3);
    for (const trend of qualified) {
      expect(trend.markers.map((point) => point.poll_id).sort())
        .toEqual(polls.map((poll) => poll.poll_id).sort());
      expect(trend.curve).toBe(allTrends.find((full) => full.id === trend.id)!.curve);
    }
    // A refit on just these three polls would lose the curve entirely.
    expect(qualified[0].curve).not.toBeNull();
    expect(allTrends[0].markers.length).toBeGreaterThan(qualified[0].markers.length);
    const zero = { ...decidedFeed.polls[0], date_conducted: "2026-08-22",
      shares: { [CHOW]: 0.5, [BRADFORD]: 0.4, [ALEXANDER]: 0 } };
    const missing = { ...zero, shares: { [CHOW]: 0.5, [ALEXANDER]: 0.1 } };
    const onDeadline = { ...zero, date_conducted: "2026-08-21" };
    const beforeDeadline = { ...zero, date_conducted: "2026-07-29",
      date_published: "2026-09-01" };
    expect(pollsSinceNominationsClosed(
      { ...feed, polls: [zero, missing, onDeadline, beforeDeadline] }, FIELD,
    )).toEqual([zero]);
    expect(pollsSinceNominationsClosed(decidedFeed, [])).toEqual([]);
  });
  it("fits a LOESS curve per candidate from that candidate's own polls", () => {
    const trends = candidateTrends(decidedFeed, FIELD);
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
    const alexander = candidateTrends(decidedFeed, FIELD).find((t) => t.id === ALEXANDER)!;
    expect(alexander.markers.length).toBeLessThan(5); // tested in only a few polls
    expect(alexander.curve).toBeNull();
  });

  it("does not zero-fill a candidate not tested in a poll", () => {
    const bradford = candidateTrends(decidedFeed, FIELD).find((t) => t.id === BRADFORD)!;
    // every marker is a real reported share, never a 0 stand-in
    expect(bradford.markers.every((m) => m.y > 0)).toBe(true);
    // fewer markers than total polls, because some polls didn't test bradford
    expect(bradford.markers.length).toBeLessThan(feed.polls.length);
  });
});

describe("candidate-choice chart basis", () => {
  const ipsos: Poll = {
    ...feed.polls[0], poll_id: "ipsos-september", firm: "Ipsos",
    denominator: "All respondents",
    shares: { [CHOW]: 0.36, [BRADFORD]: 0.21, [ALEXANDER]: 0.04,
      "response:other": 0.05, "response:undecided": 0.3, "response:would_not_vote": 0.03 },
  };

  it("uses the complete candidate total rather than 100 minus rounded nonchoices", () => {
    const source = structuredClone(ipsos);
    const reading = candidateChoiceShares(ipsos)!;
    expect(reading.derived).toBe(true);
    expect(reading.shares[CHOW]).toBeCloseTo(36 / 66);
    expect(reading.shares[BRADFORD]).toBeCloseTo(21 / 66);
    expect(reading.shares[ALEXANDER]).toBeCloseTo(4 / 66);
    expect(reading.shares["response:other"]).toBeCloseTo(5 / 66);
    expect(Object.keys(reading.shares)).not.toContain("response:undecided");
    expect(ipsos).toEqual(source);
  });

  it("includes candidates outside the forecast field without inventing missing candidates", () => {
    const earlier: Poll = { ...ipsos, shares: {
      [CHOW]: 0.33, per_former_candidate: 0.25, "response:other": 0.31,
      "response:would_not_vote": 0.11,
    } };
    const trends = candidateTrends({ ...feed, polls: [earlier] }, FIELD);
    expect(trends[0].markers[0]).toMatchObject({
      reportedShare: 0.33, derived: true, firm: "Ipsos",
    });
    expect(trends[0].markers[0].y).toBeCloseTo(33 / 89);
    expect(trends[1].markers).toEqual([]);
    expect(trends[2].markers).toEqual([]);
  });

  it("preserves published decided shares including their rounding", () => {
    const poll: Poll = { ...ipsos, denominator: "Decided and leaning voters",
      shares: { [CHOW]: 0.5, [BRADFORD]: 0.39, [ALEXANDER]: 0.1, "response:other": 0.02 } };
    expect(candidateChoiceShares(poll)).toEqual({ shares: poll.shares, derived: false });
  });

  it("leaves unknown, incomplete and unclassifiable readings out of the smoother", () => {
    const unknown = { ...ipsos, denominator: "Not stated" };
    const incomplete = { ...ipsos, shares: { [CHOW]: 0.36, [BRADFORD]: 0.21 } };
    const combined = { ...ipsos, shares: {
      [CHOW]: 0.36, [BRADFORD]: 0.21, "response:combined_residual": 0.43,
    } };
    for (const poll of [unknown, incomplete, combined, { ...ipsos, denominator: undefined }]) {
      expect(candidateChoiceShares(poll)).toBeNull();
    }
    const valid = { ...feed, polls: [ipsos] };
    expect(candidateTrends({ ...valid, polls: [unknown, incomplete, combined, ipsos] }, FIELD))
      .toEqual(candidateTrends(valid, FIELD));
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

describe("fieldwork order", () => {
  /** The feed lists polls newest published first; the site orders by when the
   * fieldwork happened. Ipsos's September 23 release of a September 4-8 poll is
   * the case: published last, conducted before two other polls. */
  function staggered(): MayoralPollingFeed {
    const copy = structuredClone(feed);
    copy.polls[0] = { ...copy.polls[0], date_conducted: "2026-08-10", date_published: "2026-08-25" };
    copy.latest = copy.polls[0];
    return copy;
  }
  it("orders polls by fieldwork end, newest first, not by publication", () => {
    const ordered = pollsByFieldwork(staggered());
    const dates = ordered.map((p) => p.date_conducted);
    expect(dates).toEqual([...dates].sort().reverse());
    expect(ordered[0].poll_id).toBe("liaison-2026-08-16");
    expect(ordered.map((p) => p.poll_id)).toContain("pallas-2026-08-21");
    expect(ordered).toHaveLength(feed.polls.length);
  });
  it("names the latest poll by fieldwork and reads its shares", () => {
    const stale = staggered();
    expect(latestPoll(stale)?.poll_id).toBe("liaison-2026-08-16");
    expect(latestFieldShares(stale, FIELD)[CHOW]).toBeCloseTo(0.4851, 4);
    // With the fixture as published, fieldwork and publication agree.
    expect(latestPoll(feed)?.poll_id).toBe("pallas-2026-08-21");
  });
  it("breaks a fieldwork tie by publication date, then id", () => {
    const tied = structuredClone(feed);
    tied.polls[1] = { ...tied.polls[1], date_conducted: tied.polls[0].date_conducted, date_published: "2026-08-30" };
    expect(latestPoll(tied)?.poll_id).toBe(tied.polls[1].poll_id);
  });
  it("is null for an empty feed", () => {
    expect(latestPoll({ ...feed, polls: [], latest: null })).toBeNull();
  });
});

describe("residual shares and denominator", () => {
  it("keeps undecided apart from the other responses outside the field", () => {
    const decided = feed.polls[0];
    expect(residualShares(decided, FIELD)).toEqual({ undecided: null, other: decided.shares["response:other"] });
    const all: Poll = {
      ...decided,
      shares: { [CHOW]: 0.36, [BRADFORD]: 0.21, [ALEXANDER]: 0.04, "response:other": 0.05, "response:undecided": 0.3, "response:would_not_vote": 0.03 },
    };
    const residual = residualShares(all, FIELD);
    expect(residual.undecided).toBeCloseTo(0.3, 6);
    expect(residual.other).toBeCloseTo(0.08, 6);
  });
  it("phrases the denominator for mid-sentence use and is null when the feed has none", () => {
    expect(denominatorPhrase({ ...feed.polls[0], denominator: "All respondents" })).toBe("all respondents");
    expect(denominatorPhrase({ ...feed.polls[0], denominator: "Decided and leaning voters" })).toBe("decided and leaning voters");
    expect(denominatorPhrase(feed.polls[0])).toBeNull();
    expect(denominatorPhrase({ ...feed.polls[0], denominator: "  " })).toBeNull();
  });
});


describe("all-respondent chart basis", () => {
  it("preserves published shares, fits its own full-history LOESS and retains it in the recent view", () => {
    const readings: Poll[] = Array.from({ length: 8 }, (_, index) => ({
      ...feed.polls[0], poll_id: `sample-${index}`, poll_reading_id: `reading-${index}`,
      date_conducted: `2026-0${index < 4 ? 7 : 9}-${String(index + 1).padStart(2, "0")}`,
      denominator: "All respondents",
      shares: { [CHOW]: 0.3 + index * 0.01, [BRADFORD]: 0.2, [ALEXANDER]: 0.05,
        "response:undecided": 0.45 - index * 0.01 },
    }));
    const source = structuredClone(readings);
    const polling = { ...feed, polls: readings, all_respondents: readings };
    const trends = allRespondentTrends(polling, FIELD);
    expect(trends[0].markers.map((point) => point.y)).toEqual(readings.map((poll) => poll.shares[CHOW]));
    expect(trends[0].markers.every((point) => point.derived === false)).toBe(true);
    expect(trends[0].curve).not.toBeNull();
    expect(trends[0].curve).not.toEqual(candidateTrends(polling, FIELD)[0].curve);
    const recent = candidateTrendsForPolls(trends, pollsSinceNominationsClosed(polling, FIELD));
    expect(recent[0].markers).toHaveLength(4);
    expect(recent[0].curve).toBe(trends[0].curve);
    expect(readings).toEqual(source);
  });

  it("does not infer all-respondent shares from older releases or unreported candidates", () => {
    expect(allRespondentTrends(feed, FIELD).every((trend) => trend.markers.length === 0)).toBe(true);
    const reading = { ...feed.polls[0], shares: { [CHOW]: 0.33, "response:undecided": 0.67 } };
    expect(allRespondentTrends({ ...feed, all_respondents: [reading] }, FIELD)[1].markers).toEqual([]);
  });
});


describe("all-respondent response dots", () => {
  it("shows minor candidate observations while retaining their shares in the combined other total", () => {
    const readings: Poll[] = [
      { ...feed.polls[0], poll_id: "five-names", date_conducted: "2026-09-29",
        shares: { [CHOW]: 0.381, [BRADFORD]: 0.322, [ALEXANDER]: 0.072,
          per_mcvie: 0.02, per_parker: 0.018, "response:other": 0.027,
          "response:undecided": 0.16 } },
      { ...feed.polls[0], poll_id: "three-names", date_conducted: "2026-09-27",
        shares: { [CHOW]: 0.42, [BRADFORD]: 0.33, [ALEXANDER]: 0.08,
          "response:other": 0.03, "response:undecided": 0.14 } },
    ];
    const trends = allRespondentTrends({ ...feed, all_respondents: readings },
      [...FIELD, "per_mcvie", "per_parker"], FIELD);
    expect(trends.find((trend) => trend.id === "per_mcvie")!.markers.map((marker) => marker.y))
      .toEqual([0.02]);
    expect(trends.find((trend) => trend.id === "per_parker")!.markers.map((marker) => marker.y))
      .toEqual([0.018]);
    expect(trends.find((trend) => trend.id === ALL_RESPONDENT_OTHER_ID)!.markers.map((marker) => marker.y))
      .toEqual([0.03, 0.065]);
    expect(trends.find((trend) => trend.id === "per_mcvie")!.curve).toBeNull();
  });

  it("sums explicit candidates and uncertainty categories without adding non-voters or inferring gaps", () => {
    const reading: Poll = { ...feed.polls[0], denominator: "All respondents",
      shares: { [CHOW]: 0.381, [BRADFORD]: 0.314, [ALEXANDER]: 0.08,
        per_mcvie: 0.021, per_parker: 0.016, "response:other": 0.02,
        "response:undecided": 0.168, "response:dont_know": 0.01,
        "response:would_not_vote": 0.06, "response:refusal": 0.01 } };
    const absent = { ...reading, poll_id: "absent", shares: { [CHOW]: 0.38 } };
    const zero = { ...reading, poll_id: "zero", shares: {
      [CHOW]: 0.38, "response:other": 0, "response:dont_know": 0 } };
    const readings = [reading, absent, zero];
    const source = structuredClone(readings);
    const trends = allRespondentTrends({ ...feed, all_respondents: readings }, FIELD);
    const other = trends.find((trend) => trend.id === ALL_RESPONDENT_OTHER_ID)!;
    const undecided = trends.find((trend) => trend.id === ALL_RESPONDENT_UNDECIDED_ID)!;
    expect(other.markers.map((point) => point.poll_id)).toEqual([reading.poll_id, "zero"]);
    expect(other.markers[0].y).toBeCloseTo(0.057);
    expect(undecided.markers[0].y).toBeCloseTo(0.178);
    expect(other.markers[1].y).toBe(0);
    expect(undecided.markers[1].y).toBe(0);
    expect(readings).toEqual(source);
  });

  it("keeps response categories unsmoothed even with enough observations for LOESS", () => {
    const readings = Array.from({ length: 8 }, (_, index) => ({ ...feed.polls[0],
      poll_id: `sample-${index}`, date_conducted: `2026-09-${String(index + 1).padStart(2, "0")}`,
      shares: { [CHOW]: 0.4, "response:other": 0.1, "response:dont_know": 0.2 },
    }));
    const trends = allRespondentTrends({ ...feed, all_respondents: readings }, FIELD);
    expect(trends[0].curve).not.toBeNull();
    for (const id of [ALL_RESPONDENT_OTHER_ID, ALL_RESPONDENT_UNDECIDED_ID]) {
      const trend = trends.find((trend) => trend.id === id)!;
      expect(trend.markers).toHaveLength(8);
      expect(trend.curve).toBeNull();
    }
  });
});
