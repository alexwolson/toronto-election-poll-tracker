# Mayoral Candidates Page Implementation Plan

**Goal:** Publish the complete certified 2026 mayoral field with canonical past-election histories and render it at `/candidates` using the ward page's candidate-row pattern.

**Architecture:** The data repository owns ballot membership, current-cycle IDs, canonical identity resolution, and history serialization in a new `mayoral_candidates.json` feed. The frontend owns validation, fallback behavior, shared candidate-history presentation, navigation, and the public page.

**Branches:** `codex/mayoral-candidates` in both repositories.

---

## Task 1: Establish shared mayoral candidate IDs

**Data repository files:**

- Create `backend/model/mayoral_candidate_ids.py`
- Modify `backend/model/mayoral_forecast_feed.py`
- Create `tests/model/test_mayoral_candidate_ids.py`

Steps:

1. Write failing tests preserving the major IDs `chow`, `bradford`, and `alexander`, deterministic minor slugs, accent normalization, and duplicate-ID rejection.
2. Move the current field-ID logic out of `mayoral_forecast_feed.py` into a focused shared helper.
3. Update the forecast builder to consume the helper without changing its output.
4. Run the focused ID and forecast-feed tests.

## Task 2: Build the mayoral-candidates feed

**Data repository files:**

- Create `backend/model/mayoral_candidates_feed.py`
- Modify `backend/model/council_hints.py`
- Modify `backend/model/council_snapshot.py`
- Create `tests/model/test_mayoral_candidates_feed.py`

Steps:

1. Write failing builder tests for the complete certified field, deterministic sorting, unique/unmatched/ambiguous identity outcomes, newest-first histories, incumbent marking, and uncertified empty output.
2. Promote the existing `PastElection` JSON conversion into a shared public helper beside the `PastElection` model, and keep the council snapshot output unchanged.
3. Implement schema version 1 of `build_mayoral_candidates_feed` from registered candidates, live-cycle configuration, and canonical all-offices history.
4. Fail on duplicate current-cycle IDs and invalid candidate registration rows.
5. Run focused candidate-feed and council-snapshot regression tests.

## Task 3: Add the feed to the publication package

**Data repository files:**

- Modify `backend/model/publication_manifest.py`
- Modify `scripts/build_publication_snapshot.py`
- Modify `tests/model/test_publication_manifest.py`
- Add or modify the publication snapshot integration test
- Regenerate `data/processed/mayoral_candidates.json`
- Regenerate `data/processed/manifest.json`

Steps:

1. Update manifest tests to expect `mayoral_candidates` and its schema version.
2. Build the candidate feed before the manifest in the publication script.
3. Run focused manifest/publication tests.
4. Regenerate the processed publication package and inspect the candidate count, incumbent, match coverage, and histories.
5. Run the data repository's full tests, Ruff checks, and format check.

## Task 4: Sync frontend fixtures and add the typed loader

**Frontend files:**

- Add `fixtures/mayoral_candidates.json`
- Add `fixtures-preview/mayoral_candidates.json`
- Modify both fixture manifests
- Modify `src/types/feeds.ts`
- Modify `src/lib/feeds.ts`
- Create or extend feed-loader tests

Steps:

1. Copy generated certified outputs from the data repository into both fixture sets.
2. Add `MayoralCandidate` and `MayoralCandidatesFeed` types, reusing `PastElection`.
3. Write failing loader tests for valid schema 1, malformed input, missing input, and uncertified fallback behavior.
4. Implement `loadMayoralCandidates` with a safe uncertified empty fallback.
5. Run focused loader tests and TypeScript checking through the normal build.

## Task 5: Extract the shared candidate-history component

**Frontend files:**

- Create `src/components/candidate-history.tsx`
- Modify `src/app/wards/[ward_num]/page.tsx`
- Modify `src/lib/council-history.ts`
- Modify `src/lib/council-history.test.ts`
- Add focused component/render regression coverage

Steps:

1. Add failing tests that generalize `historyHeadline` from a council-incumbent boolean to a current-office type and prevent a sitting mayor from being labelled `Former Mayor`.
2. Extract the shared plain/expandable candidate row and past-election rows using the existing CSS classes.
3. Allow optional route-specific summary text and expanded detail content so the ward page retains return details and historical signals.
4. Replace ward-local history markup with the shared component.
5. Confirm ward output and all council-history tests remain unchanged except for the generalized API.

## Task 6: Add `/candidates` and navigation

**Frontend files:**

- Create `src/app/candidates/page.tsx`
- Modify `src/components/masthead-nav.tsx`
- Add page and navigation tests
- Modify `src/app/globals.css` only if the existing candidate-row styles need a page-level wrapper adjustment

Steps:

1. Write failing render tests for the certified count, matched expandable rows, unmatched plain rows, incumbent summary, and unavailable state.
2. Implement the server-rendered candidates page with metadata and established newspaper layout classes.
3. Add `Candidates` after `Mayor` in navigation and test its active state.
4. Keep the page free of polling, forecast quantities, council signals, filters, and search.
5. Run focused page, navigation, and copy tests.

## Task 7: End-to-end verification

Steps:

1. Run the full frontend test suite and lint.
2. Run the frontend production build.
3. Start the local site and inspect `/candidates` at desktop and mobile widths.
4. Check keyboard disclosure behavior, candidate ordering, long-name wrapping, history-row alignment, active navigation, and the unavailable state.
5. Run `git diff --check` and review both repositories' diffs for generated-file consistency and unrelated changes.

