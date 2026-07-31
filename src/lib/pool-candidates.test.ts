import { describe, it, expect } from "vitest";
import {
  getCandidateColor,
  getCandidateName,
  getLeadingCandidate,
  pollTestedCandidate,
} from "./pool-candidates";

describe("getLeadingCandidate", () => {
  it("returns null when no candidate has any share", () => {
    const candidates = {
      bradford: { share: 0, capture_rate: 0 },
      alexander: { share: 0, capture_rate: 0 },
    };
    expect(getLeadingCandidate(candidates)).toBeNull();
  });

  it("returns null for an empty candidates map", () => {
    expect(getLeadingCandidate({})).toBeNull();
  });

  it("returns the candidate with the highest capture_rate", () => {
    const candidates = {
      bradford: { share: 0.32, capture_rate: 0.67 },
      alexander: { share: 0.11, capture_rate: 0.23 },
    };
    const result = getLeadingCandidate(candidates);
    expect(result).not.toBeNull();
    expect(result![0]).toBe("bradford");
    expect(result![1].capture_rate).toBe(0.67);
  });

  it("flips automatically when a different candidate overtakes", () => {
    const candidates = {
      bradford: { share: 0.1, capture_rate: 0.2 },
      alexander: { share: 0.3, capture_rate: 0.6 },
    };
    const result = getLeadingCandidate(candidates);
    expect(result![0]).toBe("alexander");
  });

  it("ignores zero-share candidates even if capture_rate is present", () => {
    const candidates = {
      bradford: { share: 0.2, capture_rate: 0.4 },
      alexander: { share: 0, capture_rate: 0 },
    };
    const result = getLeadingCandidate(candidates);
    expect(result![0]).toBe("bradford");
  });
});

describe("getCandidateColor", () => {
  it("assigns a fixed color to a known candidate", () => {
    expect(getCandidateColor("bradford")).toBe(getCandidateColor("bradford"));
  });

  it("gives different candidates different colors", () => {
    expect(getCandidateColor("bradford")).not.toBe(getCandidateColor("alexander"));
  });

  it("falls back to a reserve color for an unlisted candidate rather than throwing", () => {
    expect(() => getCandidateColor("some-future-candidate")).not.toThrow();
  });

  it("does not repaint bradford's color onto an unlisted candidate", () => {
    expect(getCandidateColor("some-future-candidate")).not.toBe(getCandidateColor("bradford"));
  });
});

describe("getCandidateName", () => {
  it("returns a proper display name for a known slug", () => {
    expect(getCandidateName("bradford")).toBe("Bradford");
    expect(getCandidateName("alexander")).toBe("Alexander");
  });

  it("title-cases an unknown slug rather than showing it raw", () => {
    expect(getCandidateName("someone")).toBe("Someone");
  });
});

describe("pollTestedCandidate", () => {
  it("returns true when the candidate is an exact token in field_tested", () => {
    expect(pollTestedCandidate("alexander,bradford,chow,other", "alexander")).toBe(true);
  });

  it("returns false when the candidate is absent", () => {
    expect(pollTestedCandidate("bradford,chow,other", "alexander")).toBe(false);
  });

  it("does not match on substring — a longer candidate name must not false-positive", () => {
    expect(pollTestedCandidate("bradford,chow,other", "brad")).toBe(false);
  });

  it("handles surrounding whitespace in the field_tested string", () => {
    expect(pollTestedCandidate("bradford, chow, other", "chow")).toBe(true);
  });
});
