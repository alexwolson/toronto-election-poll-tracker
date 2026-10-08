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
};

export default nextConfig;
