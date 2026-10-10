import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { acceptPoll, INITIAL_LIVE_STATE, showsUnreachableNotice, type LiveClientState } from "./live-accept";

// The browser's accept rule (#17 § Browser, S7): what each poll of
// /live/results.json does to what the reader sees.
const PAYLOAD = JSON.parse(
  readFileSync(path.resolve(__dirname, "../../fixtures/live/payload/no-units-in-2026.json"), "utf8"),
);
const ALL_OFFICE = PAYLOAD.seq.all_office;
const WARD_BY_WARD = PAYLOAD.seq.ward_by_ward;
const HEARTBEAT = 1793059350000;

/** A served body for the given seq pair, as the route returns it. */
function served(allOffice: number, wardByWard: number, heartbeat = HEARTBEAT) {
  return {
    heartbeat,
    paused: false,
    payload: { ...structuredClone(PAYLOAD), seq: { all_office: allOffice, ward_by_ward: wardByWard } },
  };
}

function holding(body: ReturnType<typeof served>): LiveClientState {
  const state = acceptPoll(INITIAL_LIVE_STATE, body);
  expect(state.results).toEqual(body);
  return state;
}

describe("acceptPoll", () => {
  it("accepts the first valid body", () => {
    const body = served(ALL_OFFICE, WARD_BY_WARD);
    expect(acceptPoll(INITIAL_LIVE_STATE, body)).toEqual({ results: body, failures: 0 });
  });

  it("accepts a newer pair: either seq newer and neither older", () => {
    const state = holding(served(ALL_OFFICE, WARD_BY_WARD));
    for (const next of [
      served(ALL_OFFICE + 60_000, WARD_BY_WARD),
      served(ALL_OFFICE, WARD_BY_WARD + 60_000),
      served(ALL_OFFICE + 60_000, WARD_BY_WARD + 60_000),
    ]) {
      expect(acceptPoll(state, next).results).toEqual(next);
    }
  });

  it("accepts an equal pair, so a switch flip or a fresh heartbeat reaches the reader", () => {
    const state = holding(served(ALL_OFFICE, WARD_BY_WARD));
    const flipped = served(ALL_OFFICE, WARD_BY_WARD, HEARTBEAT + 60_000);
    flipped.payload.levels.council.projection = "switched_off";
    expect(acceptPoll(state, flipped).results).toEqual(flipped);
    // The page pause, and back, at the same count and the same heartbeat.
    const paused = { ...served(ALL_OFFICE, WARD_BY_WARD), paused: true };
    const pausedState = acceptPoll(state, paused);
    expect(pausedState.results).toEqual(paused);
    const resumed = served(ALL_OFFICE, WARD_BY_WARD);
    expect(acceptPoll(pausedState, resumed).results).toEqual(resumed);
  });

  it("ignores an older or mixed pair and keeps the newer count", () => {
    const state = holding(served(ALL_OFFICE, WARD_BY_WARD));
    for (const next of [
      served(ALL_OFFICE - 60_000, WARD_BY_WARD),
      served(ALL_OFFICE, WARD_BY_WARD - 60_000),
      served(ALL_OFFICE - 60_000, WARD_BY_WARD - 60_000),
      served(ALL_OFFICE + 60_000, WARD_BY_WARD - 60_000),
    ]) {
      expect(acceptPoll(state, next).results).toBe(state.results);
    }
  });

  it("never replaces a good payload with an invalid one", () => {
    const state = holding(served(ALL_OFFICE, WARD_BY_WARD));
    const wrongSchema = served(ALL_OFFICE + 60_000, WARD_BY_WARD);
    (wrongSchema.payload as { schema_version: number }).schema_version = 1;
    const noHeartbeat = { paused: false, payload: served(ALL_OFFICE + 60_000, WARD_BY_WARD).payload };
    const noPaused: Partial<ReturnType<typeof served>> = served(ALL_OFFICE + 60_000, WARD_BY_WARD);
    delete noPaused.paused;
    const badPaused = { ...served(ALL_OFFICE + 60_000, WARD_BY_WARD), paused: "yes" };
    for (const bad of [null, "not json", {}, wrongSchema, noHeartbeat, noPaused, badPaused]) {
      const next = acceptPoll(state, bad);
      expect(next.results).toBe(state.results);
      expect(next.failures).toBe(1);
    }
  });

  it("raises the notice after three failed polls, keeps the last count, and clears on success", () => {
    let state = holding(served(ALL_OFFICE, WARD_BY_WARD));
    const kept = state.results;
    state = acceptPoll(state, null);
    state = acceptPoll(state, null);
    expect(showsUnreachableNotice(state)).toBe(false);
    state = acceptPoll(state, "garbage");
    expect(showsUnreachableNotice(state)).toBe(true);
    expect(state.results).toBe(kept);

    // Any good response means the route is reachable again, even an older pair.
    const older = acceptPoll(state, served(ALL_OFFICE - 60_000, WARD_BY_WARD));
    expect(showsUnreachableNotice(older)).toBe(false);
    expect(older.results).toBe(kept);
  });

  it("raises the notice with nothing to keep when the first three polls fail", () => {
    let state = INITIAL_LIVE_STATE;
    for (let i = 0; i < 3; i++) state = acceptPoll(state, null);
    expect(state).toEqual({ results: null, failures: 3 });
    expect(showsUnreachableNotice(state)).toBe(true);
  });
});
