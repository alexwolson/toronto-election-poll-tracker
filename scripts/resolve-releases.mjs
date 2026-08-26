import { createHash } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const producers = {
  backend: "alexwolson/toronto-election-poll-tracker-backend",
  results: "alexwolson/toronto-election-results",
  polling: "alexwolson/toronto-election-poll-tracker-data",
};
const output = resolve(process.cwd(), ".release-data");

function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

async function githubJson(path) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "toronto-election-build" },
  });
  if (!response.ok) throw new Error(`GitHub ${path}: ${response.status}`);
  return response.json();
}

async function download(url) {
  const response = await fetch(url, { headers: { "User-Agent": "toronto-election-build" } });
  if (!response.ok) throw new Error(`download ${url}: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function release(repo, tag = null) {
  const suffix = tag ? `/tags/${encodeURIComponent(tag)}` : "/latest";
  const metadata = await githubJson(`/repos/${repo}/releases${suffix}`);
  if (metadata.draft || metadata.prerelease) throw new Error(`${repo} release is not stable`);
  const manifestAsset = metadata.assets.find((asset) => asset.name === "release_manifest.json");
  if (!manifestAsset) throw new Error(`${repo}@${metadata.tag_name} has no release manifest`);
  const manifestBytes = await download(manifestAsset.browser_download_url);
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  if (manifest.repository !== repo) throw new Error(`${repo} manifest repository mismatch`);
  return { metadata, manifest, manifestBytes };
}

async function asset(releaseData, filename) {
  const record = releaseData.manifest.assets.find((item) => item.filename === filename);
  const remote = releaseData.metadata.assets.find((item) => item.name === filename);
  if (!record || !remote) throw new Error(`missing release asset ${filename}`);
  const bytes = await download(remote.browser_download_url);
  if (sha256(bytes) !== record.sha256) throw new Error(`checksum mismatch for ${filename}`);
  return bytes;
}

const backend = await release(producers.backend);
const pins = backend.manifest.dependencies;
if (pins.results.repository !== producers.results || pins.polling.repository !== producers.polling) {
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

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const feeds = [
  [backend, backend.manifest.feeds.mayoral_forecast],
  [backend, backend.manifest.feeds.council_race_cards],
  [results, results.manifest.feeds.mayoral_candidates],
  [polling, polling.manifest.feeds.mayoral_polling],
];
for (const [producer, filename] of feeds) {
  await writeFile(resolve(output, filename), await asset(producer, filename));
}
const sources = {
  schema_version: 1,
  resolved_at: new Date().toISOString(),
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
await mkdir(resolve(process.cwd(), "public/data"), { recursive: true });
await writeFile(resolve(process.cwd(), "public/data/source-manifest.json"), sourceJson);
console.log(
  `Resolved ${backend.metadata.tag_name} with Results ${results.metadata.tag_name} and Polling ${polling.metadata.tag_name}`,
);
