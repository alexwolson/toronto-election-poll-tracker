import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

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
  // The ward ballot pages are gone (Alex, 2026-10-20): a shared link opens that ward's council
  // race on the dashboard.
  async redirects() {
    return [{ source: "/results/:ward(\\d{1,2})", destination: "/results/?race=council&open=councillor-:ward", permanent: false }];
  },
};

export default nextConfig;
