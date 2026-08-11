import { describe, expect, it } from "vitest";
import { candidateColour, candidateName } from "./candidate-presentation";

describe("candidate presentation", () => {
  it("preserves the exact requested palette", () => {
    expect(candidateColour("bradford")).toBe("#2E8B57");
    expect(candidateColour("chow")).toBe("#854A90");
    expect(candidateColour("alexander")).toBe("#F8C466");
  });

  it("has stable fallbacks for future candidates", () => {
    expect(candidateColour("future")).toBe("#94a3b8");
    expect(candidateName("future")).toBe("Future");
  });
});

