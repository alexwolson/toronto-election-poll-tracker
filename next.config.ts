import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: { root: projectRoot },
  // A static export since the election ended (2026-10-28): the feeds are the committed
  // `.release-data`, and the final count is the committed `public/live/*.json`. Leave
  // `cacheComponents` off: it rejects the `dynamicParams` exports.
  // Unoptimized images keep billable Image Optimization off.
  output: "export",
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
  // The old results links' redirects live in vercel.json: a static export can't carry them.
};

export default nextConfig;
