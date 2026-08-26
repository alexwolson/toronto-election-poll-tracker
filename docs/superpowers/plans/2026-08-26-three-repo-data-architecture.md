# Three-Repository Data Architecture Implementation Plan

**Design:** `docs/superpowers/specs/2026-08-26-three-repo-data-architecture-design.md`

**Goal:** Make results, polling, and backend independent GitHub Release producers
with canonical cross-repository identifiers, while keeping the frontend limited
to validated presentation.

**Target repositories:**

- `toronto-election-results`
- `toronto-election-poll-tracker-data` (polling)
- `toronto-election-poll-tracker-backend` (new)
- `toronto-election-poll-tracker` (frontend)

## Working rules

- Work in separate branches and PRs for each repository.
- Do not deploy until all three stable data releases exist.
- Never consume an independently latest results or polling release in production;
  the backend release pins the coherent source set.
- Preserve source commit, upstream releases, schemas, and checksums in every
  manifest.
- Keep current production working until the coordinated `vercel --prod` cutover.
- Preserve relevant history when moving production code into backend.

## Phase 0: Reconcile current work

### Task 0.1: Preserve the frontend candidate-page work

Repository: `toronto-election-poll-tracker`

- Keep the public candidates page and shared candidate-history presentation.
- Keep `Incumbent Mayor` and `Returning` metadata plus 2023 placement/vote-share
  details.
- Change only its eventual feed source; do not move factual derivation into the
  frontend.
- Add focused rendering tests once the results feed contract is final.

### Task 0.2: Supersede the candidate-feed data PR

Repository: `toronto-election-poll-tracker-data`

- Do not merge the current candidate-feed PR as the long-term implementation.
- Remove the unfinished alias-vendoring patch before beginning the polling-only
  branch.
- Retain any reusable feed-schema decisions in the results implementation.
- Close or clearly supersede the PR only after the replacement results PR exists.

### Task 0.3: Inventory code and data ownership

Create a migration table for every current top-level pipeline, raw input,
processed artifact, test group, ADR, and research document:

- results;
- polling;
- backend production;
- backend `research/`;
- frontend; or
- obsolete.

Commit the inventory with the backend bootstrap work so no production generator
is silently lost.

## Phase 1: Results release producer

### Task 1.1: Define the results release manifest

Repository: `toronto-election-results`

Add a schema-versioned manifest contract containing:

- release schema version;
- generated timestamp;
- source commit;
- election-data schema versions;
- asset filenames and SHA-256 checksums;
- certified/current field metadata; and
- coverage and validation summary.

Test deterministic serialization, checksum verification, missing assets, and
unsupported manifest versions.

### Task 1.2: Package canonical release assets

Package the canonical production tables required downstream, including people,
candidacies/person links, events, contests, districts, results, and incumbency.
Prefer existing canonical CSV/Parquet outputs; do not create a second identity
representation solely for consumers.

Add validation that every referenced identifier exists and that deprecated person
IDs resolve to one active canonical person.

### Task 1.3: Move factual candidate-feed generation into results

Generate `mayoral_candidates.json` from canonical 2026 candidacies and linked
historical results. The feed must:

- contain all 53 certified candidates exactly once;
- retain official 2026 display names;
- expose canonical `person_id` and `candidacy_id` directly;
- mark Olivia Chow as incumbent from canonical incumbency;
- include confirmed histories without downstream name matching; and
- connect Edward Gong to the Xiao Hua Gong and Xiaohua Gong candidacies through
  the canonical person link.

Add equivalent factual field outputs needed for council pages, or expose a
canonical contract from which backend can generate derived council cards without
name matching.

### Task 1.4: Add results release automation

Provide one documented manual release command that:

1. requires a clean working tree;
2. runs tests and validation;
3. builds `dist/` from scratch;
4. creates the manifest and checksums;
5. creates an immutable stable GitHub Release; and
6. uploads all assets.

