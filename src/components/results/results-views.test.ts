import { describe, expect, it } from "vitest";
import { viewFrom } from "./results-views";

describe("viewFrom (#103, #123)", () => {
  it("reads each view from ?view=, Races otherwise", () => {
    expect(viewFrom("map")).toBe("map");
    expect(viewFrom("count")).toBe("count");
    expect(viewFrom("tables")).toBe("tables");
    expect(viewFrom(null)).toBe("races");
    expect(viewFrom("nonsense")).toBe("races");
  });
});
