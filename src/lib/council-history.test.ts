import { describe, expect, it } from "vitest";
import councilFixture from "../../fixtures/council_race_cards.json";
import type { CouncilRaceCardsFeed, PastElection } from "@/types/feeds";
import {
  historyHeadline,
  officeLabel,
  ordinal,
  partyLabel,
  resultLabel,
  sameWardReturnSummary,
} from "./council-history";

const council = councilFixture as unknown as CouncilRaceCardsFeed;

function e(over: Partial<PastElection>): PastElection {
  return {
    year: 2020,
    election_date: "2020-10-01",
    office_type: "councillor",
    represented_body: "toronto_city_council",
    district_name: null,
    district_display_name: null,
    party_name: null,
    result: "won",
    vote_share: null,
    rank: null,
    field_size: null,
    ...over,
  };
}

describe("officeLabel", () => {
  it("labels each office type", () => {
    expect(officeLabel(e({ office_type: "mp" }))).toBe("MP");
    expect(officeLabel(e({ office_type: "mpp" }))).toBe("MPP");
    expect(officeLabel(e({ office_type: "councillor" }))).toBe("Councillor");
    expect(officeLabel(e({ office_type: "mayor" }))).toBe("Mayor");
    expect(
      officeLabel(e({ office_type: "trustee", represented_body: "toronto_district_school_board" })),
    ).toBe("TDSB Trustee");
    expect(
      officeLabel(e({ office_type: "trustee", represented_body: "conseil_scolaire_viamonde" })),
    ).toBe("School Trustee");
  });
});

describe("partyLabel", () => {
  it("normalizes federal parties to their public labels", () => {
    expect(partyLabel("Conservative Party of Canada")).toBe("Conservative");
    expect(partyLabel("Liberal Party of Canada")).toBe("Liberal");
    expect(partyLabel("New Democratic Party")).toBe("NDP");
    expect(partyLabel("Green Party of Canada")).toBe("Green");
    expect(partyLabel("People's Party - PPC")).toBe("PPC");
  });

  it("normalizes Ontario parties to their public labels", () => {
    expect(partyLabel("Progressive Conservative Party of Ontario")).toBe("PC");
    expect(partyLabel("Ontario Liberal Party")).toBe("Liberal");
    expect(partyLabel("New Democratic Party of Ontario")).toBe("NDP");
    expect(partyLabel("Green Party of Ontario")).toBe("Green");
    expect(partyLabel("New Blue Party of Ontario")).toBe("New Blue");
    expect(partyLabel("Ontario Party")).toBe("Ontario Party");
  });

  it("uses exact matching — never collapses an unrelated party by substring", () => {
    expect(partyLabel("Christian Heritage Liberal Party")).toBe(
      "Christian Heritage Liberal Party",
    );
    expect(partyLabel("People's Voice")).toBe("People's Voice");
  });

  it("keeps an unknown party's canonical name and drops non-partisan races", () => {
    expect(partyLabel("Some Independent Party")).toBe("Some Independent Party");
    expect(partyLabel(null)).toBeNull();
    expect(partyLabel("")).toBeNull();
  });
});

describe("ordinal", () => {
  it("formats English ordinals", () => {
    expect(ordinal(1)).toBe("1st");
    expect(ordinal(2)).toBe("2nd");
    expect(ordinal(3)).toBe("3rd");
    expect(ordinal(4)).toBe("4th");
    expect(ordinal(11)).toBe("11th");
    expect(ordinal(21)).toBe("21st");
    expect(ordinal(22)).toBe("22nd");
  });
});

describe("resultLabel", () => {
  it("states placement and vote share when available", () => {
    expect(resultLabel(e({ result: "won", vote_share: 0.3717 }))).toBe("won · 37.2%");
    expect(
      resultLabel(e({ result: "lost", rank: 2, field_size: 7, vote_share: 0.0894 })),
    ).toBe("lost · 2nd of 7 · 8.9%");
    expect(resultLabel(e({ result: "lost", vote_share: 0.0004 }))).toBe("lost · <0.1%");
    expect(resultLabel(e({ result: "lost", rank: null, field_size: null }))).toBe("lost");
  });
});

