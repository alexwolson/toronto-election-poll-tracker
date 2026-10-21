import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { LivePayload, LiveRace } from "@/types/live";
import { dashboardFrom, dashboardHref, racesOfType, sortRaces } from "./results-dashboard";

const NIGHT = JSON.parse(
  readFileSync(path.resolve(__dirname, "../../fixtures/live/mock-night/payload.json"), "utf8"),
) as LivePayload;

describe("dashboardFrom", () => {
  it("opens on the mayor, sorted by number, with nothing open and nowhere to jump", () => {
    expect(dashboardFrom(new URLSearchParams(""))).toEqual({
      race: "mayor",
      open: null,
      sort: "number",
      jump: null,
    });
  });

  it("reads the race type, the open race and the sort", () => {
    expect(dashboardFrom(new URLSearchParams("race=council&open=councillor-11&sort=close"))).toEqual({
      race: "council",
      open: "councillor-11",
      sort: "close",
      jump: null,
    });
  });

  it("sends an old view link to that part of its race type's page (Alex, one page per race type)", () => {
    expect(dashboardFrom(new URLSearchParams("view=map")).jump).toBe("results-map");
    expect(dashboardFrom(new URLSearchParams("race=council&view=map")).jump).toBe("results-map");
    expect(dashboardFrom(new URLSearchParams("view=count")).jump).toBe("results-count");
    expect(dashboardFrom(new URLSearchParams("view=tables")).jump).toBe("results-wards");
    expect(dashboardFrom(new URLSearchParams("view=races")).jump).toBeNull();
  });

  it("falls back for values that don't exist", () => {
    expect(dashboardFrom(new URLSearchParams("race=senate&view=odds&sort=random"))).toEqual({
      race: "mayor",
      open: null,
      sort: "number",
      jump: null,
    });
  });
});

describe("dashboardHref", () => {
  it("changes one thing and keeps the rest, leaving defaults out", () => {
    const params = new URLSearchParams("race=council&ward=4");
    expect(dashboardHref("/results/", params, { race: "tdsb" })).toBe("/results/?race=tdsb&ward=4");
    expect(dashboardHref("/results/", params, { race: "mayor" })).toBe("/results/?ward=4");
    expect(dashboardHref("/results/", params, { open: "councillor-3" })).toBe("/results/?race=council&ward=4&open=councillor-3");
  });

  it("drops an old view parameter from every link it makes", () => {
    expect(dashboardHref("/results/", new URLSearchParams("view=map&race=council"), { sort: "close" })).toBe("/results/?race=council&sort=close");
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
});
