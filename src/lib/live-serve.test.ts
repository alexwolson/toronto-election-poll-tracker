import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { LivePayload } from "@/types/live";
import { serveLive, SWITCHES, type SwitchName } from "./live-serve";

function fixture(name: string): string {
  return readFileSync(path.resolve(__dirname, "../../fixtures/live/payload", name), "utf8");
}

const RAW = fixture("no-units-in-2026.json");
const NO_SWITCHES = Object.fromEntries(SWITCHES.map((name) => [name, null])) as Record<SwitchName, string | null>;

describe("serveLive", () => {
  it("serves the stored payload with the newer heartbeat", () => {
    const served = serveLive({ payload: RAW, heartbeats: ["1793059320000", "1793059350000"], switches: NO_SWITCHES });
    expect(served.heartbeat).toBe(1793059350000);
    expect(served.payload).toEqual(JSON.parse(RAW));
  });

  it("serves with one heartbeat when the other pipeline has never written one", () => {
    expect(serveLive({ payload: RAW, heartbeats: [null, "1793059350000"], switches: NO_SWITCHES }).heartbeat).toBe(1793059350000);
    expect(serveLive({ payload: RAW, heartbeats: ["1793059320000", null], switches: NO_SWITCHES }).heartbeat).toBe(1793059320000);
  });

  it("throws on a missing payload", () => {
    expect(() => serveLive({ payload: null, heartbeats: ["1793059320000", null], switches: NO_SWITCHES })).toThrow(/payload/);
  });

  it("throws when neither heartbeat exists", () => {
    expect(() => serveLive({ payload: RAW, heartbeats: [null, null], switches: NO_SWITCHES })).toThrow(/heartbeat/);
  });

  it("throws on a heartbeat that is not epoch milliseconds", () => {
    for (const bad of ["", "abc", "1.5", "-1", "1e12"]) {
      expect(() => serveLive({ payload: RAW, heartbeats: [bad, "1793059350000"], switches: NO_SWITCHES }), bad).toThrow(/heartbeat/);
    }
  });

  it("throws on bytes that are not JSON", () => {
    expect(() => serveLive({ payload: "{not json", heartbeats: ["1793059320000", null], switches: NO_SWITCHES })).toThrow(/payload/);
  });

  it("throws on a payload that fails the validator, including its schema version", () => {
    const wrongVersion = JSON.stringify({ ...JSON.parse(RAW), schema_version: 1 });
    expect(() => serveLive({ payload: wrongVersion, heartbeats: ["1793059320000", null], switches: NO_SWITCHES })).toThrow(/payload/);
    expect(() => serveLive({ payload: "{}", heartbeats: ["1793059320000", null], switches: NO_SWITCHES })).toThrow(/payload/);
  });
});

describe("serveLive: the switches (#49)", () => {
  const HEARTBEATS = ["1793059320000", null];
  const LIVE = fixture("gated-live-2022.json");
  const PROJECTED = ["mayor", "council", "trustee"] as const;

  function serve(off: Partial<Record<SwitchName, string>>, raw = LIVE) {
    return serveLive({ payload: raw, heartbeats: HEARTBEATS, switches: { ...NO_SWITCHES, ...off } });
  }

  /** Race ids whose projection the served payload still carries, by level. */
  function projected(payload: LivePayload): Record<string, string[]> {
    const ids: Record<string, string[]> = {};
    for (const race of payload.races) {
      if (race.projection !== null) (ids[race.level] ??= []).push(race.id);
    }
    return ids;
  }

  const stored = JSON.parse(LIVE) as LivePayload;
  const before = projected(stored);

  it("serves the stored payload unchanged, not paused, with every switch on or unset", () => {
    expect(PROJECTED.every((level) => before[level]?.length)).toBe(true);
    for (const switches of [{}, Object.fromEntries(SWITCHES.map((name) => [name, "on"]))]) {
      const served = serve(switches);
      expect(served.payload).toEqual(stored);
      expect(served.paused).toBe(false);
    }
  });

  it("removes exactly its own level's projections, and says the level is switched off", () => {
    for (const level of PROJECTED) {
      const { payload, paused } = serve({ [level]: "off" });
      expect(projected(payload)).toEqual({ ...before, [level]: undefined });
      expect(payload.levels[level].projection).toBe("switched_off");
      for (const other of PROJECTED.filter((l) => l !== level)) {
        expect(payload.levels[other]).toEqual(stored.levels[other]);
      }
      // The count and the Possible Range are not projections.
      expect(payload.races.map((r) => [r.candidates, r.possible])).toEqual(
        stored.races.map((r) => [r.candidates, r.possible]),
      );
      expect(paused).toBe(false);
    }
  });

  it("switches the mayor's variant off with the mayor and drops its approval", () => {
    const { levels } = serve({ mayor: "off" }).payload;
    expect(levels.mayor).toEqual({ projection: "switched_off", variant: "switched_off", approved: false });
  });

  it("removes every projection with all projections off", () => {
    const { payload } = serve({ projections: "off" });
    expect(projected(payload)).toEqual({});
    for (const level of PROJECTED) expect(payload.levels[level].projection).toBe("switched_off");
    expect(payload.levels.french_trustee.projection).toBe("none");
  });

  it("drops the variant alone by showing the mayor's count-only band when count-only is live", () => {
    const both = JSON.parse(LIVE) as LivePayload;
    const mayor = both.races.find((r) => r.id === "mayor")!;
    const countOnly = Object.fromEntries(
      Object.entries(mayor.projection!.bands.forecast_weighted!).map(([k, b]) => [k, { ...b, mid: b.low }]),
    );
    mayor.projection!.bands.count_only = countOnly;

    const { payload } = serve({ mayor_variant: "off" }, JSON.stringify(both));
    const served = payload.races.find((r) => r.id === "mayor")!.projection!;
    expect(served.shown).toBe("count_only");
    expect(served.bands).toEqual({ count_only: countOnly });
    expect(payload.levels.mayor).toEqual({ projection: "live", variant: "switched_off", approved: false });
    expect(projected(payload)).toEqual(before);
  });

  it("leaves the mayor with no Estimated Range, and paused, when the variant goes and count-only isn't live", () => {
    const { payload } = serve({ mayor_variant: "off" });
    expect(projected(payload)).toEqual({ ...before, mayor: undefined });
    expect(payload.levels.mayor).toEqual({ projection: "switched_off", variant: "switched_off", approved: false });
    expect(payload.levels.council).toEqual(stored.levels.council);
  });

  it("keeps a gate's own status on a level the gate already keeps off", () => {
    const off = fixture("gated-off-2022.json");
    const { payload } = serve({ projections: "off" }, off);
    expect(payload.levels).toEqual((JSON.parse(off) as LivePayload).levels);
  });

  it("pauses the page", () => {
    const served = serve({ page: "off" });
    expect(served.paused).toBe(true);
    expect(served.payload).toEqual(stored);
  });

  it("fails closed: any value but on or unset turns a switch off", () => {
    for (const typo of ["of", "OFF", "", "0"]) {
      expect(serve({ page: typo }).paused, typo).toBe(true);
      expect(serve({ council: typo }).payload.levels.council.projection, typo).toBe("switched_off");
    }
  });

  it("still throws on a bad payload when paused, so ISR keeps the last good copy", () => {
    expect(() => serve({ page: "off" }, "{}")).toThrow(/payload/);
  });
});