Support a dry run that builds and validates without creating a release. Reject an
existing tag rather than overwriting it.

### Task 1.5: Publish and verify the first results release

- Download the release assets into a clean temporary directory.
- Verify checksums and schemas from the downloaded copy.
- Record the stable tag for polling migration.

Rollback point: the existing repositories remain unchanged consumers until this
release passes.

## Phase 2: Polling-only data repository

### Task 2.1: Define the polling release contract

Repository: `toronto-election-poll-tracker-data`

Define cleaned tables for poll documents, samples, readings, responses, and ward
readings. Named responses reference canonical `person_id`; they also reference
`contest_id` and `candidacy_id` when applicable. Controlled non-person options use
explicit response-option IDs.

The polling manifest records:

- its source commit and schemas;
- the exact results release used for validation;
- asset checksums;
- poll/source coverage; and
- validation summaries.

### Task 2.2: Replace local candidate mappings with canonical IDs

- Add a results-release client with local-fixture and downloaded-release modes.
- Migrate existing mayoral and ward response mappings to canonical IDs.
- Validate every named ID against the pinned results release.
- Fail on unknown, deprecated, ambiguous, or contest-incompatible identifiers.
- Preserve printed poll labels as source evidence, separate from canonical display
  names.

### Task 2.3: Remove non-polling responsibilities

After equivalent backend/results implementations exist, remove:

- candidate registration fetching;
- canonical-results vendoring;
- downstream identity/name matching;
- historical result reconstruction not required for poll extraction;
- model fitting and forecast generation;
- council defeatability and derived race-card generation; and
- combined frontend publication manifests.

Retain source documents, ingest tools, poll validation, cleaned polling tables,
and factual polling-feed generation.

### Task 2.4: Add polling release automation

Mirror the results release guarantees: clean tree, tests, fresh `dist/`, manifest,
checksums, immutable tag, uploaded assets, and post-upload verification.

### Task 2.5: Publish the first polling release

Build against the stable results tag from Task 1.5. Verify from downloaded assets
that the manifest pins that exact results release.

Rollback point: do not remove the old data-repo production feeds until backend
and frontend cutover tests pass.

## Phase 3: Backend repository

### Task 3.1: Create `toronto-election-poll-tracker-backend`

Create the new repository from the current data-repository history so modelling
commits remain traceable. Remove polling-only paths after the copy rather than
starting with history-free copied files.

Import the relevant `defeatability-index` history into a dedicated subtree before
consolidating its production package. Document the history-preservation procedure
and verify representative commits remain reachable.

### Task 3.2: Establish backend package boundaries

Organize production code into focused packages for:

- upstream release acquisition and verification;
- shared canonical models;
- mayoral modelling and qualification;
- council defeatability and historical signals;
- derived feed builders; and
- backend release packaging.

Move investigations and scripts without production consumers into `research/`.
Production builds must not import from `research/`.

### Task 3.3: Replace vendored/local joins with release inputs

Add input modes for:

- exact downloaded GitHub Releases; and
- explicit sibling `dist/` directories for local development.

Verify manifests and checksums before parsing. Join only by canonical IDs. Remove
candidate-name identity resolution and implicit fuzzy joins from production code.

### Task 3.4: Migrate mayoral modelling

Move current polling selection, model qualification, fitting, evaluation, and
forecast publication. Preserve existing evidence gates and deterministic fixtures.
Update inputs to use canonical people/candidacy/contest IDs.

### Task 3.5: Migrate council defeatability and derived cards

Move production defeatability methodology and supported historical signals from
`defeatability-index`, plus council card composition from the current data repo.
Use canonical current fields, incumbency, districts, and histories from results;
use ward polls from polling.

Keep research diagnostics under `research/`, with an explicit promotion process
for outputs that become production consumables.

### Task 3.6: Define backend outputs and coherent release manifest

