import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  backendSelection,
  resolveReleases,
  validateProductionIntent,
} from "./resolve-releases.mjs";

const repositories = {
  backend: "alexwolson/toronto-election-poll-tracker-backend",
  results: "alexwolson/toronto-election-results",
  polling: "alexwolson/toronto-election-poll-tracker-data",
};
const tags = {
  backend: "backend-2026-09-09.2",
  results: "results-2026-09-09.1",
  polling: "polling-2026-09-09.2",
};

function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

function jsonBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}

function createFixture({ backendPrerelease = false, mismatchedResultsPin = false } = {}) {
  const feeds = {
    mayoral_forecast: Buffer.from('{"forecast":true}\n'),
    council_race_cards: Buffer.from('{"council":true}\n'),
    trustee_race_cards: Buffer.from('{"trustees":true}\n'),
    mayoral_candidates: Buffer.from('{"candidates":true}\n'),
    mayoral_polling: Buffer.from('{"polling":true}\n'),
  };
  const resultsManifest = {
    repository: repositories.results,
    source_commit: "results-commit",
    feeds: { mayoral_candidates: "mayoral_candidates.json" },
    assets: [
      {
        filename: "mayoral_candidates.json",
        sha256: sha256(feeds.mayoral_candidates),
      },
    ],
  };
  const resultsManifestBytes = jsonBytes(resultsManifest);
  const pollingManifest = {
    repository: repositories.polling,
    source_commit: "polling-commit",
    dependencies: {
      results: {
        repository: repositories.results,
        release: tags.results,
        source_commit: resultsManifest.source_commit,
        manifest_sha256: sha256(resultsManifestBytes),
      },
    },
    feeds: { mayoral_polling: "mayoral_polling.json" },
    assets: [
      {
        filename: "mayoral_polling.json",
        sha256: sha256(feeds.mayoral_polling),
      },
    ],
  };
  const pollingManifestBytes = jsonBytes(pollingManifest);
  const backendManifest = {
    repository: repositories.backend,
    source_commit: "backend-commit",
    generated_at: "2026-09-09T13:33:26Z",
    dependencies: {
      results: {
        repository: repositories.results,
        release: tags.results,
        source_commit: mismatchedResultsPin ? "wrong-results-commit" : "results-commit",
        manifest_sha256: sha256(resultsManifestBytes),
      },
      polling: {
        repository: repositories.polling,
        release: tags.polling,
        source_commit: "polling-commit",
        manifest_sha256: sha256(pollingManifestBytes),
      },
    },
    feeds: {
      mayoral_forecast: "mayoral_forecast.json",
      council_race_cards: "council_race_cards.json",
      trustee_race_cards: "trustee_race_cards.json",
    },
    assets: [
      "mayoral_forecast",
      "council_race_cards",
      "trustee_race_cards",
    ].map((name) => ({ filename: `${name}.json`, sha256: sha256(feeds[name]) })),
  };
  const manifests = {
    backend: jsonBytes(backendManifest),
    results: resultsManifestBytes,
    polling: pollingManifestBytes,
  };
  const entries = new Map();

  for (const name of Object.keys(repositories)) {
    const manifestUrl = `https://downloads.test/${name}/release_manifest.json`;
    const releaseFeeds = Object.values(
      name === "backend"
        ? backendManifest.feeds
        : name === "results"
          ? resultsManifest.feeds
          : pollingManifest.feeds,
    );
    const metadata = {
      tag_name: tags[name],
      draft: false,
      prerelease: name === "backend" && backendPrerelease,
      assets: [
        { name: "release_manifest.json", browser_download_url: manifestUrl },
        ...releaseFeeds.map((filename) => ({
          name: filename,
          browser_download_url: `https://downloads.test/${name}/${filename}`,
        })),
      ],
    };
    entries.set(
      `https://api.github.com/repos/${repositories[name]}/releases/tags/${tags[name]}`,
      { body: JSON.stringify(metadata) },
    );
    if (name === "backend") {
      entries.set(`https://api.github.com/repos/${repositories.backend}/releases/latest`, {
        body: JSON.stringify(metadata),
      });
    }
    entries.set(manifestUrl, { body: manifests[name] });
  }

  const feedProducers = {
    mayoral_candidates: "results",
    mayoral_polling: "polling",
  };
  for (const [name, bytes] of Object.entries(feeds)) {
    const producer = feedProducers[name] ?? "backend";
    entries.set(`https://downloads.test/${producer}/${name}.json`, { body: bytes });
  }

  const events = [];
  async function fetchImpl(url, options = {}) {
    events.push({ type: "fetch", url, options });
    const entry = entries.get(url);
    if (!entry) return new Response("not found", { status: 404 });
    return new Response(entry.body, {
      status: entry.status ?? 200,
      headers: entry.headers,
    });
  }
  return { events, fetchImpl };
}

