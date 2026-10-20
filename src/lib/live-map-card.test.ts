import { describe, expect, it } from "vitest";
import { placeCard } from "./live-map-card";

// A 600 × 400 map stage, a 200 × 120 card, 14 px from the point, 8 px from the edges.
const BOX = { w: 600, h: 400 };
const CARD = { w: 200, h: 120 };

describe("placeCard", () => {
  it("sits below and to the right of the point when it fits", () => {
    expect(placeCard({ x: 100, y: 50 }, CARD, BOX)).toEqual({ left: 114, top: 64 });
  });

  it("flips to the left of a point near the right edge", () => {
    expect(placeCard({ x: 500, y: 50 }, CARD, BOX)).toEqual({ left: 286, top: 64 });
  });

  it("rises to stay inside the stage near the bottom", () => {
    expect(placeCard({ x: 100, y: 380 }, CARD, BOX)).toEqual({ left: 114, top: 272 });
  });

  it("centres on a point with no room either side, below it if it fits, else above", () => {
    const narrow = { w: 300, h: 400 };
    expect(placeCard({ x: 150, y: 50 }, CARD, narrow)).toEqual({ left: 50, top: 64 });
    expect(placeCard({ x: 150, y: 350 }, CARD, narrow)).toEqual({ left: 50, top: 216 });
  });
});
