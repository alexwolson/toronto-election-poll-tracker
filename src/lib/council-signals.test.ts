import { describe, expect, it } from "vitest";
import councilFixture from "../../fixtures/council_race_cards.json";
import type {
  CouncilRaceCard,
  CouncilRaceCardsFeed,
  FiredHint,
  SignalSource,
} from "@/types/feeds";
import {
  incumbentExposureFacts,
  notableChallengers,
  ownHistorySignals,
} from "./council-signals";

const council = councilFixture as unknown as CouncilRaceCardsFeed;

function source(over: Partial<SignalSource> = {}): SignalSource {
  return {
    opponent_name: null,
    office_type: null,
    year: null,
    district_name: null,
    result: null,
    rank: null,
    field_size: null,
    margin: null,
    victory_count: null,
    qualifying_candidacy_count: null,
    coverage: "resolved",
    ...over,
  };
}

function hint(over: Partial<FiredHint>): FiredHint {
  return {
    hint_id: "own_prior_win_type__trustee",
    subject: "own_history",
    value: null,
    copy: "GENERIC CATALOG COPY",
    effect_pp: 0,
    ci_low_pp: 0,
    ci_high_pp: 0,
    effect_unit: "",
    evidence_tier: "",
    direction: "positive",
    source: null,
    ...over,
  };
}

const GENERIC = /qualifying elected-office|Returning councillor|received more council vote share/;

describe("ownHistorySignals", () => {
  it("explains a most-recent loss with placement and margin (Kaid)", () => {
    const [sig] = ownHistorySignals([
      hint({
        hint_id: "own_most_recent_prior_elected_margin",
        direction: "negative",
        source: source({
          office_type: "trustee",
          year: 2022,
          result: "lost",
          rank: 7,
          field_size: 8,
          margin: -0.26,
        }),
      }),
    ]);
    expect(sig.direction).toBe("negative");
    expect(sig.text).toContain("7th of 8");
    expect(sig.text).toContain("2022");
    expect(sig.text).toContain("school-board trustee");
    expect(sig.text).toContain("26 points behind");
    expect(sig.text).not.toMatch(GENERIC);
  });

  it("explains a measured-zero victory count plainly (Kaid)", () => {
    const [sig] = ownHistorySignals([
      hint({
        hint_id: "own_prior_elected_victory_count",
        direction: "negative",
        source: source({
          victory_count: 0,
          qualifying_candidacy_count: 2,
          coverage: "measured_zero",
        }),
      }),
    ]);
    expect(sig.direction).toBe("negative");
    expect(sig.text).toBe("No wins in 2 prior elected races.");
  });

  it("explains a most-recent win and a positive victory count", () => {
    const sigs = ownHistorySignals([
      hint({
        hint_id: "own_most_recent_prior_elected_margin",
        direction: "positive",
        source: source({ office_type: "mp", year: 2021, result: "won" }),
      }),
      hint({
        hint_id: "own_prior_elected_victory_count",
        direction: "positive",
        source: source({ victory_count: 3 }),
      }),
    ]);
    expect(sigs[0].direction).toBe("positive");
    expect(sigs[0].text).toContain("2021");
    expect(sigs[0].text).toContain("MP");
    expect(sigs[1].text).toBe("Won elected office 3 times before.");
  });

  it("names the trustee office and reads positive", () => {
    const [sig] = ownHistorySignals([
      hint({ hint_id: "own_prior_win_type__trustee", direction: "positive" }),
    ]);
    expect(sig.direction).toBe("positive");
    expect(sig.text).toContain("school-board trustee");
  });

  it("dedups the generic 'has held office' hint and drops opponent + no-op hints", () => {
    const sigs = ownHistorySignals([
      hint({ hint_id: "own_any_prior_elected_office__open_contest", direction: "positive" }),
      hint({
        hint_id: "opponent_strongest_prior_elected_margin",
        subject: "opponent_history",
        direction: "negative",
        source: source({ opponent_name: "Parthi Kandavel" }),
      }),
    ]);
    expect(sigs).toEqual([]);
  });

  it("is empty when a candidate has no own-history signals (Ahmad)", () => {
    expect(ownHistorySignals([])).toEqual([]);
  });
});

describe("notableChallengers (race-level)", () => {
  it("surfaces a non-incumbent former office-holder once, identified (Ward 23)", () => {
    const dong = notableChallengers(council.wards["23"]).find(
      (c) => c.name === "Han Dong",
    );
    expect(dong).toBeDefined();
    expect(dong!.office).toBe("MP");
    expect(dong!.year).toBeGreaterThan(2000);
  });

  it("excludes the incumbent (first-class) and all-losses challengers (Ward 20)", () => {
    const names = notableChallengers(council.wards["20"]).map((c) => c.name);
    // Kandavel is the incumbent; Kaid only ever lost
    expect(names).not.toContain("Parthi Kandavel");
    expect(names).not.toContain("Naser Kaid");
  });

  it("never lists the sitting incumbent even when they are a former office-holder", () => {
    for (const card of Object.values(council.wards)) {
      if (card.is_open_seat) continue;
      expect(notableChallengers(card).map((c) => c.name)).not.toContain(
        card.incumbent.name,
      );
    }
  });
});

describe("incumbentExposureFacts (ticket 05)", () => {
  it("explains Ward 11 with concrete ward values and no index jargon", () => {
    const text = incumbentExposureFacts(council.wards["11"])
      .map((f) => f.text)
      .join(" ");
    expect(text).toContain("8,869 more voters");
    expect(text).toContain("123-vote winning margin");
    expect(text).toContain("35% of votes cast");
    expect(text).toContain("11% of eligible voters");
    expect(text).toContain("among the lowest");
    expect(text).not.toContain("combined index");
    expect(text).not.toContain("structurally exposed");
  });

  it("falls back to attribution when the component values are missing", () => {
    const card = {
      ...council.wards["11"],
      incumbent: {
        ...council.wards["11"].incumbent,
        vote_share: null,
        electorate_share: null,
      },
    } as CouncilRaceCard;
    const cdi = incumbentExposureFacts(card).find((f) => f.key === "cdi");
    expect(cdi?.text).toContain("City Hall Watcher");
    expect(cdi?.text).toContain("Councillor Defeatability Index");
  });

  it("is empty for an open seat", () => {
    expect(incumbentExposureFacts(council.wards["4"])).toEqual([]);
  });
});
