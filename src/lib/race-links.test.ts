import { describe, expect, it } from "vitest";
import councilFixture from "../../fixtures/council_race_cards.json";
import { raceHref, slugify, WARD_NAMES, wardSlug } from "./race-links";

describe("race links (results redesign)", () => {
  it("makes ward names into URL slugs", () => {
    expect(slugify("Toronto-St. Paul's")).toBe("toronto-st-pauls");
    expect(slugify("Scarborough-Rouge Park")).toBe("scarborough-rouge-park");
    expect(slugify("University-Rosedale ")).toBe("university-rosedale");
  });

  it("names the wards as the Council feed does, so pages and links share one slug", () => {
    const feed = councilFixture.wards as Record<string, { ward_name: string }>;
    for (let n = 1; n <= 25; n++) expect(wardSlug(String(n))).toBe(slugify(feed[String(n)].ward_name));
    expect(WARD_NAMES).toHaveLength(25);
  });

  it("links every race to its own page from its payload id alone", () => {
    expect(raceHref("mayor")).toBe("/results/");
    expect(raceHref("councillor-4")).toBe("/parkdale-high-park/");
    expect(raceHref("councillor-12")).toBe("/toronto-st-pauls/");
    expect(raceHref("tdsb-5")).toBe("/tdsb/5/");
    expect(raceHref("tcdsb-12")).toBe("/tcdsb/12/");
    expect(raceHref("viamonde-3")).toBe("/conseils-scolaires/#viamonde-3");
    expect(raceHref("monavenir-4")).toBe("/conseils-scolaires/#monavenir-4");
  });
});
