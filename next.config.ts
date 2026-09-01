import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: { root: projectRoot },
  // Static export (spec §Static export): `next build` emits an `out/` of
  // HTML/CSS/JS. Server components render at build time, reading the feeds then.
  output: "export",
  // next/image's default loader needs a server; a static export must opt out.
  images: { unoptimized: true },
  // Emit `/wards/index.html` etc. so any static host serves clean paths.
  trailingSlash: true,
};

export default nextConfig;
