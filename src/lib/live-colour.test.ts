import { describe, expect, it } from "vitest";
import { liveColour, oklab, type ColourTable } from "./live-colour";
import table from "@/data/candidate-colours.json";

const CHOW = "per_a4291ca7539b53e2acc1c4f108bc73e6";
const stub: ColourTable = { races: { "councillor-1": { can_a: "#2E6FB0", can_b: "var(--color-mcvie)" } } };

describe("liveColour", () => {
  it("keeps the forecast pages' colour for a forecast-named candidate", () => {
    expect(liveColour({ candidate_id: CHOW, candidacy_id: "can_a" }, undefined, stub)).toBe("var(--color-chow)");
  });

  it("takes the campaign colour from the table by candidacy", () => {
    expect(liveColour({ candidate_id: null, candidacy_id: "can_a" }, undefined, stub)).toBe("#2E6FB0");
    expect(liveColour({ candidate_id: null, candidacy_id: "can_b" }, undefined, stub)).toBe("var(--color-mcvie)");
  });

  it("falls back to the neutral for anyone without one", () => {
    expect(liveColour({ candidate_id: null, candidacy_id: "can_z" }, undefined, stub)).toBe("var(--color-disengaged)");
    expect(liveColour({ candidate_id: null, candidacy_id: null }, "var(--live-other)", stub)).toBe("var(--live-other)");
    expect(liveColour(undefined, undefined, stub)).toBe("var(--color-disengaged)");
  });
});

/** OKLab distance ×100, the dataviz validator's scale. */
const delta = (a: string, b: string) => {
  const [x, y] = [oklab(a), oklab(b)];
  return 100 * Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
};
/** The two greys a colourless candidate is drawn in: --muted (bars) and --live-other (map). */
const GREYS = ["#5c6478", "#8a8f9c"];
const PINNED: Record<string, string> = {
  "Sarah McVie": "var(--color-mcvie)",
  "Odessa Paloma Parker": "var(--color-parker)",
  "Chris Alexander": "var(--color-alexander)",
};

describe("candidate-colours.json", () => {
  const races = Object.entries((table as ColourTable).races);
  const hexes = races.flatMap(([, r]) => Object.values(r).filter((c) => c.startsWith("#")));

  it("covers most candidates' races", () => {
    expect(races.length).toBeGreaterThan(40);
    expect(hexes.length).toBeGreaterThan(100);
  });

  it("keeps every assigned colour readable as a chart colour", () => {
    for (const hex of hexes) {
      const [l, a, b] = oklab(hex);
      expect(l, hex).toBeGreaterThanOrEqual(0.43);
      expect(l, hex).toBeLessThanOrEqual(0.77);
      expect(Math.hypot(a, b), hex).toBeGreaterThanOrEqual(0.095);
    }
  });

  it("keeps every two colours in a race, and each colour against the greys, clearly apart", () => {
    for (const [id, race] of races) {
      const own = Object.values(race).filter((c) => c.startsWith("#"));
      for (const hex of own) for (const grey of GREYS) expect(delta(hex, grey), `${id} ${hex}`).toBeGreaterThanOrEqual(15);
      for (let i = 0; i < own.length; i++)
        for (let j = i + 1; j < own.length; j++) expect(delta(own[i], own[j]), `${id} ${own[i]} ${own[j]}`).toBeGreaterThanOrEqual(15);
    }
  });

  it("gives the hand-picked mayoral candidates their own colour variables", () => {
    const names = (table as ColourTable & { names?: Record<string, string> }).names ?? {};
    for (const [name, colour] of Object.entries(PINNED)) {
      const id = Object.keys(names).find((k) => names[k] === name);
      expect(id, name).toBeDefined();
      expect((table as ColourTable).races.mayor?.[id as string], name).toBe(colour);
    }
  });
});
