/**
 * Local development only: `LIVE_DEV_FIXTURE_DIR` makes the live routes read the store's
 * values from files instead of Upstash, so the results pages can be built and seen
 * without touching a Rehearsal store another test may be using. Ignored in production
 * builds, which includes every Vercel preview.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

/** The fixture directory, or null outside `next dev` or when unset. */
export function devFixtureDir(): string | null {
  if (process.env.NODE_ENV === "production") return null;
  return process.env.LIVE_DEV_FIXTURE_DIR || null;
}

/** A file's text from the fixture directory, or null when it's missing. */
export async function devFixture(dir: string, name: string): Promise<string | null> {
  try {
    return await readFile(path.join(dir, name), "utf8");
  } catch {
    return null;
  }
}
