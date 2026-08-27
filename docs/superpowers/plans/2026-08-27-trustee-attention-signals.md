# Trustee Race Context and Vote-Share Signal Implementation Plan

**Date:** 2026-08-27  
**Design:** `docs/superpowers/specs/2026-08-27-trustee-attention-signals-design.md`  
**Goal:** Move every trustee race classification and ordering decision into the
backend, publish an enriched trustee-card artifact, and render a factual under-50%
prior-win signal for the three boards whose ward geography remains comparable.

## Repositories and ownership

- `toronto-election-results`: unchanged canonical source for the certified trustee
  field, canonical person links, incumbency, comparable prior results, and histories.
- `toronto-election-poll-tracker-backend`: consume Results' `trustee_races.json`,
  derive race context, publish ordered `trustee_race_cards.json`, and pin the exact
  Results release used.
- `toronto-election-poll-tracker`: validate and render the backend-owned trustee
  cards without counting incumbents, comparing vote shares, choosing prior contests,
  assigning categories, or sorting wards.
- `toronto-election-poll-tracker-data`: no change and no new release is required for
  this feature. Backend continues to pin its already-compatible Polling release.

## Working rules

- Implement producer before consumer: Backend first, then frontend against a real
  generated backend artifact.
- Use canonical `person_id` and the history already attached to that person. Never
  compare a current candidate name with a prior winner name to establish identity.
- Treat `0.50` as a strict boundary: `0.499...` fires and `0.50` does not.
- Acclamation and open-race status supersede the vote-share signal.
- TDSB never receives a prior-vote signal; its redrawn 2026 wards use field structure.
- Missing, conflicting, or ambiguous history resolves to the ordinary incumbent
  category with no signal. Do not guess or fail open.
- Preserve Results-owned candidate order inside each ward. Only the order of wards is
  backend-derived.
- Keep category keys stable and presentation-neutral. Public labels and colours live
  in the frontend.
- Do not call the signal a Defeatability Index, attention score, vulnerability score,
  or forecast.
- Commit each repository independently. Do not mix unrelated dirty frontend work into
  a backend or documentation commit.

---

## Phase 1: Backend — ingest and validate the trustee source

### Task 1.1: Expose `trustee_races.json` as a hydrated Results input

**Repository:** `toronto-election-poll-tracker-backend`  
**Files:**

- Modify `backend/release_inputs.py`
- Modify `tests/test_release_inputs.py`

**Steps:**

1. Add a failing release-input test whose Results bundle contains
   `trustee_races.json` and whose loaded `ReleaseInputPaths` exposes that exact file.
2. Add a failing test proving hydration rejects a Results bundle without the trustee
   artifact rather than silently constructing an empty trustee feed.
3. Add `trustee_races: Path` to `ReleaseInputPaths` and resolve it from the hydrated
   input manifest using the existing path-containment checks.
4. Add `"trustee_races": "results/trustee_races.json"` to the generated input
   manifest. Do not copy or transform the Results artifact separately; it already
   enters through the vendored Results bundle.
5. Run:

   ```sh
   uv run pytest tests/test_release_inputs.py
   ```

**Commit:** `Hydrate trustee race inputs`

### Task 1.2: Define and validate the backend trustee-card contract

**Repository:** `toronto-election-poll-tracker-backend`  
**Files:**

- Add `backend/model/trustee_race_card.py`
- Add `tests/model/test_trustee_race_card.py`

**Steps:**

1. Add test fixtures representing all four boards, including an open race, one and
   two incumbents, an acclamation, a linked prior winner below 50%, a linked prior
   winner at exactly 50%, and an ordinary incumbent above 50%.
2. Define a schema-version constant for `trustee_race_cards.json`. Start at version 1
   because this is a new backend-owned feed, even though it carries through fields
   from Results' trustee schema.
3. Implement explicit method/category contracts:

   - `tdsb_field_structure`: `open`, `two_incumbents`, `one_incumbent`, `acclaimed`;
   - `continuous_ward_vote_share`: `open`, `won_without_majority`,
     `contested_incumbent`, `acclaimed`.

4. Encode the approved sort priorities in one backend constant per method. Add a
   validator that rejects an unknown method/category pair or a priority inconsistent
   with that pair.
5. Define the signal contract with key `prior_win_under_50`, canonical subject person
   ID, display name, election year, and fractional vote share. Require every field
   when the signal is present and reject shares outside `[0, 1]`.
6. Reject a signal on `open`, `acclaimed`, any TDSB category, or
   `contested_incumbent`; require a valid under-50 signal on
   `won_without_majority`.
7. Test serialization with `allow_nan=False` so non-finite shares cannot enter a
   release.
8. Run:

   ```sh
   uv run pytest tests/model/test_trustee_race_card.py
   ```

**Commit:** `Define trustee race card schema`

