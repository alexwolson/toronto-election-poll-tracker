# School Board Trustee Pages — Design Spec

**Date:** 2026-08-27
**Status:** Approved
**Design branch:** `codex/trustee-pages-design` in `toronto-election-poll-tracker`

---

## Goal

Add a public Trustees section covering every candidate certified for Toronto's 2026
school-board elections. The section will mirror Council structurally: a race index and
one detail page per ward, with the same candidate-history interaction used on Council
and mayoral pages.

The first release is factual. It establishes the complete, identity-reviewed data needed
to test whether Council-style attention scoring is valid for trustee elections, but it
does not publish a trustee attention score. Trustee ward geometry and maps are a later
phase and are not blockers for the first release.

## User-facing scope

The Trustees section covers all four publicly funded boards whose Toronto trustee
candidates are administered by the City Clerk:

1. Toronto District School Board (`tdsb`)
2. Toronto Catholic District School Board (`tcdsb`)
3. Conseil scolaire Viamonde (`viamonde`)
4. Conseil scolaire catholique MonAvenir (`monavenir`)

Candidate history follows the Council convention: verified Toronto election history
from 2003 onward, across municipal, school-board, provincial, and federal offices in the
canonical Results dataset. It is not a Canada-wide, no-time-limit career review like the
2026 mayoral cohort.

The initial certified source contains 118 trustee candidates in 29 contests:

| Board | Contests | Candidates at design time |
| --- | ---: | ---: |
| TDSB | 12 | 77 |
| TCDSB | 12 | 31 |
| Viamonde | 3 | 4 |
| MonAvenir | 2 | 6 |

Candidate counts describe the August 27 snapshot, not permanent schema constraints.
Results must accept a later Clerk correction while still requiring the complete set of
29 expected board/ward contests.

## Repository ownership

### Results

`toronto-election-results` owns:

- the certified 2026 trustee candidacies;
- the four board identities and 2026 boundary regimes;
- official trustee-to-City-ward crosswalks;
- final acclamation facts and pending contest status;
- current trustee incumbency evidence;
- persistent Person links and 2003+ Toronto candidacy histories; and
- the factual, schema-versioned `trustee_races.json` frontend feed.

### Frontend

`toronto-election-poll-tracker` owns:

- defensive feed validation and local/release loading;
- Trustees navigation and board tabs;
- board ward indexes and race-detail routes;
- reuse of the existing candidate-history presentation; and
- accessible, responsive rendering.

The frontend does not parse raw City data, resolve identities, infer incumbency, compare
boundary regimes, or calculate attention scores.

### Backend, later

`toronto-election-poll-tracker-backend` may later test whether Council attention-score
features and thresholds remain meaningful for trustee contests. Research belongs under
`research/` until it supports a production consumable. Any validated trustee score will
be generated and released by Backend, never recreated in the frontend.

## Source ingestion

### Certified candidate roster

Results will extend its existing 2026 pending-candidate adapter to download and parse:

`https://www.toronto.ca/data/elections/candidate_list/trusteeCandidates_2026.json`

The candidate-list page identifies the roster as certified. The JSON supplies four
school-board objects, their wards, active candidates, structured first and last names,
nomination dates, and contact fields. Results retains only candidacy facts. Email,
telephone, campaign-site, and social-media values remain outside the canonical Results
and frontend-feed contracts.

The adapter will:

- recognize office codes 3 through 6 as the four boards;
- require the expected ward sets for each board;
- accept only active candidates;
- preserve the Clerk's candidate order within each ward;
- reject duplicate board/ward entries and duplicate candidacies;
- record the source URL and snapshot metadata; and
- fail if any expected contest is absent, even if other contests parse successfully.

### Boundary regimes and crosswalk

Each board receives a distinct 2026 regime:

- `tdsb-trustee-wards-2026`
- `tcdsb-trustee-wards-2026`
- `viamonde-trustee-wards-2026`
- `monavenir-trustee-wards-2026`

