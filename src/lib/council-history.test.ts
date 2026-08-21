import { describe, expect, it } from "vitest";
import type { PastElection } from "@/types/feeds";
import { historyHeadline, officeLabel, ordinal, partyLabel, resultLabel } from "./council-history";

function e(over: Partial<PastElection>): PastElection {
  return {
    year: 2020,
    election_date: "2020-10-01",
    office_type: "councillor",
    represented_body: "toronto_city_council",
    district_name: null,
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
  it("shortens common party names, drops non-partisan", () => {
    expect(partyLabel("Liberal Party of Canada")).toBe("Liberal");
    expect(partyLabel("Ontario Liberal Party")).toBe("Liberal");
    expect(partyLabel("Progressive Conservative Party of Ontario")).toBe("PC");
    expect(partyLabel("New Democratic Party")).toBe("NDP");
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
  it("states the placement for a loss", () => {
    expect(resultLabel(e({ result: "won" }))).toBe("won");
    expect(resultLabel(e({ result: "lost", rank: 2, field_size: 7 }))).toBe("lost · 2nd of 7");
    expect(resultLabel(e({ result: "lost", rank: null, field_size: null }))).toBe("lost");
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
    // isIncumbent = true: councillor is their current seat, so just the count
    expect(historyHeadline(incumbent, true)).toBe("2 past races");
    // a non-incumbent returning councillor still reads as Former Councillor
    expect(historyHeadline(incumbent, false)).toBe("Former Councillor · 2 past races");
  });

  it("keeps a higher former office for an incumbent who once held it", () => {
    const incumbentExMp = [
      e({ office_type: "councillor", result: "won" }),
      e({ office_type: "mp", result: "won" }),
    ];
    expect(historyHeadline(incumbentExMp, true)).toBe("Former MP · 2 past races");
  });
});
