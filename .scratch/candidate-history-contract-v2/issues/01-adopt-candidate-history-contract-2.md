# 01: Adopt candidate-history contract 2.0 end to end

**What to build:** Replace the live site's retired six-hint, all-but-council
candidate-history implementation with the upstream schema-2.0 public catalog and
its reader-visible history rules. Aggregate history must use every confirmed
prior elected-office race, including council; an individual hint may instead name
one office type. Regenerate the council feed and update the frontend explanations
so ward pages publish only the two currently catalogued hints.

**Blocked by:** None. The upstream analysis and contract are complete in
`defeatability-index`.

**Status:** resolved

- [ ] Re-sync `historical_hint_contract.json` and
  `supported_historical_hints.csv` from `defeatability-index`; the vendored
  contract is schema 2.0.0 and the public catalog contains exactly
  `own_prior_win_type__trustee` and
  `own_any_all_past_race_victory__non_incumbent_non_returning`.
- [ ] Update ADR 0047 and the data implementation to remove the retired rule that
  excluded council races except for Returning councillors. For an aggregate
  feature, every confirmed candidacy with `election_date` before the subject
  contest counts: councillor, mayor, trustee, MP, and MPP, won or lost.
- [ ] The candidate feature frame supplies the schema-2 all-history fields needed
  by the public trigger, including complete prior-candidacy and victory counts,
  whether the candidate is a Returning councillor, and whether the candidate is
  the sitting incumbent. The public binary victory hint fires only for a candidate
  in an open contest or a non-incumbent facing an incumbent, who is not a Returning
  councillor, has at least one confirmed prior race, and has at least one prior win.
- [ ] The importer understands the schema-2 trigger operator and candidate regime;
  it does not silently load the new CSV while failing to fire its new hint.
- [ ] The universal zero-wins and per-additional-victory hints are retired. A
  candidate with no prior victories receives neither a negative hint nor
  positive-sounding copy about “each additional victory.” The old most-recent
  qualifying-margin and opponent-margin hints are also absent from the public
  feed.
- [ ] Huy Lieu's complete visible history and computed provenance both contain his
  two confirmed prior losses—the 2025 council race and 2022 trustee race—with zero
  victories. No text describes only one of those races, and no zero-wins hint is
  displayed.
- [ ] Naser Kaid and Malik Ahmad do not receive public hints merely because they
  have prior losses. Zakir Patel may receive the office-specific trustee hint and
  the binary prior-win hint, with the latter based on all three visible prior races
  (the 2025 council loss plus his two trustee wins), not an all-but-council subset.
- [ ] The new binary-win hint carries structured provenance sufficient for a short
  race-specific positive explanation and accessible direction icon. The frontend
  handles the new ID and removes handlers/tests for the retired most-recent,
  opponent, open-seat officeholder, and victory-count hint IDs.
- [ ] Opponent-field completeness follows the upstream contract whenever opponent
  features are evaluated: unresolved identities are not silently treated as “no
  history.” Diagnostic-only definitions do not enter the public feed.
- [ ] Rebuild `data/processed/council_race_cards.json` and the frontend fixture.
  Across the complete built feed, every `historical_hints[].hint_id` belongs to the
  two-row public catalog and none of the four retired IDs remains.
- [ ] Regression coverage proves visible-history parity, the binary trigger's
  candidate-regime gates, the named Ward 11/20/25 cases, and the absence of
  zero-win/per-additional-win copy. Data tests, frontend tests, lint, and builds
  pass.

## Diagnosis

The upstream result is correct and complete; the integration has not run. The
upstream contract is 2.0.0 with two public rows, while the data repository still
vendors contract 1.1.0 and six public rows. Its processed council feed contains
those same six retired IDs. This is not only a stale-file problem:
`backend/model/council_hints.py` still computes the old conditional council-history
scope and supports only the old trigger fields/operators/regimes, while
`src/lib/council-signals.ts` switches on the retired IDs.

A deterministic repro is:

```text
diff -u toronto-election-poll-tracker-data/data/raw/hints/supported_historical_hints.csv \
  defeatability-index/data/out/candidate_history/supported_historical_hints.csv
```

It currently shows six old data-repo rows versus two upstream rows. After the raw
sync, implementation migration, and processed-feed rebuild, the catalog diff
should be empty and the built feed's unique hint-ID set should be a subset of the
two upstream IDs.

## Answer

Migrated the data pipeline and ward UI to historical-hint contract 2.0. The
vendored upstream contract and two-row catalog now match `defeatability-index`
exactly. Candidate features count every confirmed prior race, including council,
and the council feed schema is v4. The only emitted IDs are the trustee-win hint
and the binary prior-win hint for eligible non-incumbent, non-returning candidates;
zero-win, per-additional-victory, most-recent-margin, and opponent hints are gone.

The binary hint's provenance uses the same complete history displayed to readers.
The frontend renders it as, for example, “Won 2 of 3 previous races,” with the
positive direction icon, and ignores every retired ID. The separate “Notable
challengers” section was removed because it duplicated the candidate-level
prior-win fact.

Verified in the built feed and rendered pages:

- Ward 11: Huy Lieu shows both prior losses and no hint; Dianne Saxe shows her
  2022 council win before her 2022 MPP loss and no false “most recent loss” hint.
- Ward 20: Naser Kaid and Malik Ahmad show their complete histories and no hint.
- Ward 25: Zakir Patel shows the 2025 council loss plus two trustee wins, then the
  trustee hint and “Won 2 of 3 previous races.”

The original catalog diff is now empty, the processed feed contains only the two
schema-2 IDs, all 308 data tests and 148 frontend tests pass, targeted lint and
format checks pass, and the production frontend build succeeds.
