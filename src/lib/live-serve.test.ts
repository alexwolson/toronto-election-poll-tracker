import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { serveLive } from "./live-serve";

const RAW = readFileSync(
  path.resolve(__dirname, "../../fixtures/live/payload/no-units-in-2026.json"),
  "utf8",
);

describe("serveLive", () => {
  it("serves the stored payload with the newer heartbeat", () => {
    const served = serveLive({ payload: RAW, heartbeats: ["1793059320000", "1793059350000"] });
    expect(served.heartbeat).toBe(1793059350000);
    expect(served.payload).toEqual(JSON.parse(RAW));
  });

  it("serves with one heartbeat when the other pipeline has never written one", () => {
    expect(serveLive({ payload: RAW, heartbeats: [null, "1793059350000"] }).heartbeat).toBe(1793059350000);
    expect(serveLive({ payload: RAW, heartbeats: ["1793059320000", null] }).heartbeat).toBe(1793059320000);
  });

  it("throws on a missing payload", () => {
    expect(() => serveLive({ payload: null, heartbeats: ["1793059320000", null] })).toThrow(/payload/);
  });

  it("throws when neither heartbeat exists", () => {
    expect(() => serveLive({ payload: RAW, heartbeats: [null, null] })).toThrow(/heartbeat/);
  });

  it("throws on a heartbeat that is not epoch milliseconds", () => {
    for (const bad of ["", "abc", "1.5", "-1", "1e12"]) {
      expect(() => serveLive({ payload: RAW, heartbeats: [bad, "1793059350000"] }), bad).toThrow(/heartbeat/);
    }
  });

  it("throws on bytes that are not JSON", () => {
    expect(() => serveLive({ payload: "{not json", heartbeats: ["1793059320000", null] })).toThrow(/payload/);
  });

  it("throws on a payload that fails the validator, including its schema version", () => {
    const wrongVersion = JSON.stringify({ ...JSON.parse(RAW), schema_version: 2 });
    expect(() => serveLive({ payload: wrongVersion, heartbeats: ["1793059320000", null] })).toThrow(/payload/);
    expect(() => serveLive({ payload: "{}", heartbeats: ["1793059320000", null] })).toThrow(/payload/);
  });
});
