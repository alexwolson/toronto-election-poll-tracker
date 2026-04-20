# Withdrawn-in-Transition Pool Field Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `withdrawn_in_transition` field to the pool model that tracks the recency-weighted share going to candidates who have since withdrawn, redefining `uncaptured_anti_chow` to mean genuinely uncommitted anti-Chow voters.

**Architecture:** One new pure function `compute_withdrawn_share` in `pool.py` mirrors the mechanics of `compute_candidate_capture_rates` but sums across all declined candidate IDs. `compute_pool_model` imports `DECLINED_CANDIDATE_IDS` from `candidates.py`, calls the new function, and splits the old `uncaptured_anti_chow` into two named components. The TypeScript `PoolModel` type gains one field.

**Tech Stack:** Python 3.12, pandas, pytest (`PYTHONPATH=. uv run pytest`), TypeScript

---

## File Structure

| File | Change |
|---|---|
| `backend/model/pool.py` | Add `compute_withdrawn_share`; import `DECLINED_CANDIDATE_IDS`; update `compute_pool_model` |
| `tests/model/test_pool.py` | Add 3 unit tests for `compute_withdrawn_share`; update `test_compute_pool_model_returns_all_required_keys`; add `test_withdrawn_in_transition_non_negative` |
| `frontend/src/lib/api.ts` | Add `withdrawn_in_transition: number` to `PoolModel` type |

---

### Task 1: Add `compute_withdrawn_share` with unit tests

**Files:**
- Modify: `backend/model/pool.py`
- Modify: `tests/model/test_pool.py`

- [ ] **Step 1: Write the three failing unit tests**

Add to `tests/model/test_pool.py` after the existing imports:

```python
from datetime import datetime, timezone
```

Add these three tests at the end of the file:

```python
def test_compute_withdrawn_share_returns_declined_share():
    """Single multi-candidate poll: withdrawn candidate share is returned."""
    from backend.model.pool import compute_withdrawn_share
    polls = pd.DataFrame([{
        "date_published": "2026-04-13",
        "field_tested": "bradford,chow,furey",
        "bradford": 0.35,
        "chow": 0.46,
        "furey": 0.11,
    }])
    result = compute_withdrawn_share(
        polls, {"furey"},
        reference_date=datetime(2026, 4, 13, tzinfo=timezone.utc),
    )
    assert abs(result - 0.11) < 0.001


def test_compute_withdrawn_share_excludes_h2h_polls():
    """H2H polls (only 1 non-Chow candidate) are excluded."""
    from backend.model.pool import compute_withdrawn_share
    polls = pd.DataFrame([{
        "date_published": "2026-04-13",
        "field_tested": "bradford,chow",
        "bradford": 0.38,
        "chow": 0.47,
    }])
    result = compute_withdrawn_share(polls, {"furey"})
    assert result == 0.0


def test_compute_withdrawn_share_empty_declined_ids():
    """Empty declined set returns 0.0 regardless of poll content."""
    from backend.model.pool import compute_withdrawn_share
    polls = pd.DataFrame([{
        "date_published": "2026-04-13",
        "field_tested": "bradford,chow,furey",
        "bradford": 0.35,
        "chow": 0.46,
        "furey": 0.11,
    }])
    result = compute_withdrawn_share(polls, set())
    assert result == 0.0
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
PYTHONPATH=. uv run pytest tests/model/test_pool.py::test_compute_withdrawn_share_returns_declined_share tests/model/test_pool.py::test_compute_withdrawn_share_excludes_h2h_polls tests/model/test_pool.py::test_compute_withdrawn_share_empty_declined_ids -v
```

Expected: 3 failures with `ImportError: cannot import name 'compute_withdrawn_share'`

- [ ] **Step 3: Implement `compute_withdrawn_share` in `pool.py`**

Add this function immediately after `compute_candidate_capture_rates` (after line 191 in the current file, before `compute_consolidation_trend`):

