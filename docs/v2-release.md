# Production Release and Deployment

Production is a four-repository release chain:

`Results release -> Polling release -> Backend release -> Frontend deployment`

Results owns canonical people, contests, and election facts. Polling pins one
Results release. Backend pins that Polling release and the same Results release.
The frontend resolves the exact Backend release named by `BACKEND_RELEASE_TAG`
during `npm run vercel-build`, verifies both upstream pins and all downloaded
feed checksums, and embeds the feeds in the static build. Never promote
`fixtures/`, `fixtures-preview/`, a branch name, or a raw-GitHub URL to
production.

The resolver creates deployment source-manifest schema v2. For Backend,
Results, and Polling it records the immutable tag, source commit, release
manifest schema version, and SHA256 of the exact release-manifest bytes. For
each of the five deployed feeds it records the logical feed name, filename,
producer, feed schema version, and SHA256 of the exact downloaded bytes. The
resolver validates that complete shape against
`schemas/source-manifest.v2.schema.json` before the Next.js build starts, then
applies the producer-to-feed mapping checks that JSON Schema cannot express.

For a new 2026 mayoral poll, follow the complete
[poll ingestion and release runbook](https://github.com/alexwolson/toronto-election-poll-tracker-data/blob/main/docs/runbooks/add-2026-mayoral-poll.md).
The compact model publishes mayoral forecast feed schema 5, and Results publishes
the candidates feed at schema 6; both are independent of deployment
source-manifest schema v2. Its current-cycle model reading is
selected independently of the public archive reading. An ordinary poll update
does not require copying resolved feeds into fixtures or changing frontend code.

## Access and preflight

Use clean, up-to-date `main` checkouts. GitHub CLI must be authenticated with
`gh auth login` or `GH_TOKEN`; Vercel CLI must be logged in and linked to the
`toronto-election-poll-tracker` project, or use `VERCEL_TOKEN`.

The release resolver accepts `GH_TOKEN` first and `GITHUB_TOKEN` as a fallback
for authenticated GitHub API requests. Keep either token server-only: never use
a `NEXT_PUBLIC_` name, commit it, print it, or pass it as a command-line value.
For Vercel, store `GH_TOKEN` as a sensitive project environment variable for
Preview and Production under Project Settings. Store `BACKEND_RELEASE_TAG` in
the same environments and update it to the release being promoted. Never store
`DEPLOY_BACKEND_RELEASE_TAG`: the supported deployment wrapper supplies that
one-build intent only during a production promotion.

```bash
gh auth status
vercel whoami
git status --short
git fetch origin --prune
git rev-list --left-right --count HEAD...origin/main
npm ci
npm test
npm run lint
```

Stop if the tree is dirty or the revision count is not `0 0`. If the normal
checkout contains unrelated work, build and deploy from a clean temporary
worktree at `origin/main`.

## Resolve and verify releases

```bash
export BACKEND_RELEASE_TAG=backend-YYYY-MM-DD.N
unset BACKEND_RELEASE_MODE
npm run vercel-build
jq . .release-data/source_manifest.json
```

The build fails unless an exact tag is supplied. It must print the intended
Backend, Polling, and Results chain before downloading feeds. Confirm the same
tags, source commits, manifest hashes, and feed hashes in
`source_manifest.json`. `resolved_at` is when the frontend build resolved and
verified the chain; `backend_generated_at` is the generation time declared by
the selected Backend release. These timestamps describe different events and
must not be substituted for one another. Do not edit `.release-data/` or copy
its contents into fixtures.

Latest-stable discovery is retained only for deliberate inspection or recovery:

```bash
unset BACKEND_RELEASE_TAG
BACKEND_RELEASE_MODE=latest npm run vercel-build
```

Do not configure `BACKEND_RELEASE_MODE=latest` for Production. A production
deployment must use the exact Backend tag already verified during preflight.
That tag need not be GitHub's latest stable release.

Before promotion, inspect the static build at `/`, `/polls/`, `/candidates/`,
`/wards/`, and `/how-it-works/`. A poll release also requires checking the latest
poll metadata, denominator label and exact shares; forecast evidence date and
included samples; margin outcomes, vote ranges, win probabilities, uncertainty
breakdown and forecast history against the resolved schema-5 feed. History points
are recomputed with the current model by poll publication date, so a late release
of older fieldwork enters history on its publication date.

## Deploy and smoke test

Update the persistent Vercel Production `BACKEND_RELEASE_TAG` to the exact tag
verified above before running the wrapper (and Preview when previewing it).
Exporting the tag in a local shell does not update the Vercel project setting.
Ensure Production has no `BACKEND_RELEASE_MODE`; do not persist
`DEPLOY_BACKEND_RELEASE_TAG`.

`BACKEND_RELEASE_TAG` is a Sensitive variable, and `vercel env update` refuses to
change it ("You cannot change the key of a Sensitive Environment Variable").
Overwrite it in place instead, which keeps it Sensitive and leaves no window
without a value:

```bash
vercel env add BACKEND_RELEASE_TAG production --value backend-YYYY-MM-DD.N --sensitive --force --yes
```

Vercel answers "Overrode Environment Variable BACKEND_RELEASE_TAG". A Sensitive
value cannot be read back, so the production build's tag-intent check is what
confirms it: the build fails closed if the variable and the wrapper's tag differ.

```bash
npm run deploy:production -- "$BACKEND_RELEASE_TAG"
```

The wrapper requires a valid intended Backend tag and passes it to Vercel as
`DEPLOY_BACKEND_RELEASE_TAG` for that build only. The Production resolver rejects
a missing intent or a value that differs from the persistent
`BACKEND_RELEASE_TAG`. Consequently, running `vercel --prod` directly fails
closed instead of silently rebuilding an old configured release.

After Vercel reports `READY`, verify the production alias at:

- `/`
- `/polls`
- `/candidates`
- `/wards`
- `/how-it-works`
- `/data/source-manifest.json`

The public source manifest must name the same three-release chain, source commits,
manifest hashes and feed hashes inspected before deployment. Within the deployed
build it is byte-for-byte identical to `.release-data/source_manifest.json` and
`.release-data/manifest.json`. Vercel resolves the chain again during its build,
so its `resolved_at` can differ from local preflight; `backend_generated_at`
still comes from the pinned Backend release. Record the Vercel deployment URL in
the release notes or PR. Use the deployed manifest to establish the current
production chain before the next update; local producer `dist/` bundles and
`.release-data/` may be stale.

## Source-manifest compatibility

The frontend source-manifest reader and resolver move together. This version
requires source-manifest schema v2 and fails the build on schema v1 or an
incomplete v2 record. Existing deployments remain reproducible because their
static assets and schema v1 manifests are immutable; they do not need to be
rewritten. To roll back, promote the prior Vercel deployment. To move forward,
build the current frontend from its resolver so it generates and validates a
fresh schema v2 manifest from the pinned releases.

## Rollback

Promote the prior known-good Vercel production deployment. Do not overwrite
GitHub Release assets or reuse a Results, Polling, or Backend tag. If producer
data was wrong, publish corrected artifacts under new tags, rebuild Backend with
the corrected pins, then run the frontend preflight and deployment again. Before
the next forward deployment, set the persistent Vercel tag to the exact verified
Backend release being promoted.

## The live results route

On the `election-night` branch, `/live/results.json` serves the night's payload
from Upstash Redis, with ISR every 15 s. The functions run in `iad1` (`vercel.json`).
The Vercel Marketplace sets the route's two variables, `KV_REST_API_URL` and
`KV_REST_API_READ_ONLY_TOKEN`. Preview reads the Rehearsal store
(`election-rehearsal`) and Production reads the Night store (`election-night`).

The route prerenders during every build, and it throws, failing the build, unless
the store holds a `payload` of the pinned schema version (`LIVE_SCHEMA_VERSION`,
now 3) and at least one of `heartbeat:fly` and `heartbeat:do` (epoch milliseconds). The pipelines write these keys (`docs/store.md`
in toronto-election-live-projection). **Seed the store before any build that targets
it:** the Rehearsal store before a Preview, and the Night store before Production.
From that repo, with the store's `rediss://` URL in `REDIS_URL`:

```bash
uv run python -c '
import os, pathlib, time, redis
from election_night.store import Store, PIPELINES
client = redis.Redis.from_url(os.environ["REDIS_URL"])
store = Store(client)
print("stored:", store.publish(pathlib.Path("goldens/payload/before-results-2026.json").read_bytes()))
for name in PIPELINES: store.heartbeat(name, int(time.time() * 1000))
'
```

`publish` stores only a newer `seq` pair, so seeding never replaces a newer payload.
It also rejects an equal pair. After a schema bump, while the City's files keep the
pair already stored, `publish` can't store the new version: build the payload from
those same files with the bumped code, check that its pair equals `payload:seq`, and
`SET payload` directly (done for schemas 2 and 3 on the Rehearsal store, 2026-10-09).
To build locally against the Rehearsal store, pull its variables first:
`vercel env pull .env.rehearsal --environment=preview`, then
`set -a; . ./.env.rehearsal; set +a` before `npm run build`. Never commit that file.

## Local feed options

- `FEED_LOCAL_DIR=./fixtures npm run dev` uses committed development fixtures.
- `BACKEND_RELEASE_TAG=backend-YYYY-MM-DD.N npm run vercel-build` generates and
  consumes `.release-data/`, the only local directory used for a production build.
- `NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev` may target a local
  development feed server when `FEED_LOCAL_DIR` is unset.

All feeds resolved from `.release-data` are required production inputs. A missing
file, malformed JSON document, unsupported schema version, or failed semantic
validation stops the static build and reports the feed name and resolved source.
Fallback feeds are available only under `NODE_ENV=development`, `NODE_ENV=test`,
or the explicit `FEED_LOCAL_DIR=fixtures` development fixture mode.

`NEXT_PUBLIC_DATA_REVISION` and raw-GitHub commit/branch deployment are retired.
Older documents under `docs/superpowers/` are historical design records, not
current operator instructions.
