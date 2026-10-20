import { describe, expect, it } from "vitest";
import { mapSelectionFrom, mapSelectionHref } from "./live-map-url";

const WARDS = Array.from({ length: 25 }, (_, i) => String(i + 1));
const from = (query: string) => mapSelectionFrom(new URLSearchParams(query), WARDS);

describe("mapSelectionFrom", () => {
  it("opens the default map when the URL says nothing", () => {
    expect(from("view=map")).toEqual({ contest: "mayor", measure: "leader", candidate: null, ward: null });
  });

  it("reads the race, the measure, the candidate and the held ward", () => {
    expect(from("view=map&race=mayor&show=share&candidate=CHOW%2C+Olivia&ward=7")).toEqual({
      contest: "mayor",
      measure: "share",
      candidate: "CHOW, Olivia",
      ward: "7",
    });
    expect(from("race=tdsb&show=reporting&ward=25")).toEqual({ contest: "tdsb", measure: "reporting", candidate: null, ward: "25" });
  });

  it("falls back to the defaults for values that don't exist", () => {
    expect(from("race=senate&show=odds&ward=26")).toEqual({ contest: "mayor", measure: "leader", candidate: null, ward: null });
    expect(from("ward=07").ward).toBeNull();
  });

  it("shows council and trustee races by leader when the measure is mayor-only", () => {
    expect(from("race=council&show=vs2023").measure).toBe("leader");
    expect(from("race=tcdsb&show=share&candidate=X").measure).toBe("leader");
  });

  it("keeps a candidate only with the candidate-share measure", () => {
    expect(from("show=reporting&candidate=CHOW%2C+Olivia").candidate).toBeNull();
  });
});

describe("mapSelectionHref", () => {
  it("keeps the view and drops the defaults", () => {
    const params = new URLSearchParams("view=map");
    expect(mapSelectionHref("/results/", params, { contest: "mayor", measure: "leader", candidate: null, ward: null })).toBe(
      "/results/?view=map",
    );
  });

  it("writes a selection the reader can share, and reads back the same map", () => {
    const selection = { contest: "mayor", measure: "share", candidate: "CHOW, Olivia", ward: "12" } as const;
    const href = mapSelectionHref("/results/3/", new URLSearchParams("view=map&ward=3"), selection);
    expect(href).toBe("/results/3/?view=map&show=share&candidate=CHOW%2C+Olivia&ward=12");
    expect(mapSelectionFrom(new URLSearchParams(href.split("?")[1]), WARDS)).toEqual(selection);
  });

  it("drops a candidate the measure doesn't use", () => {
    const href = mapSelectionHref("/results/", new URLSearchParams("view=map"), {
      contest: "council",
      measure: "reporting",
      candidate: "CHOW, Olivia",
      ward: "1",
    });
    expect(href).toBe("/results/?view=map&race=council&show=reporting&ward=1");
  });
});
