/**
 * `/live/results.json`: the night's payload from the store (#17 § Route; research
 * 05 in toronto-election-live-projection).
 *
 * ISR with request collapsing: `force-static` is required, because the Upstash
 * client fetches with `no-store`, which on its own makes the route dynamic. Every
 * failure throws, so ISR keeps serving the last good 200; a non-200 would be
 * cached. That includes the build's prerender, so the store must hold a payload
 * and a heartbeat before any build.
 */

import { Redis } from "@upstash/redis";
import { serveLive } from "@/lib/live-serve";

export const dynamic = "force-static";
export const revalidate = 15;

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`live: ${name} is not set`);
  return value;
}

export async function GET(): Promise<Response> {
  const redis = new Redis({
    url: requiredEnv("KV_REST_API_URL"),
    // The route only reads.
    token: requiredEnv("KV_REST_API_READ_ONLY_TOKEN"),
    // Raw strings: the validator, not the client, decides what the bytes mean.
    automaticDeserialization: false,
  });
  // One call: the payload and both heartbeats (docs/store.md).
  const [payload, fly, digitalOcean] = await redis.mget<(string | null)[]>(
    "payload",
    "heartbeat:fly",
    "heartbeat:do",
  );
  return Response.json(serveLive({ payload, heartbeats: [fly, digitalOcean] }));
}
