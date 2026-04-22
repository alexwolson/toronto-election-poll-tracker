import { describe, it, expect } from "vitest";
import { generateWardNarrative } from "./ward-narrative";
import type { Ward, Challenger } from "@/types/ward";

function makeWard(overrides: Partial<Ward> = {}): Ward {
  return {
    ward: 99, // outside PRONOUNS map → defaults to they/them/their
    councillor_name: "Test Councillor",
    is_running: true,
    is_byelection_incumbent: false,
    defeatability_score: 40,
    win_probability: 0.6,
    race_class: "competitive",
    factors: { vuln: 0, coat: 0, chal: 0 },
    coattail_detail: { alignment: 0.5, alignment_delta: 0, ward_lean: 0 },
    vote_share: 0.55,       // flat — unremarkable
    electorate_share: 0.14, // flat — unremarkable
    pop_growth_pct: 0.01,   // flat — unremarkable
    ...overrides,
  };
}

function makeChallenger(overrides: Partial<Challenger> = {}): Challenger {
  return {
    ward: 1,
    candidate_name: "Generic Challenger",
    name_recognition_tier: "unknown",
    fundraising_tier: null,
    mayoral_alignment: "aligned",
    is_endorsed_by_departing: false,
    ...overrides,
  };
}

describe("generateWardNarrative", () => {
  it("returns null when councillor is not running", () => {
    const ward = makeWard({ is_running: false });
    expect(generateWardNarrative(ward, [])).toBeNull();
  });

  it("returns null when fewer than 2 signals are notable", () => {
    // All flat signals, no challengers registered (Generic Challenger only)
    const ward = makeWard();
    const challengers = [makeChallenger()]; // Generic Challenger — not notable
    expect(generateWardNarrative(ward, challengers)).toBeNull();
  });

  it("joins two risk-raising signals with 'On top of that,'", () => {
    // Low vote share (raises) + low electorate share (raises)
    const ward = makeWard({ vote_share: 0.38, electorate_share: 0.08 });
    const result = generateWardNarrative(ward, []);
    expect(result).not.toBeNull();
    expect(result).toContain("On top of that,");
  });

  it("joins two risk-reducing signals with 'Adding to this,'", () => {
    // Strong vote share (reduces) + broad electorate share (reduces)
    const ward = makeWard({ vote_share: 0.68, electorate_share: 0.22 });
    const result = generateWardNarrative(ward, []);
    expect(result).not.toBeNull();
    expect(result).toContain("Adding to this,");
  });

  it("joins risk-reducing then risk-raising with 'However,'", () => {
    // Strong vote share (reduces) + low electorate share (raises)
    const ward = makeWard({ vote_share: 0.68, electorate_share: 0.08 });
    const challengers = [makeChallenger()]; // Generic — not notable
    const result = generateWardNarrative(ward, challengers);
    expect(result).not.toBeNull();
    expect(result).toContain("However,");
  });

  it("joins risk-raising then risk-reducing with 'That said,'", () => {
    // Low vote share (raises) + broad electorate share (reduces)
    const ward = makeWard({ vote_share: 0.38, electorate_share: 0.22 });
    const challengers = [makeChallenger()]; // Generic — not notable
    const result = generateWardNarrative(ward, challengers);
    expect(result).not.toBeNull();
    expect(result).toContain("That said,");
  });

  it("caps output at 3 signals", () => {
    // Low vote share + notable coattail + low electorate + pop growth (4 notables, cap at 3)
    const ward = makeWard({
      vote_share: 0.38,
      electorate_share: 0.08,
      pop_growth_pct: 0.05,
      coattail_detail: { alignment: 0.82, alignment_delta: 0.1, ward_lean: 0.06 },
    });
    const result = generateWardNarrative(ward, []);
    expect(result).not.toBeNull();
    // pop growth is 4th in priority order — should be excluded
    expect(result).not.toContain("grown rapidly");
  });

  describe("signal sentences", () => {
    it("names the councillor in the low vote share sentence", () => {
      const ward = makeWard({ vote_share: 0.38, electorate_share: 0.08 });
      const result = generateWardNarrative(ward, []);
      expect(result).toContain("Test Councillor");
      expect(result).toContain("thin margin");
    });

    it("uses the strong vote share sentence when vote_share > 0.62", () => {
      const ward = makeWard({ vote_share: 0.70, electorate_share: 0.22 });
      const result = generateWardNarrative(ward, []);
      expect(result).toContain("wide cushion");
    });

    it.skip("names a well-known challenger in the challenger sentence (re-enable after May 1)", () => {
      const ward = makeWard({ vote_share: 0.38 });
      const challengers = [
        makeChallenger({ candidate_name: "Jane Smith", name_recognition_tier: "well-known" }),
      ];
      const result = generateWardNarrative(ward, challengers);
      expect(result).toContain("Jane Smith");
    });

    it.skip("uses plural verb when multiple well-known challengers are registered (re-enable after May 1)", () => {
      const ward = makeWard({ vote_share: 0.38 });
      const challengers = [
        makeChallenger({ candidate_name: "Jane Smith", name_recognition_tier: "well-known" }),
        makeChallenger({ candidate_name: "Bob Jones", name_recognition_tier: "well-known" }),
      ];
      const result = generateWardNarrative(ward, challengers);
      expect(result).toContain("Jane Smith and Bob Jones");
      expect(result).toContain("have entered");
    });

    it.skip("uses zero-challengers sentence when no named challengers registered (re-enable after May 1)", () => {
      // Only a Generic Challenger in the list
      const ward = makeWard({ vote_share: 0.38 });
      const challengers = [makeChallenger()]; // Generic Challenger
      const result = generateWardNarrative(ward, challengers);
      expect(result).toContain("No challengers have registered yet");
    });

    it("high alignment + positive lean → reinforcing sentence", () => {
      const ward = makeWard({
        vote_share: 0.38,
        coattail_detail: { alignment: 0.82, alignment_delta: 0.1, ward_lean: 0.06 },
      });
      const result = generateWardNarrative(ward, []);
      expect(result).toContain("vote closely with Mayor Chow");
      expect(result).toContain("leaned toward Chow");
    });

    it("high alignment + negative lean → misalignment sentence", () => {
      const ward = makeWard({
        vote_share: 0.38,
        coattail_detail: { alignment: 0.82, alignment_delta: 0.1, ward_lean: -0.06 },
      });
      const result = generateWardNarrative(ward, []);
      expect(result).toContain("vote closely with Mayor Chow");
      expect(result).toContain("cool toward Chow");
    });

    it("low alignment + positive lean → distance sentence", () => {
      const ward = makeWard({
        vote_share: 0.38,
        coattail_detail: { alignment: 0.3, alignment_delta: -0.1, ward_lean: 0.06 },
      });
      const result = generateWardNarrative(ward, []);
      expect(result).toContain("kept distance from Mayor Chow");
      expect(result).toContain("leaned toward Chow");
    });

    it("low alignment + negative lean → aligned-against sentence", () => {
      const ward = makeWard({
        vote_share: 0.38,
        coattail_detail: { alignment: 0.3, alignment_delta: -0.1, ward_lean: -0.06 },
      });
      const result = generateWardNarrative(ward, []);
      expect(result).toContain("kept distance from Mayor Chow");
      expect(result).toContain("cool reception");
    });

    it("thin electorate share sentence appears", () => {
      const ward = makeWard({ vote_share: 0.38, electorate_share: 0.08 });
      const result = generateWardNarrative(ward, []);
      expect(result).toContain("voter-drive");
    });

    it("broad electorate share sentence appears", () => {
      const ward = makeWard({ vote_share: 0.38, electorate_share: 0.22 });
      const result = generateWardNarrative(ward, []);
      expect(result).toContain("penetrates broadly");
    });

    it("high pop growth sentence appears when it reaches a signal slot", () => {
      // Zero challengers(1) + low vote share(2) + pop growth(3) — coattail and electorate are flat
      const ward = makeWard({ vote_share: 0.38, pop_growth_pct: 0.05 });
      const result = generateWardNarrative(ward, []);
      expect(result).toContain("grown rapidly");
    });

    it("stable pop growth sentence appears", () => {
      const ward = makeWard({ vote_share: 0.38, pop_growth_pct: -0.02 });
      const result = generateWardNarrative(ward, []);
      expect(result).toContain("stable or shrinking");
    });
  });

  it("returns null when coattail_detail is absent and fewer than 2 other signals are notable", () => {
    const ward = makeWard({ coattail_detail: undefined, vote_share: 0.55 });
    const challengers = [makeChallenger()]; // Generic only
    expect(generateWardNarrative(ward, challengers)).toBeNull();
  });
});
