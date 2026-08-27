# School Board Trustee Pages Implementation Plan

**Date:** 2026-08-27  
**Design:** `docs/superpowers/specs/2026-08-27-trustee-pages-design.md`  
**Goal:** Publish every certified 2026 Toronto trustee race from Results and render a
public four-board Trustees section, with verified Toronto election history since 2003.

## Repositories and ownership

- `toronto-election-results`: certified field, board/ward facts, crosswalk,
  acclamations, identity, incumbency, history, `trustee_races.json`, Results release.
- `toronto-election-poll-tracker-data`: no data-model change; publish a compatible
  Polling release pinned to the new Results release.
- `toronto-election-poll-tracker-backend`: no trustee modelling; publish an integration
  release pinning the new Results and Polling releases.
- `toronto-election-poll-tracker`: validate, load, and render the factual Results feed.

## Working rules

- Use a separate `codex/` implementation branch in Results and the frontend. Do not
  mix the factual Results work with future geometry or attention-score research.
- Freeze the current certified roster as a review cohort, but do not hard-code 118 as
  a permanent adapter constraint. Require all 29 expected contests and accept a later
  Clerk correction to candidate counts.
- Preserve the Clerk's candidate order within each contest.
- Link history only through canonical `person_id`; never reconstruct it by name in the
  feed builder or frontend.
- Treat an exact name as a research lead, not identity proof. A reliable source that
  explicitly connects two candidacies is sufficient evidence for that link.
- A candidate with no confirmed history gets a plain row, with no negative label.
- An incumbent means a sitting trustee on the same board, not an incumbent of the new
  2026 ward.
- Do not publish a comparable prior result across an unverified boundary change.
- Production must continue to resolve the latest stable Backend release and then the
  exact Results and Polling releases pinned by it.
- Deployment is a final, explicitly authorized `vercel --prod` step after all three
  producer releases exist.

---

## Phase 1: Results — acquire and normalize the certified field

### Task 1.1: Add official 2026 trustee roster acquisition

**Repository:** `toronto-election-results`  
**Files:**

- Modify `src/toronto_election_results/pending_candidates.py`
- Modify `src/toronto_election_results/pipeline.py`
- Add `tests/fixtures/pending_candidates/trusteeCandidates_2026.json`
- Modify `tests/test_pending_candidates.py`

**Steps:**

1. Add a failing fixture-based test for the four official board objects, office codes
   3–6, their expected ward sets, active-candidate filtering, source order, accented
   names, and non-public contact fields being discarded.
2. Add failing tests for an absent board, duplicate ward, missing expected ward,
   duplicate active candidacy, unexpected office code, empty contest, and malformed
   roster.
3. Extend roster download paths and atomic acquisition to include
   `trusteeCandidates_2026.json` without regressing the mayor/councillor caches.
4. Parse each current trustee row into the shared pending-adapter contract with:
   `office_type=trustee`, the board-specific `represented_body`, its 2026 boundary
   regime, official numeric ward ID, null votes, and certified-source provenance.
5. Carry an explicit `source_order` through the adapter/canonical assembly only if the
   existing canonical row contract cannot otherwise preserve the Clerk order. Do not
   use alphabetical order as a substitute.
6. Add the adapter to `_load_source_adapters` and include the cached roster in the
   source manifest.
7. Run:

   ```sh
   uv run pytest tests/test_pending_candidates.py tests/test_pipeline.py
   ```

**Commit:** `Ingest the certified 2026 trustee field`

### Task 1.2: Add the authoritative 2026 board/ward crosswalk

**Repository:** `toronto-election-results`  
**Files:**

- Add `data/reference/trustee_ward_crosswalk_2026.csv`
- Add a focused loader/validator in
  `src/toronto_election_results/pending_candidates.py` or a new
  `src/toronto_election_results/trustee_2026.py`
- Modify `src/toronto_election_results/pipeline.py`
- Modify `tests/test_pending_candidates.py`
- Modify `tests/test_pipeline.py`

**Steps:**

1. Transcribe the dated City *2026 Municipal Election — School Board Reference
   Chart* into a small, reviewable reference table containing board ID, represented
   body, trustee ward, public district name, ordered City wards, source URL, and source
   date.
2. Write failing tests that require exactly 12 TDSB, 12 TCDSB, 3 Viamonde, and 2
   MonAvenir contests, unique `(board, ward)` keys, valid City wards 1–25, and the four
   approved boundary-regime IDs.
