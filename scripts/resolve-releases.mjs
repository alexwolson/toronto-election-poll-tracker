import { createHash } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const producers = {
  backend: "alexwolson/toronto-election-poll-tracker-backend",
  results: "alexwolson/toronto-election-results",
  polling: "alexwolson/toronto-election-poll-tracker-data",
};
const backendTagPattern = /^backend-\d{4}-\d{2}-\d{2}\.\d+$/;

function requireBackendTag(tag, variableName) {
  if (!backendTagPattern.test(tag)) {
    throw new Error(
      `${variableName} must match backend-YYYY-MM-DD.N; received ${JSON.stringify(tag)}`,
    );
  }
  return tag;
}

function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

export function backendSelection(env) {
  const tag = env.BACKEND_RELEASE_TAG?.trim();
  const mode = env.BACKEND_RELEASE_MODE?.trim();
  if (tag && mode) {
    throw new Error("Set BACKEND_RELEASE_TAG or BACKEND_RELEASE_MODE, not both");
  }
  if (tag) return { tag: requireBackendTag(tag, "BACKEND_RELEASE_TAG") };
  if (mode === "latest") return { tag: null };
  if (mode) throw new Error("BACKEND_RELEASE_MODE must be 'latest'");
  throw new Error(
    "Set BACKEND_RELEASE_TAG to an exact release, or deliberately set " +
      "BACKEND_RELEASE_MODE=latest",
  );
}

export function validateProductionIntent(env, selection) {
  if (env.VERCEL_ENV !== "production") return;
  if (!selection.tag) {
    throw new Error("Vercel Production builds require an exact BACKEND_RELEASE_TAG");
  }
  const intent = env.DEPLOY_BACKEND_RELEASE_TAG?.trim();
  if (!intent) {
    throw new Error(
      "Vercel Production build is missing DEPLOY_BACKEND_RELEASE_TAG; " +
        "use npm run deploy:production -- backend-YYYY-MM-DD.N",
    );
  }
  requireBackendTag(intent, "DEPLOY_BACKEND_RELEASE_TAG");
  if (intent !== selection.tag) {
    throw new Error(
      `Production release intent ${intent} does not match configured ` +
        `BACKEND_RELEASE_TAG ${selection.tag}`,
    );
  }
}

