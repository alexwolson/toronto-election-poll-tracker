import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This repository is standalone even when a parent directory has a lockfile.
  // An explicit root keeps Turbopack's resolver and filesystem watcher scoped.
  turbopack: { root: process.cwd() },
  // Static export (spec §Static export): `next build` emits an `out/` of
  // HTML/CSS/JS. Server components render at build time, reading the feeds then.
  output: "export",
  // next/image's default loader needs a server; a static export must opt out.
  images: { unoptimized: true },
  // Emit `/wards/index.html` etc. so any static host serves clean paths.
  trailingSlash: true,
};

export default nextConfig;
