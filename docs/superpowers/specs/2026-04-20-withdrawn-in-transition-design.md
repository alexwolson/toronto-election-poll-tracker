# Withdrawn-in-Transition Pool Field

**Date:** 2026-04-20  
**Status:** Approved

## Problem

The pool model's `uncaptured_anti_chow` field currently means "anti-Chow pool minus Bradford's capture", which mixes two distinct voter groups:

1. Voters who were recently behind a candidate who has since withdrawn (Furey, Ford, etc.) — genuinely anti-Chow but currently unallocated
2. Voters who have never committed to any named anti-Chow candidate — genuinely uncommitted

With Furey's withdrawal, the April 13 Liaison poll (Bradford 35%, Furey 11%) dominates the recency-weighted calculation. Bradford's 32.3% capture against a 38.3% anti-Chow pool produces a capture rate of 84.3% — misleading because it implies Bradford has nearly swept up all opposition support. In reality, ~11% was Furey's and is in genuine flux.

The fix is transparency, not redistribution: decompose `uncaptured_anti_chow` into two named components so the model accurately represents what it knows and what it doesn't.

## Design

### New function: `compute_withdrawn_share`

```python
def compute_withdrawn_share(
    polls_df: pd.DataFrame,
    declined_ids: set[str],
    reference_date: datetime | None = None,
) -> float:
```

- Filters to multi-candidate polls (2+ non-Chow candidates), same as `compute_candidate_capture_rates`
- Applies 12-day recency decay (same `CURRENT_HALF_LIFE_DAYS` constant)
- Sums shares across all `declined_ids` columns present in the dataset
- Returns the recency-weighted total share going to withdrawn candidates

The 12-day half-life naturally handles staleness: Tory's year-old poll appearances decay to near-zero; Furey's April 13 appearance dominates.

### Changed output fields in `compute_pool_model`

`DECLINED_CANDIDATE_IDS` from `backend/model/candidates.py` is imported into `pool.py` and passed to `compute_withdrawn_share`.

Two output fields change:

| Field | Before | After |
|---|---|---|
| `uncaptured_anti_chow` | `anti_chow_pool - bradford_share` | `max(0, anti_chow_pool - bradford_share - withdrawn_share)` |
| `withdrawn_in_transition` | *(absent)* | new top-level field: recency-weighted withdrawn candidate share |

No other pool metrics change — floor, ceiling, Bradford's `share`/`capture_rate`, consolidation trend, and approval are unaffected.

**Invariant:** `bradford_share + withdrawn_in_transition + uncaptured_anti_chow ≤ anti_chow_pool` (the inequality accounts for voters in the "not sure" approval bucket who appear in polling but aren't strictly in the disapprove pool).

### Frontend: TypeScript type update

`PoolModel` in `frontend/src/lib/api.ts` gets one new field:

```ts
withdrawn_in_transition: number;
```

`computeDotCounts` in `frontend/src/lib/dot-counts.ts` requires no changes — it reads `model.uncaptured_anti_chow` for the hollow red (anti-available) dots, which will automatically reflect the corrected semantics.

`withdrawn_in_transition` is not visualized in the dot grid. These voters are in genuine limbo and cannot be honestly placed in either zone. The field is available for future use (contextual notes, tooltips, etc.).

### Tests

In `tests/model/test_pool.py`:

- `test_compute_pool_model_returns_all_required_keys` — add assertion for `withdrawn_in_transition` key
- New test `test_withdrawn_in_transition_non_negative` — asserts:
  - `withdrawn_in_transition >= 0`
  - `uncaptured_anti_chow >= 0`
  - `bradford_share + withdrawn_in_transition + uncaptured_anti_chow <= anti_chow_pool + 0.02` (small tolerance for approval/polling misalignment)

## Files Changed

| File | Change |
|---|---|
| `backend/model/pool.py` | Add `compute_withdrawn_share`; import `DECLINED_CANDIDATE_IDS`; update `compute_pool_model` |
| `frontend/src/lib/api.ts` | Add `withdrawn_in_transition: number` to `PoolModel` type |
| `tests/model/test_pool.py` | Update key assertion; add new invariant test |
