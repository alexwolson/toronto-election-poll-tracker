# Toronto Election Poll Tracker

Static Next.js frontend for Toronto's 2026 municipal election guide. Production
builds consume checksum-verified Results, Polling, and Backend GitHub Releases.

## Getting Started

Install dependencies and run against the committed development fixtures:

```bash
npm ci
FEED_LOCAL_DIR=./fixtures npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Run `npm test`, `npm run lint`, and `npm run build` before opening a pull request.
Fixtures are development/test artifacts and are never promoted to production.

For a design preview intended to reflect the current election, read the live
site's `/data/source-manifest.json`, then resolve its exact Backend tag with
`BACKEND_RELEASE_TAG=backend-YYYY-MM-DD.N npm run vercel-build`, then `npm start`.
This verifies and consumes the complete pinned release chain. A fixture preview
can omit newer polls and other released information; use it only for deliberate
offline or test scenarios. See the release guide below for provenance checks.

## Production deployment

Do not deploy with a raw-GitHub URL or `NEXT_PUBLIC_DATA_REVISION`. Follow
[the production release guide](docs/v2-release.md) to resolve the immutable
release chain, verify its source manifest, deploy through Vercel, and roll back.
