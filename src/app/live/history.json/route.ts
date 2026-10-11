/**
 * `/live/history.json`: the count over the night, for the results pages' Map and Count
 * views (live-projection #102, #103). ISR as `/live/results.json`, and like it every
 * failure throws so the last good copy keeps serving. The page polls it only while one of
 * those views is open, so a longer revalidate than the payload's is enough.
 */

import { Redis } from "@upstash/redis";
import { devFixture, devFixtureDir } from "@/lib/live-dev-fixture";
import { serveHistory } from "@/lib/live-history";
import { SWITCHES, switchesFrom } from "@/lib/live-serve";

export const dynamic = "force-static";
export const revalidate = 60;

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`live: ${name} is not set`);
  return value;
}

async function stored(): Promise<{ entries: string[]; flags: (string | null)[] }> {
  const dir = devFixtureDir();
  if (dir !== null) {
    const entries = JSON.parse((await devFixture(dir, "history.json")) ?? "[]") as unknown[];
    return { entries: entries.map((entry) => JSON.stringify(entry)), flags: [] };
  }
  const redis = new Redis({
    url: requiredEnv("KV_REST_API_URL"),
    token: requiredEnv("KV_REST_API_READ_ONLY_TOKEN"),
    automaticDeserialization: false,
  });
  const [entries, flags] = await Promise.all([
    redis.lrange<string>("history", 0, -1),
    redis.mget<(string | null)[]>(...SWITCHES.map((name) => `switch:${name}`)),
  ]);
  return { entries, flags };
}

export async function GET(): Promise<Response> {
  const { entries, flags } = await stored();
  return Response.json(serveHistory({ entries, switches: switchesFrom(flags) }));
}