3. Add a specific regression proving MonAvenir Ward 3 includes City Ward 18. Document
   that the candidate-app dictionary is a cross-check and the newer dated PDF wins the
   discrepancy.
4. Preserve French public district labels: Viamonde Est/Centre/Ouest and MonAvenir
   Toronto Ouest/Toronto Est.
5. Join the certified roster to this table by board and official ward, failing closed
   on either unmatched side.
6. Include the reference CSV in `_source_files` so its checksum and provenance enter
   `build_manifest.json`.
7. Run the focused pending-candidate and pipeline tests.

**Commit:** `Define 2026 trustee ward crosswalks`

### Task 1.3: Encode the four official acclamations

**Repository:** `toronto-election-results`  
**Files:**

- Modify the 2026 trustee adapter module
- Add `data/reference/trustee_acclamations_2026.csv` if a reference table is clearer
  than source constants
- Modify `tests/test_pending_candidates.py`
- Modify `src/toronto_election_results/release_validation.py`
- Modify `tests/test_release_validation.py`

**Steps:**

1. Add failing adapter tests for the Clerk's August 24 declaration:
   Frank D'Amico (TCDSB 6), Nancy Crawford (TCDSB 12), Benoit Fortin (Viamonde 2),
   and Geneviève Oger (Viamonde 4).
2. Require each declared contest to contain exactly one active certified candidate.
3. Emit those four contests as final acclamations with `elected=true`,
   `acclaimed=true`, `outcome_method=acclamation`, and null votes/share/rank.
4. Keep the other 25 contests pending with all result values null.
5. First add a release-validation test showing the current blanket post-cutoff rule
   rejects the official acclamations.
6. Narrow the rule so only a single-candidate, source-backed future municipal
   acclamation can be final. Retain rejection tests for a future vote result, an
   undeclared single-candidate final, a multi-candidate acclamation, or populated vote
   totals.
7. Run:

   ```sh
   uv run pytest tests/test_pending_candidates.py tests/test_release_validation.py
   ```

**Commit:** `Record certified 2026 trustee acclamations`

### Task 1.4: Correct pending snapshot metadata

**Repository:** `toronto-election-results`  
**Files:**

- Modify `src/toronto_election_results/build_manifest.py`
- Modify `tests/test_build_manifest.py`
- Modify `README.md`

**Steps:**

1. Add a failing manifest test replacing the stale August 21 pending-candidate
   snapshot with the certified August 27 snapshot used for this release.
2. Update both `coverage.pending_candidate_snapshot_through` and the 2026 pending
   event's `candidate_snapshot_through` from one shared constant.
3. Keep the completed-results cutoff separate; four declared acclamations do not make
   the scheduled election generally complete.
4. Update README coverage text to describe the certified mayor, councillor, and
   trustee fields and the acclamation exception.

**Commit:** `Update the certified candidate snapshot`

---

## Phase 2: Results — complete identity and incumbency review

### Task 2.1: Freeze a cohort-complete trustee review contract

**Repository:** `toronto-election-results`  
**Files:**

- Add `data/reference/trustee_career_cohort_2026.csv`
- Add `data/reference/trustee_career_reviews.csv`
- Add `data/reference/trustee_career_decisions.csv`
- Add `src/toronto_election_results/trustee_career.py`
- Add `tests/test_trustee_career.py`
- Modify `src/toronto_election_results/pipeline.py`

**Steps:**

1. Export the complete certified cohort from canonical 2026 trustee candidacies,
   retaining cohort ID, board, ward, candidacy ID, certified name, current Person
   hypothesis, source release/commit, and Clerk source order.
2. Sort the registry deterministically without altering public candidate order.
3. Write failing tests requiring the cohort to equal the complete certified field,
   contain all 29 contests, and contain no duplicate candidacy.
4. Define candidate-level review states that distinguish completed review from a hold,
   without turning either state into public card copy.
5. Define occurrence decisions `confirm`, `hold`, `split`, and `reject`, each referring
   to an existing canonical Toronto candidacy from 2003 onward and retaining evidence
   URL(s) and rationale.
6. Reject decisions outside Toronto, before 2003, after the current election date, or
   against the subject candidacy itself.
7. Require every cohort candidacy to have exactly one completed review row, even when
   no plausible prior occurrence is found.
8. Feed only confirmed decisions into the existing persistent Person-link machinery;
   holds and rejections remain auditable but do not populate `person_id`.
9. Include the three reference files in source-manifest checksums.
10. Run the focused career, identity, and pipeline tests.

