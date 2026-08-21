import { describe, expect, it } from "vitest";
import { LOESS_CONFIG, loessCurve } from "./loess";

describe("loessCurve", () => {
  it("returns null when there are too few distinct observations", () => {
    const few = [
      { x: 0, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 3 },
    ];
    expect(few.length).toBeLessThan(LOESS_CONFIG.minPoints);
    expect(loessCurve(few)).toBeNull();
  });

  it("smooths a noisy trend and never extrapolates past the observed range", () => {
    // y ~ x with an alternating ±0.5 wobble
    const pts = Array.from({ length: 12 }, (_, i) => ({
      x: i,
      y: i + (i % 2 === 0 ? -0.5 : 0.5),
    }));
    const curve = loessCurve(pts);
    expect(curve).not.toBeNull();
    expect(curve![0].x).toBe(0); // starts at the first observation
    expect(curve![curve!.length - 1].x).toBe(11); // ends at the last, no extrapolation
    // recovers the increasing trend
    expect(curve![curve!.length - 1].y).toBeGreaterThan(curve![0].y);
    // and tracks the underlying line y≈x near the middle (smoother than the raw wobble)
    const mid = curve![Math.floor(curve!.length / 2)];
    expect(Math.abs(mid.y - mid.x)).toBeLessThan(1);
  });

  it("is deterministic for the same input and fixed config", () => {
    const pts = Array.from({ length: 10 }, (_, i) => ({ x: i, y: (i * 7) % 5 }));
    expect(loessCurve(pts)).toEqual(loessCurve(pts));
  });

  it("returns exactly the configured number of grid points", () => {
    const pts = Array.from({ length: 8 }, (_, i) => ({ x: i, y: i }));
    expect(loessCurve(pts)!).toHaveLength(LOESS_CONFIG.gridSize);
  });
});
