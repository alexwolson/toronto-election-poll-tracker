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

describe("ownHistorySignals", () => {
  it("reads a prior win as a condition plus direction, without a count", () => {
    const [sig] = ownHistorySignals([
      hint({
        hint_id: "own_any_all_past_race_victory__non_incumbent_non_returning",
        direction: "positive",
        source: source({ victory_count: 2, qualifying_candidacy_count: 3 }),
      }),
    ]);
    expect(sig.direction).toBe("positive");
    expect(sig.text).toBe("Won a previous election, which helps.");
  });

  it("omits the generic all-history race-count hints", () => {
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
    expect(signals).toEqual([]);
  });

  it("does not surface the continuous recent-margin row", () => {
    const signals = ownHistorySignals([
      hint({
        hint_id: "own_most_recent_all_past_race_margin__non_incumbent_non_returning",
        direction: "negative",
        source: source({ result: "lost", margin: -0.26 }),
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

  it("renders the named-office and returning-councillor conditions with direction", () => {
    const signals = ownHistorySignals([
      hint({ hint_id: "own_returning_councillor__open_contest", direction: "positive" }),
      hint({ hint_id: "own_prior_win_type__trustee", direction: "positive" }),
      hint({
        hint_id: "own_prior_mpp_race__non_incumbent_non_returning",
        direction: "positive",
        source: source({ office_type: "mpp", year: 2022, result: "lost" }),
      }),
    ]);
    expect(signals.map((signal) => signal.text)).toEqual([
      "Previously served as a Toronto councillor, which helps.",
      "Previously elected as a school-board trustee, which helps.",
      "Previously ran for MPP, which helps.",
    ]);
  });

  it("Stella Kargiannakis (Ward 21): a prior MPP loss reads as the tested condition, which helps", () => {
    // Her MPP races were losses, but the approved hint's supplied direction is
    // positive: the card names the condition + direction, never presenting the
    // loss as positive evidence. The specific result stays in her chronological
    // history list, and the generic race-count hints are omitted.
    const signals = ownHistorySignals([
      hint({
        hint_id: "own_any_all_past_race__non_incumbent_non_returning",
        source: source({ qualifying_candidacy_count: 6 }),
      }),
      hint({
        hint_id: "own_multiple_all_past_races__non_incumbent_non_returning",
        source: source({ qualifying_candidacy_count: 6 }),
      }),
      hint({
        hint_id: "own_prior_mpp_race__non_incumbent_non_returning",
        direction: "positive",
        source: source({
          office_type: "mpp",
          year: 2022,
          result: "lost",
          rank: 3,
          field_size: 6,
          margin: -0.28,
        }),
      }),
    ]);
    expect(signals.map((signal) => signal.text)).toEqual([
      "Previously ran for MPP, which helps.",
    ]);
    expect(signals[0].text).not.toMatch(/behind|3rd|lost/);
  });

  it("states only the trustee condition when the sole win is the trustee race", () => {
    const signals = ownHistorySignals([
      hint({ hint_id: "own_prior_win_type__trustee", direction: "positive" }),
      hint({
        hint_id: "own_any_all_past_race_victory__non_incumbent_non_returning",
        direction: "positive",
        source: source({ victory_count: 1, qualifying_candidacy_count: 1 }),
      }),
    ]);
    expect(signals.map((signal) => signal.text)).toEqual([
      "Previously elected as a school-board trustee, which helps.",
    ]);
  });

  it("prefers 'won their most recent election' over the generic prior win", () => {
    // A candidate whose most recent race was a win (e.g. a sitting MP) fires both
    // the recency hint and the generic prior-win hint; surface only the more
    // specific recency wording, never both.
    const signals = ownHistorySignals([
      hint({
        hint_id:
          "own_most_recent_all_past_race_was_victory__non_incumbent_non_returning",
        direction: "positive",
        source: source({ office_type: "mp", year: 2025, result: "won" }),
      }),
      hint({
        hint_id: "own_any_all_past_race_victory__non_incumbent_non_returning",
        direction: "positive",
        source: source({ victory_count: 1, qualifying_candidacy_count: 2 }),
      }),
    ]);
    expect(signals.map((signal) => signal.text)).toEqual([
      "Won their most recent election, which helps.",
    ]);
  });

  it("suppresses the recency win when a named prior office already states a win", () => {
    // The trustee whose most recent win IS the trustee race: the named-office
    // line already conveys the win, so the recency line is not stacked on top.
    const signals = ownHistorySignals([
      hint({ hint_id: "own_prior_win_type__trustee", direction: "positive" }),
      hint({
        hint_id:
          "own_most_recent_all_past_race_was_victory__non_incumbent_non_returning",
        direction: "positive",
        source: source({ office_type: "trustee", year: 2022, result: "won" }),
      }),
      hint({
        hint_id: "own_any_all_past_race_victory__non_incumbent_non_returning",
        direction: "positive",
        source: source({ victory_count: 1, qualifying_candidacy_count: 1 }),
      }),
    ]);
    expect(signals.map((signal) => signal.text)).toEqual([
      "Previously elected as a school-board trustee, which helps.",
    ]);
  });

  it("keeps the MPP-run signal alongside a single win chip", () => {
    const signals = ownHistorySignals([
      hint({
        hint_id:
          "own_most_recent_all_past_race_was_victory__non_incumbent_non_returning",
        direction: "positive",
        source: source({ office_type: "mp", year: 2025, result: "won" }),
      }),
      hint({
        hint_id: "own_any_all_past_race_victory__non_incumbent_non_returning",
        direction: "positive",
        source: source({ victory_count: 1, qualifying_candidacy_count: 2 }),
      }),
      hint({
        hint_id: "own_prior_mpp_race__non_incumbent_non_returning",
        direction: "positive",
        source: source({ office_type: "mpp", year: 2022, result: "lost" }),
      }),
    ]);
    expect(signals.map((signal) => signal.text)).toEqual([
      "Won their most recent election, which helps.",
      "Previously ran for MPP, which helps.",
    ]);
  });

  it("carries a negative direction through the wording", () => {
    const [sig] = ownHistorySignals([
      hint({ hint_id: "own_prior_win_type__trustee", direction: "negative" }),
    ]);
    expect(sig.direction).toBe("negative");
    expect(sig.text).toBe("Previously elected as a school-board trustee, which hurts.");
  });

  it("ignores retired all-but-council hints and opponent hints", () => {
    const sigs = ownHistorySignals([
      hint({ hint_id: "own_prior_elected_victory_count", direction: "negative" }),
      hint({ hint_id: "own_any_prior_elected_office__open_contest" }),
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
  it("explains Ward 10 with concrete ward values and no index jargon", () => {
    const text = incumbentExposureFacts(council.wards["10"])
      .map((f) => f.text)
      .join(" ");
    expect(text).toContain("13,771 more voters");
    expect(text).toContain("3,343-vote winning margin");
    expect(text).toContain("— more than");
    expect(text).not.toContain("far more than");
    expect(text).toContain("37% of votes cast");
    expect(text).toContain("8% of eligible voters");
    expect(text).toContain("among the lowest");
    expect(text).not.toContain("combined index");
    expect(text).not.toContain("structurally exposed");
  });

  it("falls back to attribution when the component values are missing", () => {
    const card = {
      ...council.wards["10"],
      incumbent: {
        ...council.wards["10"].incumbent,
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