**Commit:** `Define the trustee identity review cohort`

### Task 2.2: Review all certified candidates against Toronto 2003+ history

**Repository:** `toronto-election-results`  
**Files:**

- Populate the three `data/reference/trustee_career_*.csv` files
- Add batch evidence records under `docs/research/trustee-career/2026/`
- Modify `data/reference/identity_review_dispositions.csv` or
  `src/toronto_election_results/identity_curations.py` only through the established
  persistent-link protocol

**Steps:**

1. Work through all certified candidates in deterministic board/ward/source order;
   do not stop at normalized exact-name leads.
2. For each candidate, inventory every plausible canonical Toronto candidacy from
   2003 onward across trustee, councillor, mayoral, provincial, and federal offices.
3. Search for explicit identity bridges where the existing canonical evidence does
   not already establish continuity. An official roster, board biography, reliable
   article, candidate history, or similarly reliable source that connects two results
   is sufficient.
4. Check same-event collisions, common-name alternatives, changed wards, changed
   boards, changed offices, and spelling variants before confirming.
5. Preserve plausible-but-unconfirmed links as holds. Do not attribute their history.
6. Record candidates with no credible lead as reviewed with zero decisions rather than
   inventing a “no prior candidacy” public claim.
7. Validate and commit completed review batches so progress lives in the repository,
   not only in the conversation.

**Gate:** Do not build the public feed until cohort validation reports every certified
candidate reviewed and every confirmed occurrence supported by the canonical link
registry.

**Commit series:** `Review 2026 trustee candidates batch N`

### Task 2.3: Add dated current-board incumbency evidence

**Repository:** `toronto-election-results`  
**Files:**

- Add `data/reference/trustee_incumbency_roster_2026.csv`
- Extend `src/toronto_election_results/trustee_career.py` or
  `src/toronto_election_results/reported_incumbency.py`
- Modify `src/toronto_election_results/pipeline.py`
- Modify `tests/test_reported_incumbency.py`
- Modify `tests/test_incumbency.py`

**Steps:**

1. Record each sitting trustee from dated official TDSB, TCDSB, Viamonde, and
   MonAvenir rosters with board, reported name, roster reference date, source URL, and
   confirmed `person_id`.
2. Write failing tests for complete board coverage, duplicate roster members, unknown
   people, cross-board mismatches, and stale/undated evidence.
3. Build same-board trustee tenures using the existing auditable Office-tenure model.
4. Mark `incumbent=true` only when the 2026 candidacy's Person matches a sitting roster
   member of the same represented body.
5. Add a regression for a 2026 contest containing multiple sitting trustees and prove
   the implementation does not require one incumbent per ward.
6. Add negative tests proving that a trustee of another board or an unlinked same-name
   candidate is not marked incumbent.
7. Include the roster reference in source-manifest checksums.

**Commit:** `Verify incumbent trustees for 2026`

### Task 2.4: Declare comparable prior contests explicitly

**Repository:** `toronto-election-results`  
**Files:**

- Add `data/reference/trustee_contest_continuity_2026.csv`
- Add loader validation in the trustee-focused Results module
- Add `tests/test_trustee_career.py` or a focused continuity test file

**Steps:**

1. Record explicit 2026-contest to prior-contest decisions with evidence and a reason;
   use null where no meaningful continuity is verified.
2. Write a failing test that every new TDSB contest has no comparable prior result,
   regardless of repeated ward numbers, because the board moved from 22 to 12 wards.
3. Verify TCDSB and French-board continuity contest by contest rather than assuming
   continuity from equal ward counts.
4. Where applicable, use the completed 2023 rerun after a voided 2022 French-board
   election rather than the void contest.
5. Fail on a pending/void target, cross-board target, future target, or one prior
   contest assigned ambiguously.
6. Include the table in source-manifest checksums.

**Commit:** `Curate comparable trustee contests`

---

## Phase 3: Results — build and release the factual feed

### Task 3.1: Build `trustee_races.json`

**Repository:** `toronto-election-results`  
**Files:**

- Modify `src/toronto_election_results/frontend_feeds.py`
- Modify `tests/test_frontend_feeds.py`

**Steps:**

1. Add failing schema-version-1 builder tests covering the exact four-board order,
   29 contest keys, numeric ward order, source-ordered candidates, certification, and
   cohort coverage metadata.
2. Add board metadata and ward fields from canonical Results/crosswalk data, not
   frontend constants.