Publish only derived/modelled artifacts, including mayoral forecasts, council
race cards, evidence availability, and analytical publication summaries.

The backend manifest pins exact stable results and polling releases and includes
their manifest checksums alongside its own assets and source commit.

### Task 3.7: Add backend release automation

Require clean inputs, exact upstream release tags, passing model/contract gates,
fresh output generation, checksums, immutable release creation, and downloaded
release verification.

### Task 3.8: Publish the first coherent backend release

Build against the stable results and polling releases from Phases 1 and 2. Verify
the manifest contains those exact pins and all derived feeds render against their
contract fixtures.

## Phase 4: Frontend release consumption

### Task 4.1: Define frontend source configuration

Repository: `toronto-election-poll-tracker`

Support two explicit modes:

- local sibling `dist/` directories; and
- production GitHub Release discovery.

Production discovers the latest stable backend release only. It then obtains the
exact results and polling tags from the backend manifest.

### Task 4.2: Implement release discovery and verification

- Ignore drafts and prereleases.
- Resolve one backend release at build start and hold it fixed for the build.
- Download its pinned results and polling assets.
- Verify manifest schemas and every checksum.
- Cache assets only by immutable repository/tag/filename keys.
- Fail the production build on discovery, network, checksum, schema, or
  compatibility failure.

Local mode may show existing honest fallback states with clear warnings.

### Task 4.3: Route feeds to their owners

- Candidate fields/histories and other factual election feeds: results release.
- Mayoral and ward polling feeds: polling release.
- Forecasts, defeatability outputs, and derived race cards: backend release.

Keep frontend transformations presentational only. Remove any identity matching,
cross-feed joining, smoothing, or factual derivation discovered during migration.

### Task 4.4: Embed deployment provenance

Generate a static deployment-source manifest containing the resolved release tags,
source commits, schema versions, and checksums. Make it available for debugging
without exposing secrets.

### Task 4.5: Complete the candidates page

Adapt the current candidates page to the results-owned feed. Verify:

- 53 certified candidates;
- canonical histories, including Edward Gong;
- `Incumbent Mayor` for Olivia Chow;
- `Returning` for all other confirmed 2023 mayoral candidates; and
- 2023 placement and vote-share details, using `<0.1%` where appropriate.

## Phase 5: Integrated verification and cutover

### Task 5.1: Test the clean release path

In clean temporary checkouts:

1. download the stable backend release;
2. resolve its pinned results and polling releases;
3. verify every manifest and checksum;
4. build the frontend in production mode; and
5. run page-level smoke checks for mayor, candidates, polls, wards, and
   methodology.

### Task 5.2: Test local sibling mode

Build all three producer `dist/` directories locally, point the frontend at them,
and confirm it renders the same contract versions without network access.

### Task 5.3: Review repository removals

Confirm each removed generator exists in its new owner and each retained file has
one production purpose. Search for old raw-GitHub data URLs, local name mappings,
candidate registration fetches, and imports from retired packages.

### Task 5.4: Merge and release in dependency order

1. Merge and release results.
2. Merge and release polling against that results release.
3. Merge and release backend against those exact releases.
4. Merge the frontend release-consumer and candidates-page changes.

### Task 5.5: Deploy manually

- Run the frontend production build locally once.
- Confirm the resolved coherent release set.
- Run `vercel --prod`.
- Verify the deployed source manifest and primary pages.

### Task 5.6: Retire superseded paths and repositories

After production verification:

- archive or clearly mark `defeatability-index` as migrated;
- remove obsolete processed feeds from the polling repo;
- close superseded PRs with links to replacement work; and
- update architecture documentation in all repositories.

## Rollback

The previous Vercel deployment remains the immediate frontend rollback. GitHub
Releases are immutable and retained. If a new coherent release set is defective,
publish a corrected backend release pinned to known-good source releases or
redeploy the prior frontend deployment. Do not mutate or replace existing release
assets.
