# Trustee Race Context and Vote-Share Signal

**Date:** 2026-08-27  
**Status:** Design approved; written specification pending review

## Purpose

Give readers a useful ordering and a small amount of factual context for Toronto's
2026 trustee races without presenting an unvalidated trustee Defeatability Index.

The Councillor Defeatability Index uses three measurements: the incumbent's share
of valid votes, their votes as a share of all eligible electors, and estimated
electorate growth relative to their winning margin. The latter two cannot be
reproduced responsibly for TCDSB, Conseil scolaire Viamonde, or Conseil scolaire
catholique MonAvenir with the available data. Eligibility for those boards is a
restricted subset of the municipal electorate, and the canonical trustee results
do not contain board-specific eligible-elector totals.

The trustee feature will therefore use only the prior winner's share of valid
votes. It is a descriptive signal and ordering rule, not an index, probability, or
forecast.

## Scope

This work covers all four Toronto school boards:

- TDSB retains its approved field-structure classification because its 2026 wards
  were redrawn and prior ward results are not geographically comparable.
- TCDSB, Viamonde, and MonAvenir use a single prior-vote-share signal where ward
  geography is continuous.
- The existing candidate histories, incumbent flags, prior-result summaries,
  acclamations, and ward-area descriptions remain unchanged.

No electorate-share proxy, estimated school-support population, composite score,
or trustee win probability will be created.

## Repository Ownership

### Results repository

The results repository remains canonical for:

- the certified 2026 trustee field;
- verified candidate and incumbent identities;
- current-to-prior contest continuity;
- prior trustee results and vote shares; and
- candidate electoral histories.

Its existing `trustee_races.json` release artifact supplies the backend input. The
signal must not introduce a second identity-matching system or compare names as
strings.

### Backend repository

The backend consumes `trustee_races.json`, assigns the race context, orders the
wards, and publishes an enriched consumer artifact named
`trustee_race_cards.json`.

This artifact contains the results-owned trustee facts plus a backend-owned
`race_context` object for every ward. The backend release manifest records the
exact results release and source commit used to build it.

The backend also takes ownership of the TDSB classification currently derived in
the frontend. Moving it upstream restores the agreed boundary: data and derived
classifications upstream, presentation in the frontend.

### Frontend repository

The frontend reads `trustee_race_cards.json`. It maps stable category keys to
approved labels and styles, but does not count incumbents, compare vote shares,
choose a prior election, assign a category, or reorder wards.

The manual production-deployment resolver downloads the backend trustee artifact.
A production build fails validation rather than silently falling back to a results
artifact with a different contract.

## Backend Contract

Each ward gains a `race_context` object with this conceptual shape:

```json
{
  "method": "continuous_ward_vote_share",
  "category": "won_without_majority",
  "sort_priority": 1,
  "signal": {
    "key": "prior_win_under_50",
    "subject_person_id": "per_example",
    "subject_name": "Example Trustee",
    "election_year": 2022,
    "vote_share": 0.4521140436
  }
}
```

For a ward without a fired vote-share signal, `signal` is `null`. The public label
is derived only from the stable `category` key; the frontend does not infer the
category from the numbers.

### TDSB categories

TDSB uses `method: "tdsb_field_structure"` and these priorities:

| Priority | Category | Meaning |
| ---: | --- | --- |
| 0 | `open` | No verified sitting trustee is in the certified field. |
| 1 | `two_incumbents` | Two verified sitting trustees are in the field. |
| 2 | `one_incumbent` | One verified sitting trustee is in the field. |
| 3 | `acclaimed` | The race was decided by acclamation. |

Acclamation is checked first. Incumbent count supplies the remaining category.
Ward number breaks ties in the published order.

### TCDSB, Viamonde, and MonAvenir categories

The geographically continuous boards use
`method: "continuous_ward_vote_share"` and these priorities:

| Priority | Category | Public treatment |
| ---: | --- | --- |
| 0 | `open` | Show **Open race**. |
| 1 | `won_without_majority` | Show **Won without a majority** and the factual vote-share explanation. |
| 2 | `contested_incumbent` | No badge; retain the existing incumbent facts. |
| 3 | `acclaimed` | Show **Elected by acclamation**. |

The `won_without_majority` category requires all of the following:

1. The race is not acclaimed.
2. Exactly one verified incumbent is in the certified field.
3. The incumbent is linked by canonical `person_id` to the applicable prior win in
   the same represented body and continuous trustee ward.
