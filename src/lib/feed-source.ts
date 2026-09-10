/**
 * Server-only feed source resolution (spec §Data layer). Runs at build time in
 * the static export. Reads a local fixtures dir when FEED_LOCAL_DIR is set
 * (development fixtures or release-resolution output). The API and legacy
 * GitHub-raw paths are compatibility fallbacks for development only. Production
 * runs `npm run vercel-build`, which resolves verified releases into
 * `.release-data` and sets FEED_LOCAL_DIR for the static build.
 *
 * Only import this from server components — it touches the filesystem.
 */

const DATA_REVISION = process.env.NEXT_PUBLIC_DATA_REVISION?.trim() || "main";
const DATA_BASE_URL = `https://raw.githubusercontent.com/alexwolson/toronto-election-poll-tracker-data/${DATA_REVISION}/data/processed`;

function dataUrl(file: string): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/${file}`;
  }
  return `${DATA_BASE_URL}/${file}`;
}

async function readRaw(file: string): Promise<unknown> {
  const localDir = process.env.FEED_LOCAL_DIR;
  if (localDir) {
    // Dev/preview only: imported dynamically so production (URL) builds never
    // pull node:fs into the trace.
    const { readFile } = await import("node:fs/promises");
    const { resolve } = await import("node:path");
    const normalizedDir = localDir.replace(/^\.\//, "").replace(/\/$/, "");
    if (normalizedDir !== "fixtures" && normalizedDir !== ".release-data") {
      throw new Error(`unsupported FEED_LOCAL_DIR: ${localDir}`);
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

function feedSource(file: string): string {
  const localDir = process.env.FEED_LOCAL_DIR;
  if (localDir) {
    return `${localDir.replace(/\/$/, "")}/${file}`;
  }
  const url = new URL(dataUrl(file));
  url.username = "";
  url.password = "";
  url.search = "";
  url.hash = "";
  return url.toString();
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function feedFallbacksAllowed(
  env: Partial<Record<"NODE_ENV" | "FEED_LOCAL_DIR", string | undefined>> = process.env,
): boolean {
  const localDir = env.FEED_LOCAL_DIR?.replace(/^\.\//, "").replace(/\/$/, "");
  return localDir === "fixtures" || env.NODE_ENV === "development" || env.NODE_ENV === "test";
}

/**
 * Load and validate a publication feed. Explicit development/test modes fall
 * back to an honest unavailable state; release and production builds delegate
 * to the required-feed path and fail closed.
 */
export async function loadFeed<T>(
  file: string,
  validate: (value: unknown) => T | null,
  fallback: T,
): Promise<T> {
  if (!feedFallbacksAllowed()) {
    return loadRequiredFeed(file, validate);
  }
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
  const source = feedSource(file);
  let raw: unknown;
  try {
    raw = await readRaw(file);
  } catch (error) {
    throw new Error(
      `required feed ${file} from ${source} could not be read: ${errorMessage(error)}`,
      { cause: error },
    );
  }
  let value: T | null;
  try {
    value = validate(raw);
  } catch (error) {
    throw new Error(
      `required feed ${file} from ${source} validation failed: ${errorMessage(error)}`,
      { cause: error },
    );
  }
  if (value === null) {
    throw new Error(`required feed ${file} from ${source} failed schema or semantic validation`);
  }
  return value;
}
