import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { LivePayload, LiveRace } from "@/types/live";
import { dashboardFrom, dashboardHref, racesOfType, sortRaces } from "./results-dashboard";

const WARDS = Array.from({ length: 25 }, (_, i) => String(i + 1));
const NIGHT = JSON.parse(
  readFileSync(path.resolve(__dirname, "../../fixtures/live/mock-night/payload.json"), "utf8"),
) as LivePayload;

describe("dashboardFrom", () => {
  it("opens on the mayor, the results view, sorted by number, with no ward", () => {
    expect(dashboardFrom(new URLSearchParams(""), WARDS)).toEqual({
      race: "mayor",
      view: "races",
      myWard: null,
      open: null,
      sort: "number",
    });
  });

  it("reads the race type, view, your ward, the open race and the sort", () => {
    expect(dashboardFrom(new URLSearchParams("race=council&view=map&myward=11&open=councillor-11&sort=close"), WARDS)).toEqual({
      race: "council",
      view: "map",
      myWard: "11",
      open: "councillor-11",
      sort: "close",
    });
  });

  it("falls back for values that don't exist", () => {
    expect(dashboardFrom(new URLSearchParams("race=senate&view=odds&myward=26&sort=random"), WARDS)).toEqual({
      race: "mayor",
      view: "races",
      myWard: null,
      open: null,
      sort: "number",
    });
  });
});

describe("dashboardHref", () => {
  it("changes one thing and keeps the rest, leaving defaults out", () => {
    const params = new URLSearchParams("race=council&myward=11&ward=4");
    expect(dashboardHref("/results/", params, { race: "tdsb" })).toBe("/results/?race=tdsb&myward=11&ward=4");
    expect(dashboardHref("/results/", params, { race: "mayor" })).toBe("/results/?myward=11&ward=4");
    expect(dashboardHref("/results/", params, { open: "councillor-3" })).toBe("/results/?race=council&myward=11&ward=4&open=councillor-3");
  });

  it("closes the open race when the race type changes", () => {
    expect(dashboardHref("/results/", new URLSearchParams("race=council&open=councillor-3"), { race: "tdsb" })).toBe("/results/?race=tdsb");
  });
});

describe("racesOfType", () => {
  it("sorts the payload's races into the dashboard's five types", () => {
    const count = (t: Parameters<typeof racesOfType>[1]) => racesOfType(NIGHT, t).length;
    expect(count("mayor")).toBe(1);
    expect(count("council")).toBe(25);
    expect(racesOfType(NIGHT, "tdsb").every((r) => r.id.startsWith("tdsb-"))).toBe(true);
    expect(racesOfType(NIGHT, "tcdsb").every((r) => r.id.startsWith("tcdsb-"))).toBe(true);
    expect(racesOfType(NIGHT, "french").every((r) => r.level === "french_trustee")).toBe(true);
  });
});

describe("sortRaces", () => {
  const race = (num: string, shares: [number, number], received: number): LiveRace => ({
    id: `councillor-${num}`,
    level: "council",
    num,
    name: null,
    state: "counting",
    progress: { received, total: 100 },
    candidates: shares.map((share, i) => ({
      key: `${num}-${i}`,
      full_name: `C${num}${i}`,
      short_label: null,
      candidacy_id: `can_${num}_${i}`,
      candidate_id: null,
      votes: share * 10,
      share,
    })),
    projection: null,
    possible: null,
    withdrawal: null,
    fault: null,
  });
  const races = [race("10", [60, 40], 90), race("2", [51, 49], 30), race("7", [70, 30], 10)];
  const nums = (rs: LiveRace[]) => rs.map((r) => r.num);

  it("orders by number, by the closest counted race, and by the least counted", () => {
    expect(nums(sortRaces(races, "number"))).toEqual(["2", "7", "10"]);
    expect(nums(sortRaces(races, "close"))).toEqual(["2", "10", "7"]);
    expect(nums(sortRaces(races, "counted"))).toEqual(["7", "2", "10"]);
  });

  it("puts races whose incumbent trails first, then the rest by number", () => {
    // Ward 10's incumbent is its second candidate, who trails; ward 7's leads.
    const incumbents = { "10": ["can_10_1"], "7": ["can_7_0"], "2": [] };
    expect(nums(sortRaces(races, "incumbent", incumbents))).toEqual(["10", "2", "7"]);
  });

  it("puts your ward's race first, whatever the order", () => {
    expect(nums(sortRaces(races, "close", undefined, "councillor-7"))).toEqual(["7", "2", "10"]);
  });
});
