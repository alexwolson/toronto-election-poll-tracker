import { describe, expect, it } from "vitest";
import { candidateMeta, candidateName } from "./candidates";

describe("candidate registry", () => {
  it("names the three majors", () => {
    expect(candidateName("chow")).toBe("Olivia Chow");
    expect(candidateName("bradford")).toBe("Brad Bradford");
    expect(candidateName("alexander")).toBe("Chris Alexander");
  });

  it("maps each major to its palette CSS variable", () => {
    expect(candidateMeta("chow").colorVar).toBe("var(--color-chow)");
    expect(candidateMeta("bradford").colorVar).toBe("var(--color-bradford)");
    expect(candidateMeta("alexander").colorVar).toBe("var(--color-alexander)");
  });

  it("uses the cyan palette for Alexander without the retired gold hatch treatment", () => {
    expect(candidateMeta("alexander").hatch).toBe(false);
    expect(candidateMeta("chow").hatch).toBe(false);
  });

  it("resolves the polled minor candidates to the same palette for canonical and local ids", () => {
    for (const [alias, id, name, color] of [
      ["sarah-mcvie", "per_95cd5c92c035574ab823643b45e8a5ae", "Sarah McVie", "var(--color-mcvie)"],
      ["odessa-paloma-parker", "per_56060d2725565733b8f3a78855fc0c25", "Odessa Paloma Parker", "var(--color-parker)"],
    ]) {
      expect(candidateMeta(id)).toMatchObject({ name, colorVar: color, hatch: false });
      expect(candidateMeta(alias)).toMatchObject({ name, colorVar: color, hatch: false });
    }
  });

  it("falls back to a title-cased name and the neutral colour for unknowns", () => {
    expect(candidateName("furey")).toBe("Furey");
    expect(candidateName("other")).toBe("Other");
    expect(candidateMeta("furey").colorVar).toBe("var(--color-disengaged)");
  });
});
