import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LIVE_SCHEMA_VERSION, validateLivePayload } from "./live-payload";

// Seam 6, the payload contract (#17): the golden payloads emitted by
// toronto-election-live-projection, copied byte for byte.
const GOLDEN_DIR = path.resolve(__dirname, "../../fixtures/live/payload");
const goldens = Object.fromEntries(
  readdirSync(GOLDEN_DIR)
    .filter((name) => name.endsWith(".json"))
    .map((name) => [name, JSON.parse(readFileSync(path.join(GOLDEN_DIR, name), "utf8"))]),
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function golden(name: string): any {
  return structuredClone(goldens[name]);
}

describe("validateLivePayload", () => {
  it("accepts every golden payload", () => {
    expect(Object.keys(goldens).sort()).toEqual([
      "all-units-in-2018.json",
      "before-results-2026.json",
      "council-counting-2022.json",
      "gated-live-2022.json",
      "gated-off-2022.json",
      "mayor-counting-2023.json",
      "no-figures-2026.json",
      "no-units-in-2026.json",
      "replay-counting-2022.json",
    ]);
    for (const [name, payload] of Object.entries(goldens)) {
      expect(validateLivePayload(payload), name).not.toBeNull();
    }
  });

  it("pins schema version 3", () => {
    expect(LIVE_SCHEMA_VERSION).toBe(3);
    for (const version of [2, 4, "3", null]) {
      expect(validateLivePayload({ ...golden("no-units-in-2026.json"), schema_version: version })).toBeNull();
    }
    const unversioned = golden("no-units-in-2026.json");
    delete unversioned.schema_version;
    expect(validateLivePayload(unversioned)).toBeNull();
  });

  it("accepts the odd values the pipeline passes through from the City", () => {
    // feed.py writes a ward name the City omits as null; names and Ballot Names
    // are any string the City writes; num is any digit string the bundle parses.
    const payload = golden("council-counting-2022.json");
    payload.races[0].wards[0].name = null;
    payload.races[1].name = "";
    payload.races[1].candidates[0].full_name = "";
    payload.races[2].id = "councillor-02";
    payload.races[2].num = "02";
    expect(validateLivePayload(payload)).not.toBeNull();
  });

  it("rejects values that are not a payload", () => {
    for (const value of [null, "{}", [], {}, 1]) expect(validateLivePayload(value)).toBeNull();
  });

  it("rejects a race whose state disagrees with the payload's", () => {
    const before = golden("before-results-2026.json");
    before.races[3].state = "no_units_in";
    expect(validateLivePayload(before)).toBeNull();

    const results = golden("no-units-in-2026.json");
    results.races[3].state = "before_results";
    expect(validateLivePayload(results)).toBeNull();
  });

  it("rejects a fault on a race with figures, and no_figures without one", () => {
    const withFault = golden("no-units-in-2026.json");
    withFault.races[1].fault = { reason: "row_unreadable" };
    expect(validateLivePayload(withFault)).toBeNull();

    const noFigures = golden("no-figures-2026.json");
    const race = noFigures.races.find((r: { state: string }) => r.state === "no_figures");
    race.fault = null;
    expect(validateLivePayload(noFigures)).toBeNull();
  });

  it("checks the mayor's variant marker, which says which band is in effect", () => {
    const mayorIndex = (p: { races: { id: string }[] }) => p.races.findIndex((r) => r.id === "mayor");
    const withVariant = (variant: unknown) => {
      const payload = golden("replay-counting-2022.json");
      payload.races[mayorIndex(payload)].projection.variant = variant;
      return payload;
    };
    expect(golden("replay-counting-2022.json").races[mayorIndex(golden("replay-counting-2022.json"))].projection.variant).toEqual({
      in_effect: "count_only",
      ess: null,
      off_reason: "forecast_missing",
    });
    expect(validateLivePayload(withVariant({ in_effect: "forecast_weighted", ess: 9816.6, off_reason: null }))).not.toBeNull();
    expect(validateLivePayload(withVariant({ in_effect: "count_only", ess: 412.5, off_reason: "low_ess" }))).not.toBeNull();

    for (const bad of [
      { in_effect: "tally", ess: null, off_reason: "forecast_missing" },
      { in_effect: "count_only", ess: null, off_reason: "because" },
      { in_effect: "forecast_weighted", ess: 9816.6, off_reason: "low_ess" },
      { in_effect: "count_only", ess: null, off_reason: null },
      { in_effect: "forecast_weighted", ess: -1, off_reason: null },
      { in_effect: "forecast_weighted", ess: "9816.6", off_reason: null },
      "forecast_weighted",
    ]) {
      expect(validateLivePayload(withVariant(bad)), JSON.stringify(bad)).toBeNull();
    }

    const onCouncil = golden("council-counting-2022.json");
    const index = onCouncil.races.findIndex((r: { projection: unknown }) => r.projection !== null);
    onCouncil.races[index].projection.variant = { in_effect: "count_only", ess: null, off_reason: "forecast_missing" };
    expect(validateLivePayload(onCouncil)).toBeNull();
  });

  it("checks the gated statuses, the shown band and the Possible Range (#45)", () => {
    const live = golden("gated-live-2022.json");
    expect(live.levels).toEqual({
      mayor: { projection: "live", variant: "live", approved: true },
      council: { projection: "live" },
      trustee: { projection: "live" },
      french_trustee: { projection: "none" },
    });
    const at = (p: { races: { id: string }[] }, id: string) => p.races.findIndex((r) => r.id === id);

    const unknownStatus = golden("gated-live-2022.json");
    unknownStatus.levels.council.projection = "paused";
    expect(validateLivePayload(unknownStatus)).toBeNull();

    const notApproved = golden("gated-live-2022.json");
    notApproved.levels.mayor.approved = "yes";
    expect(validateLivePayload(notApproved)).toBeNull();

    // `shown` names a band the race carries, or nothing.
    const shownMissing = golden("gated-live-2022.json");
    shownMissing.races[at(shownMissing, "councillor-1")].projection.shown = "forecast_weighted";
    expect(validateLivePayload(shownMissing)).toBeNull();
    const nothingShown = golden("gated-live-2022.json");
    nothingShown.races[at(nothingShown, "mayor")].projection.shown = null;
    nothingShown.races[at(nothingShown, "mayor")].projection.bands = {};
    expect(validateLivePayload(nothingShown)).not.toBeNull();

    // The Possible Range: the race's own candidates, low <= high within 0..100, counting only.
    const possible = golden("gated-live-2022.json");
    const index = at(possible, "councillor-1");
    const first = Object.keys(possible.races[index].possible)[0];
    const bad = (edit: (p: ReturnType<typeof golden>) => void) => {
      const payload = golden("gated-live-2022.json");
      edit(payload);
      return validateLivePayload(payload);
    };
    expect(bad((p) => (p.races[index].possible["Not A Candidate"] = { low: 1, high: 2 }))).toBeNull();
    expect(bad((p) => (p.races[index].possible[first] = { low: 50, high: 40 }))).toBeNull();
    expect(bad((p) => (p.races[index].possible[first] = { low: 10, high: 101 }))).toBeNull();
    expect(bad((p) => ((p.races[index].state = "all_units_in"), (p.races[index].projection = null)))).toBeNull();
    expect(bad((p) => (p.races[index].possible = null))).not.toBeNull();
  });

  it("rejects projection bands outside a counting race or for unknown candidates", () => {
    const counting = golden("council-counting-2022.json");
    const index = counting.races.findIndex((r: { projection: unknown }) => r.projection !== null);
    const bands = counting.races[index].projection.bands.count_only;
    const first = Object.keys(bands)[0];

    const unknownKey = golden("council-counting-2022.json");
    unknownKey.races[index].projection.bands.count_only["Not A Candidate"] = bands[first];
    expect(validateLivePayload(unknownKey)).toBeNull();

    const notCounting = golden("council-counting-2022.json");
    notCounting.races[index].state = "all_units_in";
    expect(validateLivePayload(notCounting)).toBeNull();

    const inverted = golden("council-counting-2022.json");
    inverted.races[index].projection.bands.count_only[first] = { low: 50, mid: 40, high: 60 };
    expect(validateLivePayload(inverted)).toBeNull();
  });

  it("requires mayoral wards on the mayor race only, keyed by its candidates", () => {
    const noWards = golden("council-counting-2022.json");
    delete noWards.races[0].wards;
    expect(validateLivePayload(noWards)).toBeNull();

    const councilWards = golden("council-counting-2022.json");
    councilWards.races[1].wards = [];
    expect(validateLivePayload(councilWards)).toBeNull();

    const strayKey = golden("council-counting-2022.json");
    strayKey.races[0].wards[0].votes["Not A Candidate"] = 1;
    expect(validateLivePayload(strayKey)).toBeNull();
  });

  it("rejects an unknown projection status and duplicate candidate keys", () => {
    const status = golden("no-units-in-2026.json");
    status.levels.council.projection = "gated";
    expect(validateLivePayload(status)).toBeNull();

    const duplicate = golden("no-units-in-2026.json");
    duplicate.races[1].candidates.push(duplicate.races[1].candidates[0]);
    expect(validateLivePayload(duplicate)).toBeNull();
  });
});
