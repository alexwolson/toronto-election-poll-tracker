import { afterEach, describe, expect, it, vi } from "vitest";
import { loadRequiredFeed } from "./feed-source";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("loadRequiredFeed", () => {
  it("fails instead of substituting a fallback for an invalid release contract", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ schema_version: 999 }),
      }),
    );

    await expect(loadRequiredFeed("required.json", () => null)).rejects.toThrow(
      "invalid required feed: required.json",
    );
  });
});