---

## Phase 2: Backend — derive race context and publish the feed

### Task 2.1: Build TDSB field-structure categories upstream

**Repository:** `toronto-election-poll-tracker-backend`  
**Files:**

- Modify `backend/model/trustee_race_card.py`
- Modify `tests/model/test_trustee_race_card.py`

**Steps:**

1. Write failing tests for TDSB's four categories and their priorities.
2. Check acclamation first. For a non-acclaimed ward, count only candidates whose
   Results-owned `is_incumbent` value is exactly `true`.
3. Map zero, one, and two incumbents to `open`, `one_incumbent`, and
   `two_incumbents`. Reject more than two incumbents as an invalid current contract
   instead of silently treating it as two.
4. Emit `method: "tdsb_field_structure"` and a null signal for every TDSB ward.
5. Sort TDSB wards by category priority and then numeric ward ID. Preserve candidate
   order inside each ward.
6. Add a regression test using the current Results fixture to assert the complete
   expected TDSB ward order and category distribution.
7. Run the focused trustee-card tests.

**Commit:** `Classify TDSB trustee races upstream`

### Task 2.2: Derive the continuous-board vote-share signal

**Repository:** `toronto-election-poll-tracker-backend`  
**Files:**

- Modify `backend/model/trustee_race_card.py`
- Modify `tests/model/test_trustee_race_card.py`

**Steps:**

1. Add failing tests for open and acclamation precedence, ordinary contested
   incumbents, and a prior winner strictly below 50%.
2. For each TCDSB, Viamonde, or MonAvenir ward, select a signal candidate only when
   there is exactly one verified incumbent and that candidate has a non-null canonical
   `person_id`.
3. From that candidate's attached `past_elections`, select the latest completed win
   before the 2026 election with:

   - `office_type == "trustee"`;
   - the same `represented_body` as the current board;
   - the same continuous ward number parsed from `district_name`; and
   - a non-null vote share.

   Keep the district parser narrow (`Ward N`) and fail closed on any other form.
4. Cross-check the selected win against `comparable_prior_result` by election year and
   vote share. Compare shares with a documented small numeric tolerance only for JSON
   serialization precision; do not compare `winner_name` to the candidate name.
5. If the cross-check is missing, ambiguous, or inconsistent, emit
   `contested_incumbent` with a null signal.
6. If the verified share is strictly below `0.50`, emit
   `won_without_majority`; otherwise emit `contested_incumbent`.
7. Add exact boundary tests at `0.499999`, `0.50`, and `0.500001`.
8. Add rerun regressions proving Viamonde Ward 3 and MonAvenir Ward 4 use their latest
   January 23, 2023 wins rather than the superseded October 2022 contests.
9. Sort each board by category priority and then numeric ward ID.
10. Against the current full Results artifact, assert that only TCDSB Ward 4 (Teresa
    Lubinski, 2022, 48.9%) and Ward 5 (Maria Rizzo, 2022, 45.2%) carry
    `prior_win_under_50`.
11. Run the focused trustee-card tests.

**Commit:** `Add trustee prior-win vote share signals`

### Task 2.3: Add a trustee snapshot command to the refresh pipeline

**Repository:** `toronto-election-poll-tracker-backend`  
**Files:**

- Add `scripts/build_trustee_snapshot.py`
- Add `tests/model/test_trustee_snapshot.py`
- Modify `scripts/refresh_all.py`
- Modify `scripts/build_publication_snapshot.py`
- Modify `backend/model/publication_manifest.py`
- Modify `tests/model/test_publication_manifest.py`

**Steps:**

1. Add a failing snapshot test that reads a trustee Results fixture and emits a
   schema-versioned `trustee_race_cards.json` with all four boards, 29 contests,
   Results-owned metadata, and one `race_context` per ward.
2. Implement a small CLI parallel to `scripts/build_council_snapshot.py`. It must take
   `--input-manifest`, read only `inputs.trustee_races`, build and validate the cards,
   and atomically write the requested output.
3. Add `trustee_race_cards` and its schema version to the backend publication
   manifest's feed index.
4. Insert `Build trustee race cards` into `scripts/refresh_all.py` after hydration and
   before bundle creation, writing into the same generated directory as the mayoral
   and council feeds.
5. Add a dry-run test or focused command assertion proving refresh invokes the new
   builder with the hydrated input manifest.
6. Run:

   ```sh
   uv run pytest tests/model/test_trustee_snapshot.py tests/model/test_publication_manifest.py
   uv run scripts/refresh_all.py --results-release TEST --polling-release TEST --dry-run
   ```

**Commit:** `Build trustee race cards during refresh`

### Task 2.4: Package trustee cards in backend releases

**Repository:** `toronto-election-poll-tracker-backend`  
**Files:**

