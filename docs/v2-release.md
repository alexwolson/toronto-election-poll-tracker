# Production Release and Deployment

Production is a four-repository release chain:

`Results release -> Polling release -> Backend release -> Frontend deployment`

Results owns canonical people, contests, and election facts. Polling pins one
Results release. Backend pins that Polling release and the same Results release.
The frontend resolves the latest stable Backend release during
`npm run vercel-build`, verifies both upstream pins and all downloaded feed
checksums, and embeds the feeds in the static build. Never promote `fixtures/`,
`fixtures-preview/`, a branch name, or a raw-GitHub URL to production.

For a new 2026 mayoral poll, follow the complete
[poll ingestion and release runbook](https://github.com/alexwolson/toronto-election-poll-tracker-data/blob/main/docs/runbooks/add-2026-mayoral-poll.md).

## Access and preflight

Use clean, up-to-date `main` checkouts. GitHub CLI must be authenticated with
`gh auth login` or `GH_TOKEN`; Vercel CLI must be logged in and linked to the
`toronto-election-poll-tracker` project, or use `VERCEL_TOKEN`.

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
npm run vercel-build
jq . .release-data/source_manifest.json
```

The build must print the intended Backend, Polling, and Results tags. Confirm the
same tags and source commits in `source_manifest.json`. The resolver currently
selects the latest stable Backend release, so abort if a concurrent release wins
that lookup. Do not edit `.release-data/` or copy its contents into fixtures.

Before promotion, inspect the static build at `/`, `/polls/`, `/candidates/`,
`/wards/`, and `/how-it-works/`. A poll release also requires checking the latest
poll metadata and shares, forecast evidence date, and any changed forecast band.

## Deploy and smoke test

```bash
vercel --prod
```

After Vercel reports `READY`, verify the production alias at:

- `/`
- `/polls`
- `/candidates`
- `/wards`
- `/how-it-works`
- `/data/source-manifest.json`

The public source manifest must name the same three-release chain inspected
before deployment. Record the Vercel deployment URL in the release notes or PR.

## Rollback

Promote the prior known-good Vercel production deployment. Do not overwrite
GitHub Release assets or reuse a Results, Polling, or Backend tag. If producer
data was wrong, publish corrected artifacts under new tags, rebuild Backend with
the corrected pins, then run the frontend preflight and deployment again.

## Local feed options

- `FEED_LOCAL_DIR=./fixtures npm run dev` uses committed development fixtures.
- `npm run vercel-build` generates and consumes `.release-data/`, the only local
  directory used for a production build.
- `NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev` may target a local
  development feed server when `FEED_LOCAL_DIR` is unset.

`NEXT_PUBLIC_DATA_REVISION` and raw-GitHub commit/branch deployment are retired.
Older documents under `docs/superpowers/` are historical design records, not
current operator instructions.
