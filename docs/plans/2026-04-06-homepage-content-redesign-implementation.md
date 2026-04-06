# Homepage Content Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace low-information homepage snapshot content with a clear three-part narrative: Chow pressure now, ward vulnerability concentration, and trust diagnostics.

**Architecture:** Compute a backend `chow_pressure` payload from polls using fragmentation-adjusted anti-Chow demand, then consume it on the frontend homepage as the hero signal. Keep Matt Elliott defeatability separate (no blended score), and derive ward summaries from existing ward data. Add backend unit tests for metric math and API contract coverage before frontend integration.

**Tech Stack:** FastAPI, pandas, pytest, Next.js, TypeScript, ESLint

---

### Task 1: Add chow pressure metric math module

**Files:**
- Create: `backend/model/chow_pressure.py`
- Test: `tests/test_chow_pressure.py`

**Step 1: Write failing unit tests for core math primitives**

```python
from backend.model.chow_pressure import (
    effective_number_of_parties,
    consolidation_factor,
    poll_demand,
)


def test_effective_number_of_parties_for_even_split():
    assert effective_number_of_parties([0.5, 0.5]) == 2.0


def test_consolidation_factor_uses_inverse_sqrt_enp():
    assert round(consolidation_factor([0.5, 0.5]), 4) == 0.7071


def test_poll_demand_uses_one_minus_chow_times_consolidation():
    demand = poll_demand(chow_share=0.45, non_chow_shares=[0.30, 0.25])
    assert 0 < demand < 0.55
```

**Step 2: Run targeted tests to confirm failure**

Run: `uv run pytest tests/test_chow_pressure.py -v`
Expected: FAIL due to missing module/functions

**Step 3: Implement minimal metric primitives**

```python
def effective_number_of_parties(shares):
    denom = sum(s * s for s in shares if s > 0)
    return 1.0 / denom if denom > 0 else 1.0


def consolidation_factor(non_chow_shares):
    enp = effective_number_of_parties(non_chow_shares)
    return 1.0 / math.sqrt(max(enp, 1.0))


def poll_demand(chow_share, non_chow_shares):
    return max(0.0, 1.0 - chow_share) * consolidation_factor(non_chow_shares)
```

**Step 4: Re-run targeted tests**

Run: `uv run pytest tests/test_chow_pressure.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/model/chow_pressure.py tests/test_chow_pressure.py
git commit -m "feat: add chow pressure metric primitives"
```

### Task 2: Add adaptive weighting and trend functions

**Files:**
- Modify: `backend/model/chow_pressure.py`
- Test: `tests/test_chow_pressure.py`

**Step 1: Add failing tests for adaptive half-life/horizon behavior**

```python
def test_adaptive_half_life_shortens_with_high_volume_low_dispersion():
    hl = adaptive_half_life_days(recent_poll_count=8, chow_std=0.01)
    assert hl < 21


def test_adaptive_half_life_lengthens_with_low_volume_high_dispersion():
    hl = adaptive_half_life_days(recent_poll_count=1, chow_std=0.08)
    assert hl > 21


def test_trend_label_rising_when_slope_positive():
    assert trend_label(0.015) == "rising"
```

**Step 2: Run targeted tests to confirm failure**

Run: `uv run pytest tests/test_chow_pressure.py -v`
Expected: FAIL on undefined adaptive functions

**Step 3: Implement adaptive helper and trend functions**

```python
def adaptive_half_life_days(recent_poll_count: int, chow_std: float) -> float:
    # Clamp to [14, 42], shorter when volume high and std low
    ...


def adaptive_trend_horizon_days(recent_poll_count: int, chow_std: float) -> int:
    ...


def weighted_chow_pressure(polls_df: pd.DataFrame) -> dict:
    # Return value, trend, diagnostics
    ...
```

**Step 4: Re-run targeted tests**

Run: `uv run pytest tests/test_chow_pressure.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/model/chow_pressure.py tests/test_chow_pressure.py
git commit -m "feat: add adaptive weighting and trend for chow pressure"
```

### Task 3: Expose chow pressure and diagnostics in polls API

**Files:**
- Modify: `backend/api/polls.py`
- Test: `tests/test_polls_api.py`

**Step 1: Add failing API tests for new response keys**

```python
def test_polls_latest_includes_chow_pressure_payload(client):
    data = client.get("/api/polls/latest").json()
    assert "chow_pressure" in data
    assert "value" in data["chow_pressure"]
    assert "trend" in data["chow_pressure"]


def test_polls_latest_includes_trust_diagnostics(client):
    data = client.get("/api/polls/latest").json()
    assert "total_polls_available" in data
    assert "polls_with_non_scenario_candidates" in data
```

**Step 2: Run API tests to confirm failure**