```python
def compute_withdrawn_share(
    polls_df: pd.DataFrame,
    declined_ids: set[str],
    reference_date: datetime | None = None,
) -> float:
    """Recency-weighted share going to withdrawn/declined candidates in multi-candidate polls.

    Uses multi-candidate polls (2+ non-Chow candidates) and 12-day half-life decay,
    matching the mechanics of compute_candidate_capture_rates. Sums shares across
    all declined_ids that appear as columns in the dataset.
    Returns 0.0 if declined_ids is empty or no qualifying polls exist.
    """
    if not declined_ids:
        return 0.0

    multi = polls_df[
        polls_df["field_tested"].apply(_count_non_chow_candidates) >= 2
    ].copy()

    if multi.empty:
        return 0.0

    weights = multi["date_published"].apply(
        lambda d: _decay_weight(d, CURRENT_HALF_LIFE_DAYS, reference_date)
    )
    total_w = float(weights.sum())
    if total_w <= 0:
        return 0.0

    total_share = pd.Series(0.0, index=multi.index)
    for cand in declined_ids:
        if cand in multi.columns:
            total_share += pd.to_numeric(multi[cand], errors="coerce").fillna(0.0)

    return float((total_share * weights).sum() / total_w)
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
PYTHONPATH=. uv run pytest tests/model/test_pool.py::test_compute_withdrawn_share_returns_declined_share tests/model/test_pool.py::test_compute_withdrawn_share_excludes_h2h_polls tests/model/test_pool.py::test_compute_withdrawn_share_empty_declined_ids -v
```

Expected: 3 passes

- [ ] **Step 5: Commit**

```bash
git add backend/model/pool.py tests/model/test_pool.py
git commit -m "feat: add compute_withdrawn_share to pool model"
```

---

### Task 2: Wire `compute_withdrawn_share` into `compute_pool_model`

**Files:**
- Modify: `backend/model/pool.py`
- Modify: `tests/model/test_pool.py`

- [ ] **Step 1: Write the two failing integration tests**

Update the existing `test_compute_pool_model_returns_all_required_keys` in `tests/model/test_pool.py` — add one assertion:

```python
def test_compute_pool_model_returns_all_required_keys():
    from backend.model.pool import compute_pool_model
    result = compute_pool_model(_load_polls(), _load_approval())
    assert result["phase_mode"] == "pre_nomination"
    for key in ("chow_floor", "chow_ceiling", "anti_chow_pool",
                "protective_progressive_activated", "protective_progressive_reserve"):
        assert key in result["pool"], f"Missing pool key: {key}"
    assert "bradford" in result["candidates"]
    assert "consolidation_trend" in result
    assert result["consolidation_trend"] in (
        "consolidating", "stalling", "reversing", "insufficient_data"
    )
    assert "approval" in result
    assert "data_notes" in result
    assert "withdrawn_in_transition" in result  # new
```

Add a new test after it:

```python
def test_withdrawn_in_transition_non_negative():
    """withdrawn_in_transition and uncaptured_anti_chow are both non-negative.
    With Furey recently withdrawn, withdrawn_in_transition should be > 0."""
    from backend.model.pool import compute_pool_model
    result = compute_pool_model(_load_polls(), _load_approval())
    assert result["withdrawn_in_transition"] >= 0.0
    assert result["uncaptured_anti_chow"] >= 0.0
    assert result["withdrawn_in_transition"] > 0.0
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
PYTHONPATH=. uv run pytest tests/model/test_pool.py::test_compute_pool_model_returns_all_required_keys tests/model/test_pool.py::test_withdrawn_in_transition_non_negative -v
```

Expected: `test_compute_pool_model_returns_all_required_keys` fails asserting `withdrawn_in_transition` key; `test_withdrawn_in_transition_non_negative` fails with `KeyError`.

- [ ] **Step 3: Import `DECLINED_CANDIDATE_IDS` in `pool.py`**

At the top of `backend/model/pool.py`, after the existing imports, add:

```python
from .candidates import DECLINED_CANDIDATE_IDS
```

- [ ] **Step 4: Update `compute_pool_model` to use `compute_withdrawn_share`**

In `compute_pool_model`, find these three lines:

```python
captures = compute_candidate_capture_rates(polls_df, anti_chow_pool, reference_date)
named_captured = sum(c["share"] for c in captures.values())
uncaptured = max(0.0, anti_chow_pool - named_captured)
```