4. The prior win is the latest completed comparable contest before 2026, including
   the January 2023 reruns for Viamonde Ward 3 and MonAvenir Ward 4.
5. The incumbent's winning share is strictly below `0.50`.

The backend uses the incumbent's verified person-linked history and cross-checks
its year and share against the ward's comparable prior result. It never decides
identity by comparing the incumbent and prior-winner display names.

Open-race and acclamation categories supersede the vote-share signal. Missing,
inconsistent, or ambiguous prior data yields `contested_incumbent` with a null
signal; it never guesses.

## Current Expected Classification

Under the certified field and current canonical history:

- TCDSB Wards 4 and 5 fire `prior_win_under_50`:
  - Teresa Lubinski, 48.9% in 2022;
  - Maria Rizzo, 45.2% in 2022.
- No current Viamonde or MonAvenir incumbent fires the signal.
- Viamonde Ward 3 and MonAvenir Ward 4 correctly use their January 23, 2023 rerun
  results, but both winners received more than 50%.
- Open races sort before the signal-bearing races.
- Acclamations sort last.

These expected facts are contract tests, not hard-coded production categories.

## Public Presentation

### Board indexes

For TCDSB, Viamonde, and MonAvenir, cards appear in backend order:

1. open races;
2. incumbents who won the applicable prior contest with under 50%;
3. other contested incumbent races; and
4. acclamations.

Ward number breaks ties. TDSB retains its separately approved order: open, two
incumbents, one incumbent, acclaimed.

Badges appear on index cards for `open`, `won_without_majority`, and `acclaimed`.
An ordinary `contested_incumbent` receives no badge.

### Ward detail pages

The same badge appears in the detail hero. A fired vote-share signal also produces
one plain factual sentence in the election section, for example:

> Maria Rizzo won this ward in 2022 with 45.2% of votes cast.

The copy uses the actual incumbent name, applicable election year, and formatted
share from the backend signal. It does not say the incumbent is vulnerable or
likely to lose.

### Language and colour

The feature does not use **Defeatability Index**, **high attention**, **elevated**,
**quiet**, or predictive terminology.

- `won_without_majority` uses a dedicated amber trustee treatment.
- `open` uses the established trustee open-race treatment.
- `acclaimed` uses a neutral treatment.
- Existing TDSB field-structure colours remain unchanged.

Each continuous-board index includes a short note explaining that the ordering
uses only the prior winner's share of votes cast and is not a forecast.

## Validation and Failure Behaviour

Backend validation rejects an artifact when:

- a category is not valid for its declared method;
- sort priorities disagree with the category contract;
- a vote-share signal lacks its subject identity, election year, or share;
- a share lies outside `[0, 1]`;
- a `won_without_majority` share is not below `0.50`;
- an open or acclaimed race carries a vote-share signal; or
- the declared results release dependency is missing.

The frontend validates the enriched schema before rendering. In production, a
missing or invalid artifact fails the build. Development fixtures must implement
the same contract.

## Testing

### Backend

- Unit-test every TDSB and continuous-board category.
- Test open and acclamation precedence.
- Test the strict under-50 threshold boundary.
- Test canonical person linkage and reject name-only matches.
- Test 2023 rerun selection for Viamonde Ward 3 and MonAvenir Ward 4.
- Test missing and conflicting history produces no signal.
- Test ordering by priority and ward number.
- Assert the current certified-field expectation that only TCDSB Wards 4 and 5
  fire the vote-share signal.
- Validate the release schema and results-release provenance.

### Frontend

- Verify all public labels and badge locations.
- Verify the factual explanation uses backend-provided year and share.
- Verify ordinary incumbent races receive no badge.
- Verify TDSB and continuous-board notes are distinct.
- Verify the frontend preserves upstream order.
- Add a guard test proving no vote-share comparison or incumbent-count
  classification remains in frontend trustee helpers.

### End-to-end release check

Build a backend release from a pinned results release, resolve it into the frontend,
and statically build every trustee index and detail route. The resolved release
metadata must identify the same backend and results revisions used by the artifact.

## Rollout

1. Add backend ingestion, classification, tests, and the enriched artifact.
2. Publish a backend release built against the current results release.
3. Update frontend fixtures, schema validation, and loaders.
4. Remove frontend-derived TDSB classification and sorting.
5. Add the approved continuous-board badges, ordering, notes, and explanations.
6. Run the refresh, release, resolution, and manual production deployment cycle.

The polling repository is unaffected.