TDSB's reduction from 22 wards in 2022 to 12 wards in 2026 is a substantive boundary
change. Results must not treat identical ward numbers across those regimes as seat
continuity.

The dated City PDF, *2026 Municipal Election — School Board Reference Chart*, is the
authoritative 2026 trustee-to-City-ward crosswalk. The City candidate application's JSON
dictionary is a validation input, not the authority: it currently omits City Ward 18
from MonAvenir Ward 3 while the newer PDF includes it. Tests will preserve this
deliberate resolution instead of silently inheriting the web application's omission.

French-board district names remain part of the canonical contest label:

- Viamonde 2 — Est, 3 — Centre, and 4 — Ouest
- MonAvenir 3 — Toronto Ouest and 4 — Toronto Est

### Acclamations

The City Clerk's August 24 declaration already declares four candidates elected by
acclamation:

- Frank D'Amico — TCDSB Ward 6
- Nancy Crawford — TCDSB Ward 12
- Benoit Fortin — Viamonde Ward 2
- Geneviève Oger — Viamonde Ward 4

Those four single-candidate contests are final results with `elected=true`,
`acclaimed=true`, `outcome_method=acclamation`, and null vote totals. The other 25
contests remain pending with null result fields.

Release validation will permit this narrow case of an officially final acclamation for
a future scheduled election. It will continue rejecting other post-cutoff candidacies
that claim final results without an accepted final-result method and source.

The build manifest will record the actual certified-candidate snapshot date instead of
retaining the pre-certification August 21 date.

## Identity and incumbency review

Every one of the 118 certified candidates receives a review against canonical Toronto
election history from 2003 onward. The review is cohort-complete, not limited to the 51
normalized exact-name leads found during the feasibility audit.

The existing Results identity standard applies:

- normalized name equality is a discovery lead, not sufficient proof by itself;
- an official roster, reliable article, biography, or other reliable source may bridge
  two occurrences to the same person;
- confirmed links reuse or create a persistent `person_id`;
- plausible but unconfirmed matches remain held and unpublished;
- ambiguous same-name occurrences remain separate; and
- an unlinked 2026 candidacy receives no attributed history.

Review evidence and dispositions remain auditable in Results. The public feed does not
need a negative-history label. Its coverage metadata states that the complete certified
cohort was reviewed under the Toronto-2003+ policy.

Incumbency is verified from dated official board rosters. It means that the person is a
sitting trustee for the same represented board before the 2026 election; it does not
claim that the person holds a newly drawn 2026 ward. The data model and feed allow zero,
one, or multiple incumbent trustees in one contest. This matters in the new TDSB Ward 1,
where two sitting TDSB trustees are candidates.

Board supervision does not erase a trustee's elected office for this factual flag.
Public copy will say "Incumbent Trustee", not "Ward incumbent", where boundary change
could otherwise imply false seat continuity.

## Results frontend feed

Results will publish `trustee_races.json` as a factual release asset with initial schema
version 1. The feed is nested by board and ward so the frontend does not reconstruct
contests from generic Results tables.

Illustrative contract:

```json
{
  "schema_version": 1,
  "event_id": "evt_27c3a2e636a457f1b1f922774525b74a",
  "election_date": "2026-10-26",
  "ballot_certified": true,
  "coverage": {
    "policy": "verified_toronto_electoral_history_since_2003",
    "jurisdiction": "Toronto",
    "year_cutoff": 2003,
    "cohort_size": 118,
    "review_date": "2026-08-27",
    "methodology_note": "Every certified 2026 trustee candidate was reviewed against Toronto election history from 2003 onward."
  },
  "boards": [
    {
      "board_id": "tdsb",
      "represented_body": "toronto_district_school_board",
      "display_name": "Toronto District School Board",
      "short_name": "TDSB",
      "boundary_regime": "tdsb-trustee-wards-2026",
      "wards": [
        {
          "contest_id": "con_example_tdsb_ward_1",
          "ward_id": "1",
          "district_name": "Ward 1",
          "city_wards": [1, 7],
          "result_status": "pending",
          "outcome_method": "pending",
          "acclaimed": false,
          "comparable_prior_result": null,
          "candidates": [
            {
              "candidacy_id": "can_example_candidate",
              "display_name": "Example Candidate",
              "person_id": "per_example_candidate",
              "is_incumbent": false,
              "past_elections": []
            }
          ]
        }
      ]
    }
  ]
}
```

