# 01: Order same-year candidate races by full election date

**What to build:** Candidate election histories should be genuinely most-recent-first, including when a person contested more than one election in the same calendar year. Chronology must follow the elections' actual dates rather than source-row order or an office-based tie-breaker, while the compact public presentation may continue to display only the year.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [ ] Dianne Saxe's October 24, 2022 council victory appears before her June 2, 2022 provincial race in Ward 11's candidate history.
- [ ] Every candidate's past races are ordered by full election date descending, including races that share a year.
- [ ] Ranked-ballot rounds remain collapsed to one history entry per contest after chronological ordering.
- [ ] The generated council race-card feed and the certified frontend fixture carry the corrected order.
- [ ] The public history may continue to show a year-only date label without losing the correct same-year ordering.
- [ ] Regression coverage includes two races in the same year supplied in an order that differs from their actual chronology, plus the rendered Ward 11 result.

## Answer

`past_election_history` (`backend/model/council_hints.py`) now carries the full
`election_date` on each `PastElection` and sorts by it descending (ISO dates
sort lexically == chronologically), replacing the year-only sort. Contest
grouping (ranked-ballot collapse) is unchanged and happens before the sort, so
one entry per contest is preserved. The feed emits `election_date` alongside the
year-only display field; the council feed and the certified frontend fixture were
regenerated. The frontend renders `past_elections` in feed order via `.map`, and
displays the year-only label unchanged.

**Coverage:**
- `tests/model/test_council_hints.py::test_past_election_history_orders_same_year_by_full_date` — two same-year races (June MPP, October councillor) supplied provincial-first; asserts councillor-before-MPP.
- `tests/model/test_council_snapshot.py::test_ward_11_saxe_history_orders_same_year_by_full_date` — the real generated Ward 11 card: Dianne Saxe's Oct-24-2022 council win precedes her Jun-2-2022 provincial race, and all dates are date-descending.
- Verified in the regenerated feed: Saxe → `2022-10-24 councillor won` before `2022-06-02 mpp lost`.
