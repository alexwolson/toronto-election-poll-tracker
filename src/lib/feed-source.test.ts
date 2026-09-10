import { afterEach, describe, expect, it, vi } from "vitest";
import { feedFallbacksAllowed, loadFeed, loadRequiredFeed } from "./feed-source";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
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
      /required feed required\.json from .*failed schema or semantic validation/,
    );
  });

  it("reports the feed and source when required data is missing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));

    await expect(loadRequiredFeed("missing.json", (value) => value)).rejects.toThrow(
      /required feed missing\.json from https:\/\/raw\.githubusercontent\.com\/.*could not be read: fetch missing\.json: 404/,
    );
  });

  it("reports malformed JSON without substituting a fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockRejectedValue(new SyntaxError("unexpected token")),
      }),
    );

    await expect(loadRequiredFeed("malformed.json", (value) => value)).rejects.toThrow(
      /required feed malformed\.json .* could not be read: unexpected token/,
    );
  });

  it("reports a validator exception as a validation failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ schema_version: 2 }),
      }),
    );

    await expect(
      loadRequiredFeed("semantic.json", () => {
        throw new Error("duplicate candidate id");
      }),
    ).rejects.toThrow(/semantic\.json .* validation failed: duplicate candidate id/);
  });
});

describe("loadFeed", () => {
  it("fails closed outside explicit development or test modes", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));

    await expect(loadFeed("required.json", () => null, { empty: true })).rejects.toThrow(
      /required feed required\.json/,
    );
  });

  it("allows an honest fallback in explicit development mode", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const fallback = { empty: true };

    await expect(loadFeed("optional.json", () => null, fallback)).resolves.toBe(fallback);
  });
});

describe("feedFallbacksAllowed", () => {
  it("requires an explicit development, test, or fixture mode", () => {
    expect(feedFallbacksAllowed({ NODE_ENV: "production" })).toBe(false);
    expect(feedFallbacksAllowed({})).toBe(false);
    expect(feedFallbacksAllowed({ NODE_ENV: "development" })).toBe(true);
    expect(feedFallbacksAllowed({ NODE_ENV: "test" })).toBe(true);
    expect(feedFallbacksAllowed({ FEED_LOCAL_DIR: "./fixtures" })).toBe(true);
    expect(feedFallbacksAllowed({ FEED_LOCAL_DIR: ".release-data" })).toBe(false);
  });
});
