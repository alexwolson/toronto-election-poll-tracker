import { describe, expect, it } from "vitest";
import { eliminatedKeys } from "./live-eliminated";

describe("Mathematically Eliminated (#90)", () => {
  it("badges a candidate whose possible high is below another's possible low", () => {
    const possible = {
      a: { low: 40, high: 60 },
      b: { low: 25, high: 45 },
      c: { low: 5, high: 25 },
    };
    expect(eliminatedKeys(possible)).toEqual(new Set(["c"]));
  });

  it("does not badge a candidate who could still tie", () => {
    expect(eliminatedKeys({ a: { low: 40, high: 60 }, b: { low: 20, high: 40 } })).toEqual(new Set());
  });

  it("does not badge a gap the 2-decimal rounding could explain", () => {
    expect(eliminatedKeys({ a: { low: 40, high: 60 }, b: { low: 19.99, high: 39.99 } })).toEqual(new Set());
    expect(eliminatedKeys({ a: { low: 40, high: 60 }, b: { low: 19.98, high: 39.98 } })).toEqual(new Set(["b"]));
  });

  it("badges no one without a Possible Range", () => {
    expect(eliminatedKeys(null)).toEqual(new Set());
  });
});
