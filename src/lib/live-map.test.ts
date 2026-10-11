import { describe, expect, it } from "vitest";
import type { LiveCandidate, LiveRace } from "@/types/live";
import { incumbentStatus, leadTier, mayorWardLead, raceLead, reportedFraction, reportingTier } from "./live-map";

function candidate(key: string, votes: number | null, candidacy_id: string | null = null): LiveCandidate {
  return { key, full_name: key, short_label: null, candidacy_id, candidate_id: null, votes, share: null };
}

function race(candidates: LiveCandidate[], received = 5, total = 10): LiveRace {
  return {
    id: "councillor-4",
    level: "council",
    num: "4",
    name: null,
    state: "counting",
    progress: { received, total },
    candidates,
    projection: null,
    possible: null,
    withdrawal: null,
    fault: null,
  };
}

describe("reportedFraction", () => {
  it("is received over total, capped at whole, null without a total", () => {
    expect(reportedFraction({ received: 5, total: 20 })).toBe(0.25);
    expect(reportedFraction({ received: 21, total: 20 })).toBe(1);
    expect(reportedFraction({ received: 0, total: 0 })).toBeNull();
    expect(reportedFraction(null)).toBeNull();
  });

  it("buckets into tiers a legend can name", () => {
    expect([null, 0, 0.2, 0.5, 0.95, 1].map(reportingTier)).toEqual(["none", "none", "some", "half", "most", "all"]);
  });
});

describe("raceLead", () => {
  it("names the leader, the runner-up and the lead in points", () => {
    const lead = raceLead(race([candidate("Ng", 300), candidate("Ali", 200), candidate("Roy", 0)]));
    expect(lead).toMatchObject({ leader: "Ng", runnerUp: "Ali", leaderShare: 60, margin: 20, tied: false });
  });

  it("says so when the top two are tied, and names no leader before a vote is counted", () => {
    expect(raceLead(race([candidate("Ng", 10), candidate("Ali", 10)])).tied).toBe(true);
    const none = raceLead(race([candidate("Ng", 0), candidate("Ali", 0)], 0));
    expect(none.leader).toBeNull();
    expect(raceLead(race([candidate("Ng", null)], 0)).leader).toBeNull();
  });
});

describe("mayorWardLead", () => {
  it("reads a ward's votes and progress", () => {
    const lead = mayorWardLead({
      num: "3",
      name: null,
      progress: { received: 10, total: 40 },
      votes_counted: 1000,
      votes: { Chow: 450, Bradford: 400, Ford: 150 },
    });
    expect(lead).toMatchObject({ leader: "Chow", runnerUp: "Bradford", leaderShare: 45, margin: 5, reported: 0.25 });
  });

  it("names no leader for a ward with no votes", () => {
    expect(mayorWardLead({ num: "3", name: null, progress: null, votes_counted: null, votes: null }).leader).toBeNull();
  });
});

describe("leadTier", () => {
  it("groups a lead into narrow, clear and wide", () => {
    expect([0, 4.9, 5, 14.9, 15, 40].map(leadTier)).toEqual(["narrow", "narrow", "clear", "clear", "wide", "wide"]);
  });
});

describe("incumbentStatus", () => {
  const counted = race([candidate("Ng", 300, "can_ng"), candidate("Ali", 200, "can_ali")]);

  it("says whether a running incumbent leads", () => {
    expect(incumbentStatus(counted, ["can_ng"])).toBe("incumbent_leading");
    expect(incumbentStatus(counted, ["can_ali"])).toBe("incumbent_trailing");
  });

  it("counts any of two incumbents leading as leading", () => {
    expect(incumbentStatus(counted, ["can_ali", "can_ng"])).toBe("incumbent_leading");
  });

  it("marks an open seat, a tie, an unknown incumbent and a race with no votes yet", () => {
    expect(incumbentStatus(counted, [])).toBe("open_seat");
    expect(incumbentStatus(race([candidate("Ng", 9, "can_ng"), candidate("Ali", 9)]), ["can_ng"])).toBe("tied");
    expect(incumbentStatus(counted, null)).toBe("not_known");
    expect(incumbentStatus(race([candidate("Ng", 0, "can_ng")], 0), ["can_ng"])).toBe("no_results");
  });
});
