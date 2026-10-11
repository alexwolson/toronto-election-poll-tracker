import { describe, expect, it } from "vitest";
import type { LiveHistory } from "@/types/live";
import { countRows, leadRows, paceBuckets, shareRows } from "./live-count";

const MIN = 60_000;
const T0 = 1_793_059_200_000; // 20:00 EDT

const HISTORY: LiveHistory = {
  schema_version: 1,
  t: [T0 + 2 * MIN, T0 + 6 * MIN, T0 + 14 * MIN],
  races: {
    mayor: {
      keys: ["Chow", "Bradford", "Ford", "Lee"],
      p: [[10, 100], null, [60, 100]],
      v: [
        [60, 40, null, null],
        [150, 140, 10, 0],
        [400, 420, 100, 80],
      ],
      b: [
        [[50, 58, 66], null, null, null],
        [null, null, null, null],
        [[40, 45, 50], [41, 46, 51], null, null],
      ],
    },
  },
};

describe("countRows", () => {
  it("gives each point's time, share reported and votes counted", () => {
    expect(countRows(HISTORY, "mayor")).toEqual([
      { t: T0 + 2 * MIN, reported: 10, counted: 100 },
      { t: T0 + 6 * MIN, reported: null, counted: 300 },
      { t: T0 + 14 * MIN, reported: 60, counted: 1000 },
    ]);
  });

  it("is empty for a race the history doesn't hold", () => {
    expect(countRows(HISTORY, "councillor-1")).toEqual([]);
  });
});

describe("paceBuckets", () => {
  it("adds the votes each point brought to its 10-minute bucket on the clock", () => {
    expect(paceBuckets(HISTORY, "mayor", 10 * MIN)).toEqual([
      { start: T0, votes: 300 },
      { start: T0 + 10 * MIN, votes: 700 },
    ]);
  });

  it("never draws a count decrease as negative pace", () => {
    const down: LiveHistory = { ...HISTORY, races: { mayor: { ...HISTORY.races.mayor, v: [[50, 50, null, null], [40, 40, 0, 0], [40, 40, 0, 0]] } } };
    expect(paceBuckets(down, "mayor", 10 * MIN).map((b) => b.votes)).toEqual([100, 0]);
  });
});

describe("shareRows", () => {
  it("gives each drawn candidate's share and band, and folds the rest into others", () => {
    const rows = shareRows(HISTORY, "mayor", ["Chow", "Bradford"]);
    expect(rows[0]).toEqual({ t: T0 + 2 * MIN, reported: 10, Chow: 60, Bradford: 40, others: 0, "band:Chow": [50, 66] });
    expect(rows[2]).toMatchObject({ Chow: 40, Bradford: 42, others: 18, "band:Chow": [40, 50], "band:Bradford": [41, 51] });
    expect(rows[1]).not.toHaveProperty("band:Chow");
  });

  it("leaves out others when every candidate is drawn", () => {
    expect(shareRows(HISTORY, "mayor", ["Chow", "Bradford", "Ford", "Lee"])[2]).not.toHaveProperty("others");
  });

  it("skips points with no votes counted", () => {
    const empty: LiveHistory = { ...HISTORY, races: { mayor: { ...HISTORY.races.mayor, v: [[0, 0, null, null], ...HISTORY.races.mayor.v.slice(1)] } } };
    expect(shareRows(empty, "mayor", ["Chow"]).map((r) => r.t)).toEqual([T0 + 6 * MIN, T0 + 14 * MIN]);
  });
});

describe("leadRows", () => {
  it("gives one candidate's lead over another in points at each point", () => {
    const leads = leadRows(HISTORY, "mayor", "Chow", "Bradford").map((r) => r.lead);
    [20, 10 / 3, -2].forEach((want, i) => expect(leads[i]).toBeCloseTo(want, 9));
  });
});