3. Reuse `_past_elections` for confirmed Person-linked Toronto history from 2003 up to
   but excluding the current candidacy. Preserve newest-first ordering, result, vote
   share, rank, field size, district, and party.
4. Publish `is_incumbent` only from evidence-backed Office tenure.
5. Serialize declared acclamations and other pending contests exactly as canonical
   Results represents them.
6. Build `comparable_prior_result` only from the curated continuity table and canonical
   final results. Keep it null for all unverified comparisons.
7. Add negative tests proving a held identity has no guessed history, an unlinked
   candidate remains a plain factual candidate, and same-name rows cannot join without
   `person_id`.
8. Validate that the coverage cohort size equals the generated candidate count and
   that all current candidates appear exactly once.

**Commit:** `Build the trustee races feed`

### Task 3.2: Package and validate the Results release asset

**Repository:** `toronto-election-results`  
**Files:**

- Modify `src/toronto_election_results/release_bundle.py`
- Modify `tests/test_release_bundle.py`
- Modify `tests/test_build_manifest.py`
- Modify `README.md` and `docs/data-dictionary.md`

**Steps:**

1. Add a failing bundle test requiring `trustee_races.json` in `feeds`,
   `feed_versions`, assets, and checksums.
2. Generate the feed atomically from canonical CSVs plus validated trustee reference
   inputs.
3. Package machine-auditable cohort/review coverage where useful, but keep research
   prose and internal negative labels out of the frontend feed.
4. Update the data dictionary for 2026 boundary regimes, acclamation status,
   incumbency semantics, and the Toronto-2003+ history policy.
5. Run the full Results quality gate:

   ```sh
   uv run pytest
   uv run ruff check .
   uv run ruff format --check .
   uv run python -m toronto_election_results.pipeline
   uv run python -m toronto_election_results.release_bundle build
   ```

6. Inspect generated counts and invariants: four boards, 29 contests, current certified
   candidate count, four final acclamations, 25 pending contests, complete review
   coverage, and no partial board.
7. Rebuild from unchanged inputs and compare the canonical tables/feed for deterministic
   content apart from declared build timestamps.
8. Run `git diff --check` and review generated-file changes for unrelated drift.

**Commit:** `Publish trustee races in Results releases`

### Task 3.3: Publish and verify the Results release

1. Merge the Results PR before creating the stable release.
2. Build the bundle from a clean `main` checkout.
3. Publish a new immutable stable Results tag using the existing release command.
4. Download the release into a clean temporary directory and verify manifest schema,
   checksums, `trustee_races.json`, four boards, 29 contests, and review coverage.
5. Record the Results tag, source commit, and manifest SHA-256 for downstream releases.

---

## Phase 4: Re-establish the coherent release chain

### Task 4.1: Publish a Polling release pinned to Results

**Repository:** `toronto-election-poll-tracker-data`

1. Update/hydrate the Polling build against the exact new Results release.
2. Do not add trustee polling or candidate synchronization logic.
3. Run the Polling full test/lint/format and release validation commands.
4. Publish a new stable Polling release whose manifest pins the exact Results tag,
   source commit, and manifest checksum.
5. Download and verify it from a clean temporary directory.

### Task 4.2: Publish a Backend integration release

**Repository:** `toronto-election-poll-tracker-backend`

1. Hydrate the exact new Results and Polling release pair and run the full Backend
   tests, Ruff checks, format check, and publication build.
2. Confirm the existing mayoral and Council outputs are unchanged except for legitimate
   refreshed upstream provenance.
3. Build a new Backend release bundle pinning the exact Results and Polling tags,
   commits, and manifest checksums.
4. No trustee feed transformation or attention score belongs in this release; the
   Backend release is the coherent release-set anchor.
5. Publish and download-verify the new stable Backend release.

**Gate:** Do not start the production frontend build until the stable Backend release
pins the stable Results release containing `trustee_races.json` and a compatible stable
Polling release.

---

## Phase 5: Frontend — load and render Trustees

### Task 5.1: Read the installed Next.js 16 route documentation

**Repository:** `toronto-election-poll-tracker`

Before editing route files, read these installed guides completely and follow their
current signatures/deprecations:

- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/dynamic-routes.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-static-params.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/not-found.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/redirect.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/02-components/link.md`

Record any plan-significant API difference before implementing the routes.

### Task 5.2: Add contract fixtures, types, and strict validation

**Repository:** `toronto-election-poll-tracker`  
**Files:**

- Add `fixtures/trustee_races.json`
- Add `fixtures-preview/trustee_races.json`
- Update fixture manifests/readmes where they enumerate feeds
- Modify `src/types/feeds.ts`
- Modify `src/lib/feeds.ts`
- Modify `src/lib/feeds.test.ts`
- Add `src/lib/trustees.ts`
- Add `src/lib/trustees.test.ts`

**Steps:**

1. Copy the released Results feed into both local fixture sets; do not hand-maintain a
   second invented trustee dataset.
2. Add typed schema-1 interfaces reusing `PastElection` and `PriorResult` where their
   factual shapes agree.
3. Add failing validator tests for a valid feed, wrong schema, uncertified field,
   missing board, duplicate board, missing/duplicate ward, wrong ward set, invalid
   status/acclamation combination, duplicate candidacy, invalid City ward, and bad
   history shape.
4. Validate all four boards and all 29 expected contests before accepting the feed.
   Return one complete unavailable fallback; never preserve only the valid boards.
5. Add helpers for canonical board order, board lookup, numeric ward order, index view
   data, incumbent summaries, and plain City-ward descriptions. Keep them
   presentational and do not infer identity, boundaries, or results.
6. Add view-helper tests for multiple incumbents, acclaimed fields, French labels,
   missing comparable result, and preserved candidate order.
7. Run:

   ```sh
   npm test -- src/lib/feeds.test.ts src/lib/trustees.test.ts
   ```

**Commit:** `Load the trustee races feed`

### Task 5.3: Add the Results feed to release resolution

**Repository:** `toronto-election-poll-tracker`  
**Files:**

- Modify `scripts/resolve-releases.mjs`
- Add focused resolver coverage if the script is refactored for testability

**Steps:**

1. Add the Results manifest's `trustee_races` asset to the immutable download set.
2. Retain the existing chain validation: latest stable Backend, exact pinned Results
   and Polling, Polling's matching Results pin, source commits, manifest checksums, and
   asset checksums.
3. Fail the production build if the pinned Results release lacks the trustee feed;
   do not silently deploy an empty public section.
4. Confirm `.release-data/trustee_races.json` is written and the deployment source
   manifest still describes the one resolved release set.

**Commit:** `Resolve released trustee data`

### Task 5.4: Add the shared board tabs and board index routes

**Repository:** `toronto-election-poll-tracker`  
**Files:**

- Add `src/components/trustee-board-tabs.tsx`
- Add `src/app/trustees/page.tsx`
- Add `src/app/trustees/[board]/page.tsx`
- Add focused render tests under `src/lib/`
- Modify `src/app/globals.css`

**Steps:**

1. Write failing tests for `/trustees` redirecting to `/trustees/tdsb`, four link-based
   tabs in approved order, `aria-current`, known static board params, and unknown-board
   404 behavior.
2. Implement the root redirect using the installed Next.js API.
3. Render the board index in the Council editorial hierarchy without an attention sort.
4. For every ward show official ward/name, corresponding City wards in plain language,
   certified field size, contested/acclaimed status, and incumbent name/count.
5. Link every row to `/trustees/{board}/{ward}` and retain numeric ward order.
6. Render one concise section-level unavailable message when the whole feed fallback is
   present.
7. Style tab overflow, long French labels, status labels, and ward rows responsively;
   reuse established spacing/type variables before adding new CSS.

**Commit:** `Add trustee board indexes`

### Task 5.5: Add trustee ward detail routes

**Repository:** `toronto-election-poll-tracker`  
**Files:**

- Add `src/app/trustees/[board]/[ward]/page.tsx`
- Add focused detail-page tests under `src/lib/`
- Modify `src/app/globals.css` only for trustee-specific layout needs

**Steps:**

1. Write failing tests for static board/ward params, valid metadata, unknown ward 404,
   board/ward heading, City-ward area text, contested/acclaimed copy, open/incumbent
   facts, and comparable-prior-result presence/absence.
2. Use the Council page hierarchy but omit maps, polls, signals, defeatability, and
   attention labels.
3. Render one or several sitting trustees accurately; use “Incumbent Trustee” and
   never “Ward incumbent.”
4. Reuse `CandidateHistoryItem` for all candidates. Pass verified canonical history
   only, and leave a zero-history candidate as a non-expandable plain row.
5. Preserve the Clerk's candidate order.
6. For an acclamation, state that the candidate has been elected by acclamation while
   keeping vote totals absent.
7. Keep coverage methodology at section/page level if shown; never expose internal
   review states or technical dossier language.

**Commit:** `Add trustee race detail pages`

### Task 5.6: Add vote share to the one shared history renderer

**Repository:** `toronto-election-poll-tracker`  
**Files:**

- Modify `src/components/candidate-history.tsx`
- Modify `src/lib/council-history.ts` if formatting belongs there
- Modify `src/lib/council-history.test.ts`
- Modify candidate/Council page render tests

**Steps:**

1. Add a failing component regression requiring vote share alongside the existing
   result/placement detail when `vote_share` is present.
2. Reuse `formatSharePct` and preserve the established `<0.1%` behavior.
3. Omit vote share cleanly when it is null, including acclamations.
4. Keep Council, mayoral, and trustee histories on the same renderer; do not add a
   trustee-only election-row component.
5. Verify the deliberate display change on representative Council and mayoral history
   rows and no change to disclosure behavior.

**Commit:** `Show vote share in candidate histories`

### Task 5.7: Add Trustees to primary navigation

**Repository:** `toronto-election-poll-tracker`  
**Files:**

- Modify `src/components/masthead-nav.tsx`
- Add or modify navigation tests

**Steps:**

1. Add a failing test for `Trustees` adjacent to `Council` and active across all
   `/trustees` descendants.
2. Add the link without changing unrelated nav order or labels.
3. Verify mobile nav wrapping/overflow with the additional item.

**Commit:** `Add Trustees to site navigation`

---

## Phase 6: Integrated verification, release, and deployment

### Task 6.1: Run frontend quality gates

1. Run:

   ```sh
   npm test
   npm run lint
   FEED_LOCAL_DIR=fixtures npm run build
   git diff --check
   ```

2. Confirm all expected trustee routes are statically generated or otherwise follow
   the installed Next.js 16 contract.
3. Confirm existing Mayor, Candidates, Polls, Council, and How-it-works pages remain
   healthy.
4. Review the frontend diff for factual derivation, duplicated history rendering, and
   unrelated fixture churn.

### Task 6.2: Browser QA against released/local data

1. Start the local development server using the released or checked-in complete feed.
2. Inspect all four board indexes and representative detail pages, including:
   one multiple-incumbent TDSB race, one acclamation, one French-board long label, one
   comparable prior result, one intentionally absent comparison, one candidate with
   linked history, and one plain no-history candidate.
3. Check desktop and narrow mobile widths for tab overflow, ward-row readability,
   breadcrumbs, long names, French accents, disclosure alignment, and nav wrapping.
4. Check keyboard traversal, visible focus, summary expansion, `aria-current`, and
   heading hierarchy.
5. Verify unknown board and ward URLs return the intended 404 and malformed local data
   produces one honest unavailable section.

### Task 6.3: Merge frontend and verify the production release resolver

1. Merge the frontend PR after the Results, Polling, and Backend releases are stable.
2. On clean frontend `main`, run `npm run vercel-build` with network access.
3. Confirm it resolves the intended Backend release and its exact Results/Polling pins,
   downloads `trustee_races.json`, and builds every trustee route.
4. Inspect `public/data/source-manifest.json` for the expected immutable release set.

### Task 6.4: Deploy and smoke test

1. After explicit deployment authorization, run:

   ```sh
   vercel --prod
   ```

2. Verify production HTTP 200 responses for all four board indexes and representative
   race pages.
3. Confirm the production UI shows the four acclamations correctly, multiple
   incumbents where applicable, verified history only, and no “no verified history”
   labels.
4. Record the deployed Vercel URL and exact Backend/Results/Polling release tags.

## Completion criteria

- Results contains the complete certified 2026 trustee field for all four boards and
  all 29 contests.
- Four declared acclamations are final; every other contest remains pending.
- Every certified candidate has a completed Toronto-2003+ identity review.
- Every incumbent flag is backed by a dated same-board roster and Person link.
- TDSB ward numbers are not treated as continuity across the 2022/2026 boundary change.
- `trustee_races.json` is checksummed in a stable Results release.
- A stable Polling release pins that Results release, and a stable Backend release pins
  both.
- The frontend validates the complete feed, renders four board tabs and 29 race pages,
  and performs no identity, modelling, or boundary inference.
- Candidates without verified history have no flag or dropdown.
- Council, mayoral, and trustee histories share the same vote-share-capable renderer.
- Frontend tests, lint, production build, browser QA, and production smoke checks pass.

## Deferred work

- Trustee geometry acquisition and maps.
- Trustee attention-score research or production scoring.
- Trustee polling, endorsements, biographies, photos, contact links, and search.
