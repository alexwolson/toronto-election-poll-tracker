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

  it("flags Alexander as hatch-filled (gold reads as a pattern, not a solid)", () => {
    expect(candidateMeta("alexander").hatch).toBe(true);
    expect(candidateMeta("chow").hatch).toBe(false);
  });

  it("falls back to a title-cased name and the neutral colour for unknowns", () => {
    expect(candidateName("furey")).toBe("Furey");
    expect(candidateName("other")).toBe("Other");
    expect(candidateMeta("furey").colorVar).toBe("var(--color-disengaged)");
  });
});