export async function resolveReleases({
  cwd = process.cwd(),
  env = process.env,
  fetchImpl = fetch,
  logger = console.log,
  now = () => new Date(),
} = {}) {
  const output = resolve(cwd, ".release-data");
  const token = (env.GH_TOKEN || env.GITHUB_TOKEN)?.trim();

  async function githubJson(path) {
    const headers = {
      Accept: "application/vnd.github+json",
      "User-Agent": "toronto-election-build",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetchImpl(`https://api.github.com${path}`, { headers });
    const rateLimited =
      response.status === 429 ||
      (response.status === 403 &&
        response.headers.get("x-ratelimit-remaining") === "0");
    if (rateLimited) {
      throw new Error(
        `GitHub API rate limit exceeded for ${path}; configure GH_TOKEN or GITHUB_TOKEN`,
      );
    }
    if (!response.ok) throw new Error(`GitHub ${path}: ${response.status}`);
    return response.json();
  }

  async function download(url) {
    const response = await fetchImpl(url, {
      headers: { "User-Agent": "toronto-election-build" },
    });
    if (!response.ok) throw new Error(`download ${url}: ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  }

  async function release(repo, tag = null) {
    const suffix = tag ? `/tags/${encodeURIComponent(tag)}` : "/latest";
    const metadata = await githubJson(`/repos/${repo}/releases${suffix}`);
    if (metadata.draft || metadata.prerelease) {
      throw new Error(`${repo} release is not stable`);
    }
    if (tag && metadata.tag_name !== tag) {
      throw new Error(`${repo} returned unexpected release ${metadata.tag_name}`);
    }
    const manifestAsset = metadata.assets.find(
      (candidate) => candidate.name === "release_manifest.json",
    );
    if (!manifestAsset) {
      throw new Error(`${repo}@${metadata.tag_name} has no release manifest`);
    }
    const manifestBytes = await download(manifestAsset.browser_download_url);
    const manifest = JSON.parse(manifestBytes.toString("utf8"));
    if (manifest.repository !== repo) {
      throw new Error(`${repo} manifest repository mismatch`);
    }
    return { metadata, manifest, manifestBytes };
  }

  async function asset(releaseData, filename) {
    const record = releaseData.manifest.assets.find((item) => item.filename === filename);
    const remote = releaseData.metadata.assets.find((item) => item.name === filename);
    if (!record || !remote) throw new Error(`missing release asset ${filename}`);
    const bytes = await download(remote.browser_download_url);
    if (sha256(bytes) !== record.sha256) {
      throw new Error(`checksum mismatch for ${filename}`);
    }
    return bytes;
  }

  const selection = backendSelection(env);
  validateProductionIntent(env, selection);
  const backend = await release(producers.backend, selection.tag);
  const pins = backend.manifest.dependencies;
  if (
    pins.results.repository !== producers.results ||
    pins.polling.repository !== producers.polling
  ) {
    throw new Error("backend release pins unexpected producer repositories");
  }
  const [results, polling] = await Promise.all([
    release(producers.results, pins.results.release),
    release(producers.polling, pins.polling.release),
  ]);
  for (const [name, upstream] of [
    ["results", results],
    ["polling", polling],
  ]) {
    const pin = pins[name];
    if (pin.source_commit !== upstream.manifest.source_commit) {
      throw new Error(`${name} source commit does not match backend pin`);
    }
    if (pin.manifest_sha256 !== sha256(upstream.manifestBytes)) {
      throw new Error(`${name} manifest does not match backend pin`);
    }
  }
  const pollingResultsPin = polling.manifest.dependencies.results;
  if (
    pollingResultsPin.release !== pins.results.release ||
    pollingResultsPin.source_commit !== results.manifest.source_commit ||
    pollingResultsPin.manifest_sha256 !== sha256(results.manifestBytes)
  ) {
    throw new Error("Polling release does not pin the selected Results release");
  }

  logger(
    `Resolved ${backend.metadata.tag_name} with Results ${results.metadata.tag_name} ` +
      `and Polling ${polling.metadata.tag_name}`,
  );

  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  const feeds = [
    [backend, backend.manifest.feeds.mayoral_forecast],
    [backend, backend.manifest.feeds.council_race_cards],
    [backend, backend.manifest.feeds.trustee_race_cards],
    [results, results.manifest.feeds.mayoral_candidates],
    [polling, polling.manifest.feeds.mayoral_polling],
  ];
  for (const [producer, filename] of feeds) {
    await writeFile(resolve(output, filename), await asset(producer, filename));
  }
  const sources = {
    schema_version: 1,
    resolved_at: now().toISOString(),
    generated_at: backend.manifest.generated_at,
    releases: {
      backend: {
        repository: producers.backend,
        release: backend.metadata.tag_name,
        source_commit: backend.manifest.source_commit,
      },
      results: {
        repository: producers.results,
        release: results.metadata.tag_name,
        source_commit: results.manifest.source_commit,
      },
      polling: {
        repository: producers.polling,
        release: polling.metadata.tag_name,
        source_commit: polling.manifest.source_commit,
      },
    },
  };
  const sourceJson = `${JSON.stringify(sources, null, 2)}\n`;
  await writeFile(resolve(output, "source_manifest.json"), sourceJson);
  await writeFile(resolve(output, "manifest.json"), sourceJson);
  await mkdir(resolve(cwd, "public/data"), { recursive: true });
  await writeFile(resolve(cwd, "public/data/source-manifest.json"), sourceJson);
  return sources;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) await resolveReleases();