describe("sameWardReturnSummary", () => {
  const ward5 = council.wards["5"];

  it("flags a returning runner-up with the exact vote margin", () => {
    const padovani = ward5.candidates.find((candidate) => candidate.display_name === "Chiara Padovani")!;
    expect(sameWardReturnSummary(padovani, ward5.ward, ward5.prior_result)).toEqual({
      topline: "Returning",
      detail: "2022 runner-up in this ward · lost by 94 votes",
    });
  });

  it("calls every second-place candidate in the latest ward election a runner-up", () => {
    const ward13 = council.wards["13"];
    const ward = ward13.candidates.find((candidate) => candidate.display_name === "Nicki Ward")!;
    expect(sameWardReturnSummary(ward, ward13.ward, ward13.prior_result)).toEqual({
      topline: "Returning",
      detail: "2022 runner-up in this ward · lost by 6,517 votes",
    });

    const ward20 = council.wards["20"];
    const rupasinghe = ward20.candidates.find(
      (candidate) => candidate.display_name === "Kevin Rupasinghe",
    )!;
    expect(sameWardReturnSummary(rupasinghe, ward20.ward, ward20.prior_result)).toEqual({
      topline: "Returning",
      detail: "2023 runner-up in this ward · lost by 787 votes",
    });
  });

  it("uses a by-election in place of 2022", () => {
    const ward15 = council.wards["15"];
    const sharp = ward15.candidates.find((candidate) => candidate.display_name === "Sheena Sharp")!;
    expect(sameWardReturnSummary(sharp, ward15.ward, ward15.prior_result)).toEqual({
      topline: "Returning",
      detail: "Ran in this ward in 2024 · 4th of 16",
    });
  });

  it("skips the prior winner and labels other same-ward candidates", () => {
    const nunziata = ward5.candidates.find((candidate) => candidate.display_name === "Frances Nunziata")!;
    expect(sameWardReturnSummary(nunziata, ward5.ward, ward5.prior_result, true)).toBeNull();

    const ward1 = council.wards["1"];
    const abbey = ward1.candidates.find((candidate) => candidate.display_name === "Abraham Abbey")!;
    expect(sameWardReturnSummary(abbey, ward1.ward, ward1.prior_result)).toEqual({
      topline: "Returning",
      detail: "Ran in this ward in 2022 · 10th of 16",
    });
  });

  it("does not flag a candidate against a different ward", () => {
    const padovani = ward5.candidates.find((candidate) => candidate.display_name === "Chiara Padovani")!;
    expect(sameWardReturnSummary(padovani, "6", ward5.prior_result)).toBeNull();
  });
});

describe("historyHeadline", () => {
  it("names the top office held and race count", () => {
    const dong = [
      e({ office_type: "mp", represented_body: "canada_house_of_commons", result: "won" }),
      e({ office_type: "mpp", result: "won" }),
      e({ office_type: "mpp", result: "lost" }),
      e({ office_type: "trustee", result: "lost" }),
    ];
    expect(historyHeadline(dong)).toBe("Former MP · 4 past races");
  });

  it("just counts the races for someone who has run repeatedly (no 'none won')", () => {
    const perennial = Array.from({ length: 6 }, () => e({ result: "lost" }));
    expect(historyHeadline(perennial)).toBe("6 past races");
  });

  it("handles a single prior win and empty history", () => {
    expect(historyHeadline([e({ office_type: "councillor", result: "won" })])).toBe(
      "Former Councillor",
    );
    expect(historyHeadline([])).toBeNull();
  });

  it("does not call the sitting incumbent a 'Former Councillor'", () => {
    const incumbent = [
      e({ office_type: "councillor", result: "won" }),
      e({ office_type: "councillor", result: "won" }),
    ];
    expect(historyHeadline(incumbent, "councillor")).toBe("2 past races");
    // a non-incumbent returning councillor still reads as Former Councillor
    expect(historyHeadline(incumbent)).toBe("Former Councillor · 2 past races");
  });

  it("keeps a higher former office for an incumbent who once held it", () => {
    const incumbentExMp = [
      e({ office_type: "councillor", result: "won" }),
      e({ office_type: "mp", result: "won" }),
    ];
    expect(historyHeadline(incumbentExMp, "councillor")).toBe("Former MP · 2 past races");
  });

  it("does not call the sitting mayor a 'Former Mayor'", () => {
    const incumbentMayor = [
      e({ office_type: "mayor", result: "won" }),
      e({ office_type: "mayor", result: "lost" }),
    ];
    expect(historyHeadline(incumbentMayor, "mayor")).toBe("2 past races");
  });
});
