# Toronto Election Three-Repository Data Architecture

**Date:** 2026-08-26

## Purpose

Separate canonical election facts, polling observations, and modelling into three
independently released repositories with one shared identity contract. The
frontend consumes their published artifacts and performs presentation only.

This replaces the current arrangement in which
`toronto-election-poll-tracker-data` fetches candidate registrations, repeats
identity matching, vendors historical results, runs models, and assembles all
frontend feeds.

## Repository ownership

### `toronto-election-results`

The authoritative source for election facts:

- people and confirmed identity links;
- candidacies, contests, events, districts, and incumbency;
- certified current fields and completed historical outcomes; and
- factual frontend feeds, including `mayoral_candidates.json`.

It owns the canonical identifiers `person_id`, `candidacy_id`, `contest_id`,
`event_id`, and `district_id`. Downstream repositories do not infer identities
from names.

### `toronto-election-poll-tracker-data`

The polling repository:

- source documents and extraction provenance;
- cleaned and validated poll samples, readings, and responses;
- primarily mayoral polling plus the smaller collection of ward polls; and
- factual polling feeds for the frontend.

A named poll response uses `person_id`. It also uses `contest_id` and, when the
canonical candidacy exists, `candidacy_id`. Controlled non-person responses such
as `other`, `undecided`, and `would-not-vote` retain explicit response-option
identifiers.

The polling build validates all canonical identifiers against an exact published
results release.

### `toronto-election-poll-tracker-backend`

The production modelling repository:

- mayoral model inputs, qualification, fitting, and forecast publication;
- council defeatability and historical-signal production;
- derived council race cards and publication summaries;
- integration of exact results and polling releases; and
- a `research/` directory for investigations that do not produce production
  consumables.

The existing `defeatability-index` production work moves here. Research and
diagnostic work may remain under `research/`, but any code required to produce a
released artifact belongs in the production package and pipeline.

### `toronto-election-poll-tracker`

The frontend repository:

- page and component presentation;
- accessibility and responsive behaviour;
- defensive schema validation; and
- local and released-feed loading.

It does not resolve identities, join raw datasets, calculate candidate status,
smooth polls, run models, or derive factual labels from raw election records.

## Release contracts

All three data-generating repositories publish immutable GitHub Releases. A
release contains:

- schema-versioned JSON and/or tabular assets;
- a machine-readable manifest;
- the source commit;
- generation time;
- SHA-256 checksums for every asset; and
- exact upstream release references where applicable.

Drafts and prereleases are not production inputs.

The dependency chain is:

1. Results publishes a self-contained release.
2. Polling validates its keys against one exact results release and records that
   release in its manifest.
3. Backend consumes exact results and polling releases and pins both in its
   release manifest.
4. A production frontend build discovers the latest stable backend release, then
   downloads the exact results and polling releases named by that backend
   manifest.

The frontend never resolves three independent “latest” releases. The backend
manifest defines one coherent, previously built release set.

## Local development and production deployment

Local development may read `dist/` artifacts directly from sibling checkouts.
This supports coordinated work before anything is released.

Running `vercel --prod` is the deliberate production-promotion action. At build
time it:

1. resolves the latest stable backend release;
2. reads its pinned results and polling releases;
3. downloads and validates the complete release set;
4. renders the site; and
5. embeds a deployment-source manifest containing all resolved release tags,
   commits, schema versions, and checksums.

Re-running `vercel --prod` may intentionally pick up a newer coherent release
set. Each resulting deployment remains auditable and reproducible from its
embedded source manifest.

## Publication boundaries

Factual feeds live with the repository that owns the facts:

- results publishes candidate fields, histories, contests, districts, and
  incumbency;
- polling publishes cleaned mayoral and ward polling; and
- backend publishes forecasts, model availability, defeatability results,
  derived race cards, and other analytical outputs.

The frontend may display feeds from all three sources independently. Any output
that combines results and polling is produced by backend, not joined in the
frontend.

## Validation and failure handling

### Results release gates

- canonical identifiers are unique and stable;
- confirmed identity links are internally consistent;
- certified current fields are complete;
- factual feed schemas validate; and
- release assets match their manifest checksums.

### Polling release gates

- every named response references a known canonical `person_id`;
- contest and candidacy references exist in the pinned results release;
- non-person responses use controlled response-option identifiers;
- cleaned poll tables and factual feeds validate; and
- the manifest records the exact results release used for validation.

### Backend release gates

- upstream assets pass checksum and schema validation;
- upstream release references are compatible;
- every joined identifier resolves exactly once;
- modelling and qualification gates pass; and
- the manifest pins the exact results and polling releases used.

### Frontend production gates

A production build fails if release discovery, download, checksum validation,
schema validation, or compatibility validation fails. It must not deploy an
apparently empty site using fallback data when an upstream production artifact
is unavailable or malformed.

Local development may retain honest fallback states and warnings.

Contract fixtures live with each consumer so tests do not require live network
access. Before deployment, an end-to-end smoke check renders the main mayoral,
candidate, ward, polling, and methodology pages from the resolved release set.

## Migration sequence

### 1. Establish the results release contract

- Package canonical tables and factual frontend feeds as release assets.
- Move `mayoral_candidates.json` production into results.
- Generate candidate history directly from canonical `person_id` and candidacy
  relationships.
- Publish the first stable results release.

### 2. Convert the current data repository to polling only

- Retain poll sources, provenance, extraction, cleaning, validation, and factual
  polling-feed generation.
- Replace local candidate-name mappings with canonical identifiers validated
  against a results release.
- Remove candidate registration fetching, downstream identity matching,
  canonical-results vendoring, modelling, council defeatability, and derived
  publication assembly.
- Publish the first stable polling release.

### 3. Create the backend repository

- Move production modelling, model qualification, derived-feed generation, and
  relevant tests from the current data repository.
- Move production defeatability work from `defeatability-index`.
- Place non-production investigations under `research/`.
- Consume released results and polling contracts.
- Publish the first stable backend release with exact upstream pins.

### 4. Cut over the frontend

- Replace the single raw-GitHub data source with local-sibling and GitHub Release
  loaders.
- Resolve the latest stable backend release and its pinned source releases during
  production builds.
- Fail closed in production and preserve local fallback behaviour.
- Embed the resolved deployment-source manifest.

### 5. Coordinated production launch

- Publish stable results, polling, and backend releases.
- Render and inspect the frontend locally against that exact release set.
- Run the end-to-end smoke checks.
- Run `vercel --prod`.

No temporary production compatibility layer is required because deployments are
manual. Relevant git history should be preserved when code moves between
repositories.

## Effect on current work

The current frontend candidates-page work remains useful, but its factual feed
will ultimately come from the results release. The open data-repository PR that
adds candidate-feed generation should be superseded rather than merged as the
long-term architecture. The unfinished downstream alias-vendoring patch is not
part of this design because canonical identity resolution stays in results.