async function withTempDirectory(callback) {
  const directory = await mkdtemp(join(tmpdir(), "release-resolver-"));
  try {
    return await callback(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

describe("backend release selection", () => {
  it("requires either an exact tag or deliberate latest mode", () => {
    expect(() => backendSelection({})).toThrow(/BACKEND_RELEASE_TAG/);
    expect(() =>
      backendSelection({ BACKEND_RELEASE_TAG: tags.backend, BACKEND_RELEASE_MODE: "latest" }),
    ).toThrow(/not both/);
  });

  it("rejects unsupported modes", () => {
    expect(() => backendSelection({ BACKEND_RELEASE_MODE: "stable" })).toThrow(
      /must be 'latest'/,
    );
  });

  it("rejects malformed exact tags", () => {
    expect(() => backendSelection({ BACKEND_RELEASE_TAG: "backend-latest" })).toThrow(
      /must match backend-YYYY-MM-DD.N/,
    );
  });
});

describe("production release intent", () => {
  const selection = { tag: tags.backend };

  it("requires one-time intent for Vercel Production", () => {
    expect(() =>
      validateProductionIntent(
        { VERCEL_ENV: "production", BACKEND_RELEASE_TAG: tags.backend },
        selection,
      ),
    ).toThrow(/missing DEPLOY_BACKEND_RELEASE_TAG/);
  });

  it("rejects stale configured tags informatively", () => {
    expect(() =>
      validateProductionIntent(
        {
          VERCEL_ENV: "production",
          BACKEND_RELEASE_TAG: tags.backend,
          DEPLOY_BACKEND_RELEASE_TAG: "backend-2026-09-10.1",
        },
        selection,
      ),
    ).toThrow(/does not match configured BACKEND_RELEASE_TAG/);
  });

  it("accepts matching intent and leaves local or Preview builds unchanged", () => {
    expect(
      validateProductionIntent(
        {
          VERCEL_ENV: "production",
          BACKEND_RELEASE_TAG: tags.backend,
          DEPLOY_BACKEND_RELEASE_TAG: tags.backend,
        },
        selection,
      ),
    ).toBeUndefined();
    expect(validateProductionIntent({ VERCEL_ENV: "preview" }, selection)).toBeUndefined();
    expect(validateProductionIntent({}, selection)).toBeUndefined();
  });
});

describe("release resolution", () => {
  it("resolves an explicit Backend tag and prints the chain before feed downloads", async () => {
    await withTempDirectory(async (cwd) => {
      const fixture = createFixture();
      const events = fixture.events;
      const sources = await resolveReleases({
        cwd,
        env: { BACKEND_RELEASE_TAG: tags.backend },
        fetchImpl: fixture.fetchImpl,
        logger: (message) => events.push({ type: "log", message }),
        now: () => new Date("2026-09-09T14:00:00Z"),
      });

      expect(events.some((event) => event.url?.endsWith(`/tags/${tags.backend}`))).toBe(true);
      expect(events.some((event) => event.url?.endsWith("/releases/latest"))).toBe(false);
      const logIndex = events.findIndex((event) => event.type === "log");
      const firstFeedIndex = events.findIndex(
        (event) => event.type === "fetch" && event.url.endsWith("mayoral_forecast.json"),
      );
      expect(logIndex).toBeGreaterThan(-1);
      expect(logIndex).toBeLessThan(firstFeedIndex);
      expect(events[logIndex].message).toContain(
        `${tags.backend} with Results ${tags.results} and Polling ${tags.polling}`,
      );
      expect(sources.releases.backend.release).toBe(tags.backend);
      const deployedManifest = JSON.parse(
        await readFile(join(cwd, "public/data/source-manifest.json"), "utf8"),
      );
      expect(deployedManifest.releases).toEqual(sources.releases);
    });
  });

  it("uses latest stable only when explicitly requested", async () => {
    await withTempDirectory(async (cwd) => {
      const fixture = createFixture();
      await resolveReleases({
        cwd,
        env: { BACKEND_RELEASE_MODE: "latest" },
        fetchImpl: fixture.fetchImpl,
        logger: () => {},
      });
      expect(fixture.events.some((event) => event.url?.endsWith("/releases/latest"))).toBe(
        true,
      );
    });
  });

  it("rejects prerelease Backend metadata", async () => {
    await withTempDirectory(async (cwd) => {
      const fixture = createFixture({ backendPrerelease: true });
      await expect(
        resolveReleases({
          cwd,
          env: { BACKEND_RELEASE_TAG: tags.backend },
          fetchImpl: fixture.fetchImpl,
          logger: () => {},
        }),
      ).rejects.toThrow(/release is not stable/);
    });
  });

  it("reports GitHub API rate limiting with an authentication remedy", async () => {
    const fetchImpl = async () =>
      new Response("rate limited", {
        status: 403,
        headers: { "x-ratelimit-remaining": "0" },
      });
    await expect(
      resolveReleases({
        env: { BACKEND_RELEASE_TAG: tags.backend },
        fetchImpl,
        logger: () => {},
      }),
    ).rejects.toThrow(/configure GH_TOKEN or GITHUB_TOKEN/);
  });

  it.each(["GH_TOKEN", "GITHUB_TOKEN"])(
    "accepts %s without sending it to asset hosts",
    async (tokenName) => {
      await withTempDirectory(async (cwd) => {
        const fixture = createFixture();
        await resolveReleases({
          cwd,
          env: { BACKEND_RELEASE_TAG: tags.backend, [tokenName]: "secret-token" },
          fetchImpl: fixture.fetchImpl,
          logger: () => {},
        });
        const apiCalls = fixture.events.filter((event) =>
          event.url?.startsWith("https://api.github.com/"),
        );
        const assetCalls = fixture.events.filter((event) =>
          event.url?.startsWith("https://downloads.test/"),
        );
        expect(
          apiCalls.every(
            (event) => event.options.headers.Authorization === "Bearer secret-token",
          ),
        ).toBe(true);
        expect(
          assetCalls.every((event) => event.options.headers.Authorization === undefined),
        ).toBe(true);
        expect(JSON.stringify(fixture.events.map((event) => event.url))).not.toContain(
          "secret-token",
        );
      });
    },
  );

  it("rejects an upstream source pin mismatch", async () => {
    await withTempDirectory(async (cwd) => {
      const fixture = createFixture({ mismatchedResultsPin: true });
      await expect(
        resolveReleases({
          cwd,
          env: { BACKEND_RELEASE_TAG: tags.backend },
          fetchImpl: fixture.fetchImpl,
          logger: () => {},
        }),
      ).rejects.toThrow(/results source commit does not match backend pin/);
    });
  });
});
