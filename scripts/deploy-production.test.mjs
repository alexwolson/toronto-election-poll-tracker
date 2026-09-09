import { describe, expect, it } from "vitest";

import { deployProduction, productionDeployArguments } from "./deploy-production.mjs";

describe("production deployment wrapper", () => {
  it("requires exactly one intended Backend release tag", () => {
    expect(() => productionDeployArguments([])).toThrow(
      /npm run deploy:production -- backend-YYYY-MM-DD.N/,
    );
    expect(() => productionDeployArguments(["backend-2026-09-09.2", "extra"])).toThrow(
      /usage/,
    );
  });

  it("rejects malformed Backend release tags", () => {
    expect(() => productionDeployArguments(["latest"])).toThrow(
      /must match backend-YYYY-MM-DD.N/,
    );
  });

  it("passes the intended tag only as a one-build production override", () => {
    expect(productionDeployArguments(["backend-2026-09-09.2"])).toEqual([
      "deploy",
      "--prod",
      "--yes",
      "--build-env",
      "DEPLOY_BACKEND_RELEASE_TAG=backend-2026-09-09.2",
    ]);
  });

  it("fails before spawning Vercel when the tag is omitted", async () => {
    let spawned = false;
    await expect(
      deployProduction({
        argv: [],
        spawnImpl: () => {
          spawned = true;
        },
      }),
    ).rejects.toThrow(/usage/);
    expect(spawned).toBe(false);
  });
});