- Modify `backend/release_bundle.py`
- Add or modify `tests/test_release_bundle.py`

**Steps:**

1. Add a failing bundle test proving `trustee_race_cards.json` is required, copied,
   checksummed, and indexed as `feeds.trustee_race_cards`.
2. Add the trustee file to the release asset allowlist and feed manifest.
3. Add a rejection test for a missing trustee artifact so an incomplete backend
   release cannot be published.
4. Retain the exact existing Results and Polling dependency pins; the trustee artifact
   must not introduce an unpinned side input.
5. Run:

   ```sh
   uv run pytest tests/test_release_bundle.py tests/test_release_inputs.py
   uv run pytest
   ```

**Commit:** `Publish trustee race cards in backend releases`

---

## Phase 3: Frontend — consume the enriched backend contract

### Task 3.1: Resolve the backend trustee artifact for local and production builds

**Repository:** `toronto-election-poll-tracker`  
**Files:**

- Modify `scripts/resolve-releases.mjs`
- Modify `fixtures/trustee_races.json`
- Modify `fixtures-preview/trustee_races.json`
- Modify `fixtures/README.md`
- Modify `fixtures-preview/README.md`

**Steps:**

1. Generate `trustee_race_cards.json` from the completed backend builder using the
   committed Results trustee fixture. Do not hand-author categories or reorder the
   JSON in the frontend.
2. Replace the frontend fixture filename `trustee_races.json` with
   `trustee_race_cards.json` in both fixture sets and document Backend as its owner.
3. Change the production release resolver to download
   `backend.manifest.feeds.trustee_race_cards` from the selected backend release.
4. Stop downloading `results.manifest.feeds.trustee_races` into `.release-data`.
   Results remains transitively pinned and verified through the backend manifest.
5. Add a resolver-level check that the backend manifest contains the trustee feed.
   A production resolve must throw on a missing asset or checksum mismatch.
6. Run the resolver against a local/mock release fixture if available; otherwise defer
   the live resolution check until Phase 4 after the backend release exists.

**Commit:** `Resolve backend trustee race cards`

### Task 3.2: Replace the Results trustee types and loader

**Repository:** `toronto-election-poll-tracker`  
**Files:**

- Modify `src/types/feeds.ts`
- Modify `src/lib/feeds.ts`
- Modify `src/lib/feeds.test.ts`

**Steps:**

1. Add TypeScript types for both race-context methods, their valid categories, and the
   nullable vote-share signal.
2. Rename the consumer feed and loader to `TrusteeRaceCardsFeed` and
   `loadTrusteeRaceCards`; load `trustee_race_cards.json`.
3. Update validation to require a valid `race_context` on every ward, enforce the
   method/category/priority matrix, enforce signal/category compatibility, and require
   backend-provided board order.
4. Retain validation of all Results-owned trustee facts carried through the enriched
   artifact: coverage, boards, wards, acclamations, candidates, and history.
5. Add malformed-feed tests for unknown categories, wrong priorities, a 50% under-50
   signal, signals on open/acclaimed/TDSB wards, and missing signal fields.
6. Make the trustee loader required in production resolution: an absent or invalid
   backend artifact must fail the static build. Keep an explicit empty fallback only
   for local development if the existing local-fixture workflow needs it, and test the
   environment distinction.
7. Run:

   ```sh
   npm test -- src/lib/feeds.test.ts
   ```

**Commit:** `Validate backend trustee race cards`

### Task 3.3: Remove frontend classification and sorting

**Repository:** `toronto-election-poll-tracker`  
**Files:**

- Modify `src/lib/trustees.ts`
- Modify `src/lib/trustees.test.tsx`
- Replace `src/components/tdsb-race-type-tag.tsx` with a board-neutral trustee context
  tag component, or rename it if Git preserves history cleanly

**Steps:**

1. Replace `TdsbRaceType` with the backend-owned race-context category types.
2. Keep only label and presentation mappings in the frontend. Map:

   - `open` → `Open race`;
   - `two_incumbents` → `Two incumbents`;
   - `one_incumbent` → `One incumbent`;
   - `won_without_majority` → `Won without a majority`;
   - `acclaimed` → `Elected by acclamation`.

   Return no tag for `contested_incumbent`.
3. Delete `tdsbRaceType`, `sortTdsbWardsByRaceType`, and any constants that encode
   their classification or ordering.
4. Keep `incumbentTrustees` only where it supports factual copy about named sitting
   trustees; do not use it for category assignment or ordering.
5. Add a source guard test that fails if trustee helpers compare a vote share with
   `0.50`, count incumbents to choose a context category, or sort trustee wards. Make
   the test target the helper/module boundary rather than brittle whitespace.
6. Verify the helper returns only backend-supplied order and presentation mappings.
7. Run:

   ```sh
   npm test -- src/lib/trustees.test.tsx
   ```

