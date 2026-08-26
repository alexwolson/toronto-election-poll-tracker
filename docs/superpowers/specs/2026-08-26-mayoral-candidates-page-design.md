# Mayoral Candidates Page — Design Spec

**Date:** 2026-08-26  
**Status:** Awaiting written review  
**Branches:** `codex/mayoral-candidates` in both `toronto-election-poll-tracker` and `toronto-election-poll-tracker-data`

---

## Goal

Add a public page listing every candidate on Toronto's certified 2026 mayoral ballot. The page will show confirmed past-election history for candidates who resolve to a person in the canonical election-results dataset and will use the same candidate-row interaction and visual language as ward detail pages.

The page is descriptive. It does not rank candidates, infer experience, display council-specific historical signals, or treat a missing canonical match as evidence that a candidate has never run before.

---

## Scope

This feature spans two repositories:

- `toronto-election-poll-tracker-data` builds and publishes a new schema-versioned `mayoral_candidates.json` feed.
- `toronto-election-poll-tracker` loads the feed and renders the new `/candidates` route.

The certified ballot is the complete active field in `data/raw/candidates/mayor_registered.csv` after the live cycle's explicit `field_certified` flag is true. The current source contains 53 candidates.

---

## Data Architecture

### Dedicated feed

Candidate biography does not belong in the polling or forecast feeds. A dedicated feed keeps ballot membership and canonical election history independent of whether a candidate has appeared in a poll or qualifies for a forecast quantity.

The publication package will add:

- feed key: `mayoral_candidates`
- filename: `mayoral_candidates.json`
- initial schema version: `1`

The manifest's `feeds` and `feed_versions` maps will advertise the new feed.

### Feed contract

```json
{
  "schema_version": 1,
  "election_cycle_id": "toronto-2026",
  "ballot_certified": true,
  "candidates": [
    {
      "candidate_id": "chow",
      "display_name": "Olivia Chow",
      "status": "Active",
      "person_id": "per_...",
      "is_matched": true,
      "is_incumbent": true,
      "past_elections": []
    }
  ]
}
```

Field meanings:

- `candidate_id` is the stable current-cycle candidate ID used by the mayoral polling and forecast code. It is a poll-compatible slug, not a canonical identity.
- `person_id` is the persistent ID from the canonical election-results dataset. It is nullable when the registration cannot be resolved uniquely.
- `is_matched` is true only when `person_id` resolves uniquely and has attributable canonical history.
- `is_incumbent` is derived by comparing `candidate_id` with the live cycle's `incumbent_candidate_id`.
- `past_elections` uses the existing public `PastElection` shape and is ordered newest first.

Keeping `candidate_id` and `person_id` separate prevents current-cycle modelling identifiers from being mistaken for cross-election person identity.

### Candidate IDs

The existing current-field ID generation in `mayoral_forecast_feed.py` will move to a small shared helper used by both the forecast builder and candidate-feed builder. Existing major-candidate IDs (`chow`, `bradford`, and `alexander`) remain unchanged. Minor candidates retain deterministic normalized name slugs. Duplicate generated IDs are a build error rather than being silently collapsed.

### Canonical matching

The candidate-feed builder will reuse the existing all-offices history loader, generous token-set name resolver, and `past_election_history` conversion used by council cards.

Matching rules remain conservative:

- a name resolving to exactly one canonical `person_id` is matched;
- a name resolving to zero people is unmatched;
- a name resolving to multiple people is ambiguous and remains unmatched;
- unmatched or ambiguous candidates receive `person_id: null`, `is_matched: false`, and an empty `past_elections` array;
- the builder never reconstructs history from same-named rows after resolution.

The feed includes only active registrations. When `field_certified` is false, it reports `ballot_certified: false` and an empty candidate list so the frontend cannot accidentally publish a provisional field as final.

### Build integration

`scripts/build_publication_snapshot.py` will build `mayoral_candidates.json` before the manifest and add its schema version to the manifest. Focused unit tests will exercise the builder directly; publication-package tests will verify the emitted file and manifest entry.

The processed output and the frontend's certified fixtures will be regenerated from the builders rather than edited by hand.

---

## Frontend Architecture

### Types and loading

`src/types/feeds.ts` will add `MayoralCandidate` and `MayoralCandidatesFeed`. `PastElection` remains the shared history record.

`src/lib/feeds.ts` will add `loadMayoralCandidates()`, accepting only schema version 1 and falling back to an uncertified empty feed. A missing, malformed, or uncertified feed must not produce a partial candidate list.

### Shared candidate-history presentation

The ward detail page's candidate-history markup will move into `src/components/candidate-history.tsx` so both routes use one implementation for:

- plain rows when there is no confirmed history or other expandable content;
- expandable rows with the disclosure arrow;
- the compact history headline;
- year, office, district, party, and result rows;
- optional route-specific detail content.

`historyHeadline` will accept the current office type instead of a council-specific boolean. A sitting councillor excludes current councillor wins from the "Former ..." label; the sitting mayor excludes current mayoral wins. Past races still count in the displayed race total.

The ward route will preserve its existing same-ward return details and council-specific signals through the shared component's optional detail content. No ward behavior or wording changes are intended.

### Route and navigation

- Route: `/candidates`
- Navigation label: `Candidates`, placed after `Mayor` and before `Polls`
- Metadata title: `Mayoral Candidates — Toronto 2026 Election`

The page is a server component and loads the dedicated candidate feed. It does not join against polling or forecast feeds in the frontend.

### Page content

The page follows the established newspaper layout:

- kicker: `Mayor`
- heading: `The 2026 mayoral field`
- introductory copy explaining that the list is the certified ballot and that expandable histories contain confirmed prior elected-office races;
- field heading with the certified candidate count;
- candidates sorted by last name and then first name as supplied by the candidate-feed builder;
- the same candidate rows used on ward detail pages.

Candidates without confirmed history appear as plain name rows. The public page does not show an internal "unmatched" badge or claim that these candidates have no prior history.

If the feed is missing, malformed, or uncertified, the page displays a concise unavailable message and no candidate rows.

---

## Testing and Verification

### Data repository

Unit tests will verify:

- all 53 active certified registrations are emitted exactly once;
- ordering is deterministic by last name and first name;
- major candidate IDs remain compatible with polling and forecast IDs;
- minor candidate IDs are deterministic and unique;
- exact unique matches attach `person_id` and newest-first `past_elections`;
- unmatched and ambiguous names remain unresolved without guessed history;
- Olivia Chow is marked as the incumbent;
- an uncertified cycle emits no candidates;
- the publication manifest contains the new feed and schema version.

The data repository's full test, lint, and formatting checks must pass.

### Frontend repository

Tests will verify:

- feed validation and the safe uncertified fallback;
- the page renders the certified count and all candidate names;
- matched histories use expandable rows and existing election formatting;
- candidates without history use plain rows;
- the incumbent headline does not call Olivia Chow a former mayor;
- ward candidate rows retain their current output after component extraction;
- the Candidates navigation link and active state work;
- an unavailable feed produces the honest empty state.

The frontend's focused tests, full test suite, lint, and production build must pass. The finished page will also receive a browser-width visual check at desktop and mobile sizes.

---

## Non-Goals

- Candidate ranking, filtering, search, portraits, biographies, or campaign links.
- Forecast probabilities or polling shares on the candidate page.
- Council-specific historical-hint signals on mayoral candidates.
- Manual identity overrides introduced only in the frontend.
- Name-only joins between frontend feeds.
- Claims that an unresolved candidate has never sought elected office.

