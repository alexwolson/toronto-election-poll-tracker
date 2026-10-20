import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { LivePayload, LiveRace } from "@/types/live";
import { COUNCIL_AREAS, areaTallies } from "./council-areas";

function mayorOf(file: string): LiveRace {
  const payload = JSON.parse(readFileSync(path.resolve(__dirname, "../../fixtures/live", file), "utf8")) as LivePayload;
  return payload.races.find((r) => r.id === "mayor")!;
}

describe("COUNCIL_AREAS", () => {
  it("puts each of the 25 wards in exactly one community council area", () => {
    const wards = COUNCIL_AREAS.flatMap((a) => a.wards).sort((a, b) => Number(a) - Number(b));
    expect(wards).toEqual(Array.from({ length: 25 }, (_, i) => String(i + 1)));
    expect(COUNCIL_AREAS.map((a) => a.name)).toEqual(["Etobicoke York", "North York", "Toronto and East York", "Scarborough"]);
  });
});

describe("areaTallies", () => {
  it("sums each area's voting areas and votes from its wards", () => {
    // Mock night; expected figures summed independently from the fixture's ward rows.
    const [etobicoke, , toronto, scarborough] = areaTallies(mayorOf("mock-night/payload.json"));
    expect(etobicoke.progress).toEqual({ received: 249, total: 302 });
    expect(etobicoke.counted).toBe(105125);
    expect(etobicoke.votes["Brad Bradford"]).toBe(43914);
    expect(toronto.progress).toEqual({ received: 434, total: 509 });
    expect(toronto.votes["Olivia Chow"]).toBe(92964);
    expect(scarborough.counted).toBe(102260);
  });

  it("gives an area with nothing counted no votes, but its voting areas", () => {
    const [etobicoke] = areaTallies(mayorOf("payload/no-units-in-2026.json"));
    expect(etobicoke.progress).toEqual({ received: 0, total: 302 });
    expect(etobicoke.counted).toBe(0);
  });

  it("has no area progress while any of its wards has none, rather than a short total", () => {
    const mayor = structuredClone(mayorOf("mock-night/payload.json"));
    mayor.wards!.find((w) => w.num === "5")!.progress = null;
    const [etobicoke, north] = areaTallies(mayor);
    expect(etobicoke.progress).toBeNull();
    expect(north.progress).toEqual({ received: 290, total: 338 });
  });

  it("has no progress before results, when the City gives none", () => {
    const [etobicoke] = areaTallies(mayorOf("payload/before-results-2026.json"));
    expect(etobicoke.progress).toBeNull();
    expect(etobicoke.counted).toBe(0);
  });
});