The exact generated cohort size and review date reflect the release snapshot rather
than being hard-coded to the design-time values.

`past_elections` reuses the existing public history shape: election year and full date,
office, represented body, district, party where applicable, won/lost result, vote share,
rank, and field size. It is newest first and excludes the current pending candidacy.

`comparable_prior_result` reuses the factual prior-result shape used by Council but is
nullable. Results populates it only after verifying that the prior contest represents a
meaningfully continuous district. TDSB's newly drawn wards do not receive a prior result
merely because an old ward used the same number. For French contests rerun after the
voided 2022 elections, the completed 2023 contest is the prior result where applicable.

The feed excludes geometry, contact details, campaign links, attention scores,
defeatability measures, historical signals, and frontend copy labels.

## Frontend routes and navigation

The primary navigation adds `Trustees` adjacent to `Council`.

Routes are:

- `/trustees` — redirects to the default TDSB tab;
- `/trustees/tdsb`
- `/trustees/tcdsb`
- `/trustees/viamonde`
- `/trustees/monavenir`
- `/trustees/{board}/{ward}` — one detail page per certified contest.

The board tabs are ordinary links, remain usable without client-side state, expose the
active board with `aria-current`, and produce shareable, statically generated URLs.
Unknown board and ward combinations return 404.

The board order is TDSB, TCDSB, Viamonde, then MonAvenir. Wards sort by official numeric
identifier. Candidate rows retain the Clerk's order from the feed.

## Board index presentation

Each board page uses the Council section's editorial layout but no Council attention
sort. Every ward entry shows:

- official ward number and French geographic name where applicable;
- corresponding City wards in plain language;
- certified field size;
- contested or acclaimed status; and
- the name or count of incumbent trustees in the field, allowing multiple incumbents.

Every entry links to its ward detail page. The index does not display an attention
ranking, map, forecast, or poll.

## Ward detail presentation

Each detail page follows the Council page hierarchy:

1. board and ward heading;
2. a plain-language area description from the City-ward crosswalk;
3. factual incumbent/open-field and contested/acclaimed status;
4. the last comparable contest, when Results supplies one; and
5. the certified 2026 field with expandable candidate histories.

The existing `CandidateHistoryItem` component and `PastElection` display helpers remain
the single implementation for election-history rows. Trustee-specific presentation may
wrap that component but must not fork its history rendering. The shared history row will
add vote share when available, so Council, mayoral, and trustee histories present that
fact consistently rather than giving Trustees a separate renderer.

Sitting trustees receive the summary prefix `Incumbent Trustee`. Verified history also
produces the existing former-office/race-count summary. The dropdown includes every
linked Toronto candidacy since 2003 with result, placement, vote share, party where
applicable, and district.

A candidate with no verified linked history appears as a plain name row: no flag, no
dropdown, and no "no verified history" label. Internal identity-review statuses are not
rendered. Coverage limitations appear only when there is concise, user-relevant
information; technical dossier language is not exposed.

No "Returning" claim is made merely from matching trustee ward numbers across boundary
regimes. A future returning label may be derived only from comparable contest facts.

## Loading and failure behaviour

The frontend release resolver and local-sibling workflow add the Results-owned
`trustee_races.json` feed. Production continues to resolve the latest stable Backend
release, then the exact Results and Polling releases pinned by its manifest. A Backend
integration release must therefore pin the Results release containing the trustee feed,
even though Backend does not transform that factual asset. Local development may use
sibling Results output or checked-in contract fixtures.

