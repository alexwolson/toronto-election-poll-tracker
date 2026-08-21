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
  ownHistorySignals,
  raceHistorySignals,
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

const GENERIC = /qualifying elected-office|received more council vote share/;

describe("ownHistorySignals", () => {
  it("explains the binary all-past-races victory hint from complete history", () => {
    const [sig] = ownHistorySignals([
      hint({
        hint_id: "own_any_all_past_race_victory__non_incumbent_non_returning",
        direction: "positive",
        source: source({
          office_type: "trustee",
          year: 2022,
          result: "won",
          victory_count: 2,
          qualifying_candidacy_count: 3,
        }),
      }),
    ]);
    expect(sig.direction).toBe("positive");
    expect(sig.text).toBe("Won 2 of 3 previous races.");
    expect(sig.text).not.toMatch(GENERIC);
  });

  it("combines the any-history and multiple-races flags into one count", () => {
    const signals = ownHistorySignals([
      hint({
        hint_id: "own_any_all_past_race__non_incumbent_non_returning",
        source: source({ qualifying_candidacy_count: 3 }),
      }),
      hint({
        hint_id: "own_multiple_all_past_races__non_incumbent_non_returning",
        source: source({ qualifying_candidacy_count: 3 }),
      }),
    ]);
    expect(signals).toHaveLength(1);
    expect(signals[0].text).toBe("Has run in 3 previous races.");
  });

  it("does not invent a positive/negative cutoff for a continuous recent margin", () => {
    const signals = ownHistorySignals([
      hint({
        hint_id: "own_most_recent_all_past_race_margin__non_incumbent_non_returning",
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
    expect(signals).toEqual([]);
  });

  it("does not render the paired prior-council-loss comparison on candidate cards", () => {
    const signals = ownHistorySignals([
      hint({
        hint_id:
          "own_prior_council_run_without_victory_vs_no_history__non_incumbent_non_returning",
        direction: "positive",
      }),
      hint({
        hint_id:
          "own_prior_council_run_without_victory_vs_other_history__non_incumbent_non_returning",
        direction: "negative",
      }),
    ]);
    expect(signals).toEqual([]);
  });

  it("collapses Neemuchwala's sole MPP race into one non-contradictory fact", () => {
    const signals = ownHistorySignals([
      hint({
        hint_id: "own_any_all_past_race__non_incumbent_non_returning",
        source: source({ qualifying_candidacy_count: 1 }),
      }),
      hint({
        hint_id: "own_prior_mpp_race__non_incumbent_non_returning",
        source: source({
          office_type: "mpp",
          year: 2022,
          result: "lost",
          rank: 3,
          field_size: 6,
          margin: -0.28,
          qualifying_candidacy_count: 1,
        }),
      }),
      hint({
        hint_id: "own_most_recent_all_past_race_margin__non_incumbent_non_returning",
        direction: "negative",
        source: source({
          office_type: "mpp",
          year: 2022,
          result: "lost",
          rank: 3,
          field_size: 6,
          margin: -0.28,
          qualifying_candidacy_count: 1,
        }),
      }),
    ]);
    expect(signals).toEqual([
      expect.objectContaining({
        direction: "positive",
        text: "Previously 3rd of 6 in the 2022 MPP race, about 28 points behind.",
      }),
    ]);
  });

  it("treats Rupasinghe's close runner-up result as history, not a negative verdict", () => {
    const signals = ownHistorySignals([
      hint({
        hint_id: "own_multiple_all_past_races__non_incumbent_non_returning",
        source: source({ qualifying_candidacy_count: 2 }),
      }),
      hint({
        hint_id: "own_most_recent_all_past_race_margin__non_incumbent_non_returning",
        direction: "negative",
        source: source({
          office_type: "councillor",
          year: 2023,
          result: "lost",
          rank: 2,
          field_size: 23,
          margin: -0.05,
        }),
      }),
    ]);
    expect(signals).toEqual([
      expect.objectContaining({
        direction: "positive",
        text: "Has run in 2 previous races.",
      }),
    ]);
  });

  it("renders the named-office and Returning-councillor flags plainly", () => {
    const signals = ownHistorySignals([
      hint({ hint_id: "own_returning_councillor__open_contest" }),
      hint({ hint_id: "own_prior_win_type__trustee" }),
      hint({
        hint_id: "own_prior_mpp_race__non_incumbent_non_returning",
        source: source({ office_type: "mpp", year: 2022, result: "lost" }),
      }),
    ]);
    expect(signals.map((signal) => signal.text)).toEqual([
      "Previously served as a Toronto councillor.",
      "Previously elected as a school-board trustee.",
      "Previously ran in the 2022 MPP race.",
    ]);
  });

  it("ignores every retired all-but-council hint", () => {
    const sigs = ownHistorySignals([
      hint({
        hint_id: "own_prior_elected_victory_count",
        direction: "negative",
      }),
      hint({ hint_id: "own_most_recent_prior_elected_margin" }),
      hint({ hint_id: "own_any_prior_elected_office__open_contest" }),
    ]);
    expect(sigs).toEqual([]);
  });

  it("names the trustee office and reads positive", () => {
    const [sig] = ownHistorySignals([
      hint({ hint_id: "own_prior_win_type__trustee", direction: "positive" }),
    ]);
    expect(sig.direction).toBe("positive");
    expect(sig.text).toContain("school-board trustee");
  });

  it("drops opponent and unknown hints from candidate cards", () => {
    const sigs = ownHistorySignals([
      hint({
        hint_id: "opponent_strongest_prior_elected_margin",
        subject: "opponent_history",
        direction: "negative",
        source: source({ opponent_name: "Parthi Kandavel" }),
      }),
    ]);
    expect(sigs).toEqual([]);
  });

  it("is empty when a candidate has no own-history signals", () => {
    expect(ownHistorySignals([])).toEqual([]);
  });
});

describe("raceHistorySignals", () => {
  it("deduplicates a Returning councillor opponent across an open field", () => {
    const opponentHint = hint({
      hint_id: "opponent_returning_councillor__open_contest",
      subject: "opponent_history",
      direction: "negative",
      source: source({ opponent_name: "Former Councillor" }),
    });
    const base = council.wards["4"];
    const card = {
      ...base,
      candidates: base.candidates.slice(0, 2).map((candidate) => ({
        ...candidate,
        historical_hints: [opponentHint],
      })),
    } as CouncilRaceCard;
    const signals = raceHistorySignals(card);
    expect(signals).toHaveLength(1);
    expect(signals[0].text).toContain("Former Councillor");
    expect(signals[0].text).toContain("rest of this open field");
  });

  it("does not turn an opponent's continuous margin into an incumbent verdict", () => {
    const base = council.wards["11"];
    const incumbentHint = hint({
      hint_id: "opponent_strongest_most_recent_all_past_race_margin__incumbent",
      subject: "opponent_history",
      direction: "negative",
      source: source({
        opponent_name: "Strong Challenger",
        office_type: "mpp",
        year: 2022,
        result: "won",
        margin: 0.08,
      }),
    });
    const card = {
      ...base,
      candidates: base.candidates.map((candidate) => ({
        ...candidate,
        historical_hints:
          candidate.display_name === base.incumbent.name ? [incumbentHint] : [],
      })),
    } as CouncilRaceCard;
    expect(raceHistorySignals(card)).toEqual([]);
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