Replace them with:

```python
captures = compute_candidate_capture_rates(polls_df, anti_chow_pool, reference_date)
named_captured = sum(c["share"] for c in captures.values())
withdrawn = compute_withdrawn_share(polls_df, DECLINED_CANDIDATE_IDS, reference_date)
uncaptured = max(0.0, anti_chow_pool - named_captured - withdrawn)
```

- [ ] **Step 5: Add `withdrawn_in_transition` to the return dict**

In the return dict of `compute_pool_model`, find:

```python
        "uncaptured_anti_chow": round(uncaptured, 4),
```

Replace with:

```python
        "withdrawn_in_transition": round(withdrawn, 4),
        "uncaptured_anti_chow": round(uncaptured, 4),
```

- [ ] **Step 6: Run all pool model tests**

```bash
PYTHONPATH=. uv run pytest tests/model/test_pool.py -v
```

Expected: all 16 tests pass (14 existing + 2 new)

- [ ] **Step 7: Commit**

```bash
git add backend/model/pool.py tests/model/test_pool.py
git commit -m "feat: add withdrawn_in_transition to pool model output, redefine uncaptured_anti_chow"
```

---

### Task 3: Update TypeScript `PoolModel` type

**Files:**
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: Add `withdrawn_in_transition` to `PoolModel`**

In `frontend/src/lib/api.ts`, find the `PoolModel` type:

```ts
export type PoolModel = {
  phase_mode: "pre_nomination";
  phase_mode_context: string;
  pool: {
    chow_floor: number;
    chow_ceiling: number;
    anti_chow_pool: number;
    chow_h2h_current: number | null;
    protective_progressive_activated: number;
    protective_progressive_reserve: number;
  };
  candidates: Record<string, { share: number; capture_rate: number }>;
  uncaptured_anti_chow: number;
  consolidation_trend: ConsolidationTrend;
  approval: { approve: number; disapprove: number; not_sure: number };
  data_notes: {
    full_field_poll_count: number;
    total_polls: number;
    approval_data_points: number;
    h2h_available: boolean;
  };
};
```

Replace with:

```ts
export type PoolModel = {
  phase_mode: "pre_nomination";
  phase_mode_context: string;
  pool: {
    chow_floor: number;
    chow_ceiling: number;
    anti_chow_pool: number;
    chow_h2h_current: number | null;
    protective_progressive_activated: number;
    protective_progressive_reserve: number;
  };
  candidates: Record<string, { share: number; capture_rate: number }>;
  withdrawn_in_transition: number;
  uncaptured_anti_chow: number;
  consolidation_trend: ConsolidationTrend;
  approval: { approve: number; disapprove: number; not_sure: number };
  data_notes: {
    full_field_poll_count: number;
    total_polls: number;
    approval_data_points: number;
    h2h_available: boolean;
  };
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/api.ts
git commit -m "feat: add withdrawn_in_transition to PoolModel TypeScript type"
```

---

## Self-Review

**Spec coverage:**
- ✅ `compute_withdrawn_share` function — Task 1
- ✅ Import `DECLINED_CANDIDATE_IDS` from `candidates.py` — Task 2, Step 3
- ✅ `withdrawn_in_transition` as top-level output field — Task 2, Step 5
- ✅ `uncaptured_anti_chow` redefined as `max(0, anti_chow - bradford - withdrawn)` — Task 2, Step 4
- ✅ `PoolModel` TypeScript type updated — Task 3
- ✅ `test_compute_pool_model_returns_all_required_keys` updated — Task 2, Step 1
- ✅ `test_withdrawn_in_transition_non_negative` added — Task 2, Step 1
- ✅ Unit tests for `compute_withdrawn_share` — Task 1

**No placeholders found.**

**Type consistency:** `compute_withdrawn_share` defined in Task 1 and called in Task 2. Parameter names (`declined_ids`, `reference_date`) consistent throughout. Output field `withdrawn_in_transition` matches between Python dict key (Task 2, Step 5) and TypeScript type (Task 3, Step 1). ✅