The frontend accepts only schema version 1 and validates the complete four-board,
29-contest structure. It never renders a partially valid subset as though it were the
certified field.

- Missing, malformed, uncertified, or structurally incomplete data produces one concise
  section-level unavailable message.
- Invalid board or ward paths produce 404.
- Candidate-level absence of verified history is normal and produces a plain row, not an
  error message.
- A production build fails if the required released asset or checksum cannot be
  validated; honest empty states remain available for local development and tests.

## Validation and testing

### Results

Focused and full-suite tests will verify:

- office-code and board mapping;
- all expected board/ward contests are present exactly once;
- active candidates are emitted exactly once and preserve source order;
- candidate-count changes do not bypass contest-completeness checks;
- all four 2026 boundary regimes and French ward names;
- the authoritative MonAvenir Ward 3 crosswalk includes City Ward 18;
- contact and campaign fields are excluded;
- four acclamations are final, elected, single-candidate contests with null votes;
- the remaining contests and candidacies remain pending with null results;
- future-dated official acclamations pass the narrow validation rule while unsupported
  future final results fail;
- candidate snapshot metadata is current;
- every certified candidate has an identity-review disposition;
- confirmed history follows `person_id`, never name-only reconstruction;
- held and ambiguous identities publish no guessed history;
- incumbency evidence supports zero, one, or multiple incumbents per contest;
- comparable prior results never cross an unverified boundary change;
- the schema-versioned feed and release manifest validate; and
- CSV, Parquet, and JSON release artifacts remain internally consistent.

### Frontend

Focused and full-suite tests will verify:

- schema validation and production/local failure behaviour;
- `/trustees` default routing and all four board tabs;
- static board/ward params and 404 handling;
- ward index ordering, field counts, City-ward copy, and acclamation status;
- a contest with multiple incumbent trustees;
- detail-page comparable-prior-result presence and omission;
- incumbent trustee summaries;
- expandable verified histories and plain no-history rows;
- preservation of existing Council and mayoral candidate-history interaction, with the
  deliberate shared addition of vote share where available;
- Trustees navigation and active states; and
- concise unavailable rendering for an invalid complete feed.

The frontend's test suite, lint, and production build must pass. Desktop and mobile
browser checks will verify tab overflow, ward-list readability, disclosure controls,
breadcrumbs, keyboard focus, and long French names.

## Delivery sequence

1. Extend Results ingestion, boundary metadata, acclamation semantics, and validation.
2. Review all certified trustee identities and current board incumbency evidence.
3. Generate, validate, and publish `trustee_races.json` in a Results GitHub release.
4. Publish a Backend integration release that pins the new Results release and its
   compatible Polling release without deriving trustee analytics.
5. Add frontend contract fixtures, types, release loading, navigation, indexes, and
   detail routes.
6. Resolve the Backend-pinned immutable release set during `vercel --prod` and verify
   the production Trustees routes.

The frontend is not deployed against an unreleased local Results contract. Each
repository receives focused commits and its own reviewable pull request.

## Later phases

### Attention scoring

Backend research may compare trustee contests with Council's exposure features,
thresholds, base rates, and outcome definitions. No score is published until trustee
data supports a robust validation. If validated, Backend owns the production feed and
methodology; the frontend only displays it.

### Geometry

The current `school_board_district_geometry_not_acquired` state in Results is descriptive,
not permanent. A later Results phase will acquire authoritative boundaries for all four
2026 board regimes, publish provenance and geometry, and enable frontend maps without
changing candidacy or history semantics.

## Non-goals for the first release

- Trustee attention rankings, defeatability scores, historical signals, forecasts, or
  polls.
- Ward maps or geometry acquisition.
- Campaign biographies, portraits, contact details, social links, or endorsements.
- Search, filtering, or cross-board candidate ranking.
- Canada-wide or pre-2003 career research.
- Frontend identity matching, boundary comparison, or result derivation.
- Claims that an unlinked candidate has never sought office.
