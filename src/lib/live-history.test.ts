import { describe, expect, it } from "vitest";
import { serveHistory, validateLiveHistory } from "./live-history";
import { switchesFrom, type SwitchName } from "./live-serve";

const NO_SWITCHES = switchesFrom([]);

/** A stored entry as the pipeline writes it (docs/store.md § history). */
function entry(a: number, w: number, races: Record<string, unknown>): string {
  return JSON.stringify({ seq: { all_office: a, ward_by_ward: w }, races });
}

const FIRST = entry(1000, 900, {
  mayor: {
    p: [10, 100],
    v: { Chow: 60, Bradford: 40 },
    b: { Chow: [50, 58, 66], Bradford: [34, 42, 50] },
    s: "forecast_weighted",
    w: { "1": [4, 50], "2": null },
  },
  "councillor-4": { p: [1, 40], v: { Ng: 12 }, b: { Ng: [40, 50, 60] }, s: "count_only" },
  "tdsb-5": { p: null, v: {} },
});
const SECOND = entry(2000, 2100, {
  mayor: {
    p: [30, 100],
    v: { Chow: 150, Bradford: 140, Ford: 10 },
    b: { Chow: [45, 50, 55] },
    s: "count_only",
    w: { "1": [10, 50], "2": [20, 50] },
  },
  "councillor-4": { p: [5, 40], v: { Ng: 30, Ali: 20 } },
  "tdsb-5": { p: [2, 20], v: { Roy: 5 }, b: { Roy: [20, 30, 40] }, s: "count_only" },
});

function serve(off: Partial<Record<SwitchName, string>> = {}, entries = [FIRST, SECOND]) {
  return serveHistory({ entries, switches: { ...NO_SWITCHES, ...off } });
}

describe("serveHistory", () => {
  it("serves one point per entry at the City count time, the older seq of the pair", () => {
    expect(serve().t).toEqual([900, 2000]);
  });

  it("lays each race out in columns, candidates in first-seen order, null where absent", () => {
    const mayor = serve().races.mayor;
    expect(mayor.keys).toEqual(["Chow", "Bradford", "Ford"]);
    expect(mayor.v).toEqual([
      [60, 40, null],
      [150, 140, 10],
    ]);
    expect(mayor.p).toEqual([
      [10, 100],
      [30, 100],
    ]);
  });

  it("keeps the bands per point and candidate, null where none was shown", () => {
    const { races } = serve();
    expect(races.mayor.b).toEqual([
      [[50, 58, 66], [34, 42, 50], null],
      [[45, 50, 55], null, null],
    ]);
    expect(races["councillor-4"].b).toEqual([[[40, 50, 60], null], [null, null]]);
    expect(races["tdsb-5"].p).toEqual([null, [2, 20]]);
  });

  it("leaves out the bands of a race that never showed one", () => {
    const quiet = entry(1000, 1000, { "councillor-9": { p: [1, 9], v: { A: 1 } } });
    expect(serve({}, [quiet]).races["councillor-9"]).not.toHaveProperty("b");
  });

  it("serves the mayor's ward progress per point", () => {
    expect(serve().races.mayor.w).toEqual({ "1": [[4, 50], [10, 50]], "2": [null, [20, 50]] });
  });

  it("drops a level's bands when its switch or every projection is off", () => {
    const council = serve({ council: "off" }).races;
    expect(council["councillor-4"]).not.toHaveProperty("b");
    expect(council["tdsb-5"].b).toBeDefined();
    expect(serve({ trustee: "off" }).races["tdsb-5"]).not.toHaveProperty("b");
    const none = serve({ projections: "off" }).races;
    for (const race of Object.values(none)) expect(race).not.toHaveProperty("b");
    expect(serve({ mayor: "off" }).races.mayor).not.toHaveProperty("b");
  });

  it("drops only the forecast-weighted mayor bands when the variant is switched off", () => {
    expect(serve({ mayor_variant: "off" }).races.mayor.b).toEqual([
      [null, null, null],
      [[45, 50, 55], null, null],
    ]);
  });

  it("skips an entry it can't read and serves the rest", () => {
    const served = serve({}, [FIRST, "{not json", JSON.stringify({ seq: {} }), SECOND]);
    expect(served.t).toEqual([900, 2000]);
  });

  it("serves an empty history before results", () => {
    expect(serve({}, [])).toEqual({ schema_version: 1, t: [], races: {} });
  });
});

describe("validateLiveHistory", () => {
  it("accepts what the route serves", () => {
    const served = serve();
    expect(validateLiveHistory(JSON.parse(JSON.stringify(served)))).toEqual(served);
  });

  it("rejects a column whose length differs from the points'", () => {
    const served = serve();
    served.races.mayor.v.pop();
    expect(validateLiveHistory(served)).toBeNull();
  });

  it("rejects the wrong schema version and non-objects", () => {
    expect(validateLiveHistory({ ...serve(), schema_version: 2 })).toBeNull();
    expect(validateLiveHistory(null)).toBeNull();
  });
});
