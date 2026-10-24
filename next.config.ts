import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { raceHref, WARD_NAMES } from "./src/lib/race-links";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: { root: projectRoot },
  // No static export: `/live/results.json` is an ISR route (election-night
  // branch, #17 S8). Every page still prerenders at build time, reading the feeds
  // then. Leave `cacheComponents` off: it rejects the `dynamicParams` exports.
  // Unoptimized images keep billable Image Optimization off.
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.toronto.ca",
        pathname: "/wp-content/uploads/2026/**",
      },
    ],
  },
  // Clean `/wards/` paths. Paths with a file extension are exempt, so
  // `/live/results.json` serves directly.
  trailingSlash: true,
  // Each race has its own page (results redesign, Alex, 2026-10-24): an old ward ballot link
  // (/results/4/) or an old dashboard link (/results/?race=council&open=councillor-4) opens it.
  async redirects() {
    const wards = WARD_NAMES.map((_, i) => String(i + 1));
    const open = (value: string) => [{ type: "query" as const, key: "open", value }];
    return [
      ...wards.map((n) => ({ source: `/results/${n}`, destination: raceHref(`councillor-${n}`), permanent: false })),
      ...wards.map((n) => ({ source: "/results", has: open(`councillor-${n}`), destination: raceHref(`councillor-${n}`), permanent: false })),
      { source: "/results", has: open("(?<board>tdsb|tcdsb)-(?<area>\\d{1,2})"), destination: "/:board/:area/", permanent: false },
      { source: "/results", has: open("(?<race>(?:viamonde|monavenir)-\\d{1,2})"), destination: "/conseils-scolaires/#:race", permanent: false },
    ];
  },
};

export default nextConfig;