**Commit:** `Render trustee context without frontend modelling`

### Task 3.4: Render the approved badges, notes, and factual explanation

**Repository:** `toronto-election-poll-tracker`  
**Files:**

- Modify `src/app/trustees/[board]/page.tsx`
- Modify `src/app/trustees/[board]/[ward]/page.tsx`
- Modify the trustee context tag component
- Modify `src/app/globals.css`
- Modify `src/lib/trustees.test.tsx`

**Steps:**

1. Change metadata and page loaders to `loadTrusteeRaceCards`.
2. Render wards exactly in backend order for all four boards. Do not call `sort` in
   either trustee page.
3. On board indexes, show badges for `open`, `won_without_majority`, and `acclaimed`.
   Preserve the approved TDSB `two_incumbents` and `one_incumbent` badges. Show no
   badge for `contested_incumbent`.
4. On detail heroes, apply the same badge rules.
5. For `won_without_majority`, render exactly one factual sentence in the 2026 election
   section using only backend signal fields, for example: “Maria Rizzo won this ward
   in 2022 with 45.2% of votes cast.”
6. Add the short continuous-board note explaining that ordering uses the prior
   winner's share of votes cast and is not a forecast. Keep the existing distinct TDSB
   note about redrawn wards.
7. Add a dedicated amber treatment for `won_without_majority`; retain the approved
   TDSB colours, the open-race treatment, and neutral acclamation treatment. Check
   contrast and do not add a `RACE TYPE` prefix.
8. Test both signal-bearing TCDSB wards, an ordinary incumbent with no badge, an open
   race, an acclamation, TDSB's structural categories, and the two distinct notes.
9. Run:

   ```sh
   npm test -- src/lib/trustees.test.tsx src/lib/feeds.test.ts
   npm test
   npm run build
   ```

**Commit:** `Show trustee prior-win vote share context`

---

## Phase 4: Release-chain and browser verification

### Task 4.1: Build and publish the backend release

**Repositories:** `toronto-election-results`,
`toronto-election-poll-tracker-data`, and
`toronto-election-poll-tracker-backend`

**Steps:**

1. Confirm the local Results and Polling repositories are clean and their current
   stable releases are compatible. Do not create new upstream releases solely for an
   unchanged artifact.
2. In Backend, run the full tests and formatting/lint checks defined by `pyproject.toml`.
3. Run `scripts/refresh_all.py` against the exact stable Results and Polling release
   bundles and tags. Confirm the generated trustee cards contain 29 wards and only
   TCDSB Wards 4 and 5 carry `prior_win_under_50`.
4. Inspect `dist/release_manifest.json` and verify:

   - `feeds.trustee_race_cards == "trustee_race_cards.json"`;
   - the trustee artifact checksum matches;
   - the Results release, source commit, and manifest hash are exact; and
   - the Polling dependency remains exact.

5. Commit any generated tracked artifacts required by Backend's established release
   workflow, push the backend branch, merge through the normal PR path, and publish a
   stable GitHub release from a clean main checkout.

**Release gate:** Do not migrate production resolution until the stable backend
release containing `trustee_race_cards.json` exists.

### Task 4.2: Resolve, build, and preview the frontend

**Repository:** `toronto-election-poll-tracker`

**Steps:**

1. Run `node scripts/resolve-releases.mjs` and verify `.release-data` contains the
   backend trustee artifact, not the Results trustee artifact.
2. Confirm `.release-data/source_manifest.json` identifies the backend release and the
   exact Results revision pinned by it.
3. Run the complete frontend test suite and production build with the resolved data.
4. Start the local dev server using the enriched fixture and inspect:

   - `/trustees/tdsb/` and at least one open, two-incumbent, one-incumbent, and
     acclaimed detail page;
   - `/trustees/tcdsb/`, especially Wards 4 and 5;
   - `/trustees/viamonde/`, including Ward 3's rerun-backed ordinary incumbent; and
   - `/trustees/monavenir/`, including Ward 4's rerun-backed ordinary incumbent.

5. Verify ordering, badge absence/presence, long French-board area labels, responsive
   layout, keyboard focus, and amber/neutral contrast.
6. Commit only the intended frontend changes, push the branch, and merge through the
   normal PR path.

### Task 4.3: Manual production deployment

**Repository:** `toronto-election-poll-tracker`

**Steps:**

1. From clean, in-sync `main`, run `vercel --prod`. The Vercel build must resolve the
   latest stable Backend release and its pinned Results and Polling releases.
2. Inspect the production Trustees indexes and the TCDSB Ward 4 and Ward 5 detail
   pages.
3. Confirm the deployed source manifest records the expected backend and Results
   revisions.

**Final gate:** Production is complete only when the release chain, static build, and
public pages all show the same trustee-card artifact.