Run: `uv run pytest tests/test_polls_api.py -v`
Expected: FAIL on missing keys

**Step 3: Implement API wiring**

```python
from model.chow_pressure import compute_chow_pressure_payload

...
pressure = compute_chow_pressure_payload(current_polls)

return {
    "aggregated": aggregated,
    "polls_used": len(current_polls),
    "total_polls_available": len(polls_df),
    "polls_with_non_scenario_candidates": non_scenario_count,
    "chow_pressure": pressure,
    ...
}
```

**Step 4: Re-run API tests**

Run: `uv run pytest tests/test_polls_api.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/api/polls.py tests/test_polls_api.py
git commit -m "feat: expose chow pressure and trust diagnostics in polls API"
```

### Task 4: Update frontend API types for new homepage data

**Files:**
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/types/ward.ts` (only if shared typing is preferred)

**Step 1: Add failing frontend compile expectation via lint/build**

Run: `npm run lint` (from `frontend/`)
Expected: FAIL after homepage code references new fields not typed yet

**Step 2: Add TypeScript types for chow pressure and diagnostics**

```ts
type ChowPressure = {
  value: number;
  band: "low" | "moderate" | "elevated";
  trend: "rising" | "flat" | "easing" | "insufficient";
  methodology_version: string;
  computed_at: string;
  diagnostics: {
    adaptive_half_life_days: number;
    adaptive_trend_horizon_days: number;
    chow_share_std_recent: number;
  };
};
```

**Step 3: Extend `getPollingAverages()` fallback and parser**

Ensure fallback includes:

- `total_polls_available`
- `polls_with_non_scenario_candidates`
- `chow_pressure`

**Step 4: Run frontend lint**

Run: `npm run lint` (from `frontend/`)
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/lib/api.ts frontend/src/types/ward.ts
git commit -m "feat: add frontend types for chow pressure homepage data"
```

### Task 5: Redesign homepage content structure

**Files:**
- Modify: `frontend/src/app/page.tsx`

**Step 1: Write failing content assertions as a manual acceptance checklist**

Checklist to verify after implementation:

- Hero shows fragmentation-adjusted anti-Chow demand as primary metric.
- Hero shows Elliott defeatability separately as structural context.
- Middle section shows vulnerability distribution and top vulnerable wards.
- Lower section shows trust diagnostics (coverage, caveat, recency, noise).
- Redundant cards removed (total wards/competitive/open as hero stats, composition duplicates).

**Step 2: Implement hero section content**

Implement content blocks for:

- Primary `%` value from `pollsData.chow_pressure.value`
- band and trend label
- structural context row using existing ward/model signal source available in repo

**Step 3: Implement ward vulnerability summary section**

Use `wardsData.wards` to derive:

- high/medium/low counts by `defeatability_score` thresholds
- top 5-8 wards sorted by highest defeatability
- include compact win-probability context per listed ward

**Step 4: Implement trust section content**

Show diagnostics sourced from polls API:

- polls used vs total
- non-scenario candidate poll count
- computed freshness timestamp
- dispersion proxy (std)

**Step 5: Run frontend verification**

Run:

- `npm run lint` (from `frontend/`)
- `npm run build` (from `frontend/`)

Expected: PASS

**Step 6: Commit**

```bash
git add frontend/src/app/page.tsx
git commit -m "feat: redesign homepage content around chow pressure and trust"
```

### Task 6: End-to-end verification and polish

**Files:**
- Modify as needed based on failures in prior tasks

**Step 1: Run backend test suite**

Run: `uv run pytest`
Expected: PASS

**Step 2: Run frontend lint and build**

Run (from `frontend/`):

- `npm run lint`
- `npm run build`

Expected: PASS

**Step 3: Run local app smoke check**

Run at repo root: `npm run dev`

Manual checks:

- Homepage loads without runtime errors.
- Hero, ward, trust sections render with production-like data.
- No NaN/undefined strings in key metrics.

**Step 4: Commit final fixes**

```bash
git add backend/api/polls.py backend/model/chow_pressure.py tests/test_chow_pressure.py tests/test_polls_api.py frontend/src/lib/api.ts frontend/src/app/page.tsx
git commit -m "fix: finalize chow pressure homepage redesign validation"
```

## Notes and Constraints

- Keep signals separate: no combined Chow composite score.
- Prefer backend computation for `chow_pressure` to keep methodology versioned and consistent.
- Preserve current site styling language; this work is content and information architecture only.
- Avoid adding new frontend test frameworks in this iteration (YAGNI).

## Verification Commands (Final)

- Backend: `uv run pytest`
- Frontend lint: `npm run lint` (in `frontend/`)
- Frontend build: `npm run build` (in `frontend/`)
