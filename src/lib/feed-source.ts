/**
 * Server-only feed source resolution (spec §Data layer). Runs at build time in
 * the static export. Reads a local fixtures dir when FEED_LOCAL_DIR is set
 * (dev, against the certified fixture), else fetches the GitHub-raw base with
 * the NEXT_PUBLIC_API_URL override (production), mirroring the old app.
 *
 * Only import this from server components — it touches the filesystem.
 */

const LOCAL_DIR = process.env.FEED_LOCAL_DIR;
const DATA_REVISION = process.env.NEXT_PUBLIC_DATA_REVISION?.trim() || "main";
const DATA_BASE_URL = `https://raw.githubusercontent.com/alexwolson/toronto-election-poll-tracker-data/${DATA_REVISION}/data/processed`;

function dataUrl(file: string): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/${file}`;
  }
  return `${DATA_BASE_URL}/${file}`;
}

async function readRaw(file: string): Promise<unknown> {
  if (LOCAL_DIR) {
    // Dev/preview only: imported dynamically so production (URL) builds never
    // pull node:fs into the trace.
    const { readFile } = await import("node:fs/promises");
    const { resolve } = await import("node:path");
    const normalizedDir = LOCAL_DIR.replace(/^\.\//, "").replace(/\/$/, "");
    if (normalizedDir !== "fixtures" && normalizedDir !== ".release-data") {
      throw new Error(`unsupported FEED_LOCAL_DIR: ${LOCAL_DIR}`);
    }
    if (!/^[a-z0-9_]+\.json$/.test(file)) {
      throw new Error(`invalid feed filename: ${file}`);
    }
    // Local feeds are consumed only while producing the static export. Keeping
    // them out of the runtime trace prevents Turbopack from globbing the repo.
    const abs = resolve(
      /* turbopackIgnore: true */ process.cwd(),
      normalizedDir,
      file,
    );
    return JSON.parse(await readFile(abs, "utf8"));
  }
  const res = await fetch(
    dataUrl(file),
    process.env.NEXT_PUBLIC_API_URL
      ? { cache: "no-store" }
      : { next: { revalidate: 3600 } },
  );
  if (!res.ok) throw new Error(`fetch ${file}: ${res.status}`);
  return res.json();
}

/**
 * Load a feed, validate its shape, and fall back to a safe default on any
 * failure (missing file, network error, schema mismatch). The site degrades to
 * an honest "unavailable" rather than crashing the build.
 */
export async function loadFeed<T>(
  file: string,
  validate: (value: unknown) => T | null,
  fallback: T,
): Promise<T> {
  try {
    return validate(await readRaw(file)) ?? fallback;
  } catch {
    return fallback;
  }
}

/** Load a release-required feed. Invalid or missing release data is a build error,
 * because rendering a different contract would conceal a broken producer chain. */
export async function loadRequiredFeed<T>(
  file: string,
  validate: (value: unknown) => T | null,
): Promise<T> {
  const value = validate(await readRaw(file));
  if (value === null) throw new Error(`invalid required feed: ${file}`);
  return value;
}
