import { describe, expect, it } from "vitest";
import trusteeFixture from "../../fixtures/trustee_race_cards.json";
import { isResultsWard, RESULTS_WARDS, wardBallotRaceIds } from "@/lib/ward-ballot";
import type { TrusteeRaceCardsFeed } from "@/types/feeds";

const trustees = trusteeFixture as unknown as TrusteeRaceCardsFeed;

describe("the Ward Ballot (#17 § Results pages, #13)", () => {
  it("covers City wards 1 to 25 and nothing else", () => {
    expect(RESULTS_WARDS).toEqual(Array.from({ length: 25 }, (_, i) => String(i + 1)));
    expect(isResultsWard("1")).toBe(true);
    expect(isResultsWard("25")).toBe(true);
    for (const value of ["0", "26", "01", "14.0", "", "mayor"]) expect(isResultsWard(value)).toBe(false);
  });

  it("takes a ward's trustee races from the City ward alone, via the feed's city_wards", () => {
    expect(wardBallotRaceIds("14", trustees)).toEqual([
      "councillor-14",
      "tdsb-5",
      "tcdsb-11",
      "viamonde-3",
      "monavenir-4",
    ]);
    expect(wardBallotRaceIds("1", trustees)).toEqual([
      "councillor-1",
      "tdsb-1",
      "tcdsb-1",
      "viamonde-4",
      "monavenir-3",
    ]);
  });

  it("puts every City ward in exactly one area on each board", () => {
    for (const ward of RESULTS_WARDS) expect(wardBallotRaceIds(ward, trustees), ward).toHaveLength(5);
  });
});
