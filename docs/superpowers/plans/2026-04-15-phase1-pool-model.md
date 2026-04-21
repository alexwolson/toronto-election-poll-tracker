# Phase 1 Mayoral Pool Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the scenario-filtered polling aggregator with a pool-based model that characterises current voter preferences using all available polls and approval ratings, without making electoral predictions.

**Architecture:** A new `backend/model/pool.py` module computes five structural anchors (Chow floor, anti-Chow pool, Chow ceiling, protective progressive activation/reserve, candidate capture rates) from all polls (no scenario filtering) and an approval ratings time series. The existing Monte Carlo simulation pipeline is left intact as dormant Phase 2 infrastructure. The `/api/polls/latest` endpoint gains a `pool_model` key. The homepage replaces the ChowPressureHero with a pool display component.

**Tech Stack:** Python (pandas, math), FastAPI, Next.js 15, TypeScript. Tests via `uv run pytest`. All polls already in `data/processed/polls.csv` (full, unfiltered). New data file: `data/processed/approval_ratings.csv`.

**Political context (read before implementing):**
- Nominations open May 1, close August 21, 2026. Election: October 26.
- Bradford has declared but is not yet formally nominated. The field is genuinely open.
- Chow's durable support (floor) is ~37-40% based on full-field polling.
- The anti-Chow pool (~38%) is anchored by Liaison's approval/disapproval tracker, not vote intention.
- Chow's approval ceiling (~55%) includes "protective progressives" who activate when a credible challenger emerges. Currently ~10 points are activated (she runs 47% in Bradford H2H vs ~37% floor).
- Bradford is consolidating the anti-Chow pool: his share in multi-candidate polls has risen from ~12% in late 2025 to ~26% in March 2026.

---

### Task 1: Data — Approval ratings CSV

**Files:**
- Create: `data/processed/approval_ratings.csv`
- Create: `tests/model/test_pool.py` (data loading tests only)

- [ ] **Step 1: Create `data/processed/approval_ratings.csv`**

Values are from the Liaison Strategies approval tracker (shared during design session). **Verify intermediate rows against the source chart before shipping** — the anchor points (Aug 2023 honeymoon, Jan 2024 post-budget drop, Jan 2026 most recent) are confirmed; intermediate values are read from the chart and may need correction.

```csv
date,approve,disapprove,not_sure,source,methodology
2023-08-01,0.73,0.18,0.09,Liaison Strategies,IVR
2023-09-01,0.73,0.18,0.09,Liaison Strategies,IVR
2023-10-01,0.73,0.18,0.09,Liaison Strategies,IVR
2023-11-01,0.72,0.18,0.10,Liaison Strategies,IVR
2023-12-01,0.55,0.33,0.12,Liaison Strategies,IVR
2024-01-01,0.52,0.40,0.08,Liaison Strategies,IVR
2024-02-01,0.52,0.40,0.08,Liaison Strategies,IVR
2024-03-01,0.52,0.40,0.08,Liaison Strategies,IVR
2024-04-01,0.59,0.31,0.10,Liaison Strategies,IVR
2024-05-01,0.57,0.35,0.08,Liaison Strategies,IVR
2024-06-01,0.55,0.37,0.08,Liaison Strategies,IVR
2024-07-01,0.55,0.37,0.08,Liaison Strategies,IVR
2024-08-01,0.60,0.33,0.07,Liaison Strategies,IVR
2024-09-01,0.52,0.40,0.08,Liaison Strategies,IVR
2024-10-01,0.54,0.38,0.08,Liaison Strategies,IVR
2024-11-01,0.52,0.40,0.08,Liaison Strategies,IVR
2024-12-01,0.54,0.38,0.08,Liaison Strategies,IVR
2025-01-01,0.52,0.42,0.06,Liaison Strategies,IVR
2025-02-01,0.51,0.41,0.08,Liaison Strategies,IVR
2025-03-01,0.54,0.38,0.08,Liaison Strategies,IVR
2025-04-01,0.51,0.42,0.07,Liaison Strategies,IVR
2025-05-01,0.54,0.39,0.07,Liaison Strategies,IVR
2025-06-01,0.53,0.40,0.07,Liaison Strategies,IVR
2025-07-01,0.51,0.42,0.07,Liaison Strategies,IVR
2025-08-01,0.54,0.39,0.07,Liaison Strategies,IVR
2025-09-01,0.55,0.38,0.07,Liaison Strategies,IVR
2025-10-01,0.55,0.38,0.07,Liaison Strategies,IVR
2025-11-01,0.53,0.40,0.07,Liaison Strategies,IVR
2025-12-01,0.54,0.38,0.08,Liaison Strategies,IVR
2026-01-01,0.55,0.38,0.07,Liaison Strategies,IVR
```

- [ ] **Step 2: Write and run the data loading tests**

Create `tests/model/test_pool.py`:

```python
"""Tests for the Phase 1 mayoral pool model."""
from pathlib import Path
import pandas as pd

_REPO_ROOT = Path(__file__).parent.parent.parent


def _load_approval() -> pd.DataFrame:
    return pd.read_csv(_REPO_ROOT / "data" / "processed" / "approval_ratings.csv")


def _load_polls() -> pd.DataFrame:
    return pd.read_csv(_REPO_ROOT / "data" / "processed" / "polls.csv")


def test_approval_csv_has_required_columns():
    df = _load_approval()
    assert {"date", "approve", "disapprove", "not_sure"}.issubset(df.columns)
    assert len(df) >= 10


def test_approval_values_are_proportions():
    df = _load_approval()
    for col in ("approve", "disapprove", "not_sure"):
        assert df[col].between(0.0, 1.0).all(), f"{col} out of [0,1]"


def test_approval_rows_sum_to_one():
    df = _load_approval()
    row_sums = df["approve"] + df["disapprove"] + df["not_sure"]
    assert row_sums.between(0.97, 1.03).all(), f"Rows do not sum to ~1.0:\n{row_sums}"
```

Run:
```bash
uv run pytest tests/model/test_pool.py -v
```

Expected: 3 PASSED. If `test_approval_rows_sum_to_one` fails, adjust the CSV rows that don't sum to ~1.0.

- [ ] **Step 3: Commit**

```bash
git add data/processed/approval_ratings.csv tests/model/test_pool.py
git commit -m "data: add Liaison Strategies approval ratings time series"
```

---

### Task 2: Pool model — Core computation

**Files:**
- Create: `backend/model/pool.py`
- Modify: `tests/model/test_pool.py`

- [ ] **Step 1: Write failing tests**

Append to `tests/model/test_pool.py`:

```python
def test_compute_chow_floor_returns_value_in_range():
    """Floor from full-field polls (3+ non-Chow candidates, n≥500) should be 37-44%."""
    from backend.model.pool import compute_chow_floor
    floor = compute_chow_floor(_load_polls())
    assert 0.37 <= floor <= 0.44, f"floor={floor:.3f} — expected 0.37-0.44"


def test_compute_chow_floor_ignores_h2h_polls():
    """A dataframe containing only H2H polls returns 0.0."""
    from backend.model.pool import compute_chow_floor
    h2h_only = pd.DataFrame([{
        "date_published": "2026-03-08",
        "field_tested": "bradford,chow",
        "chow": 0.47,
        "sample_size": 735,
    }])
    assert compute_chow_floor(h2h_only) == 0.0


def test_compute_chow_floor_ignores_small_sample_polls():
    """Polls with sample_size < 500 are excluded from floor estimation."""
    from backend.model.pool import compute_chow_floor
    small_sample = pd.DataFrame([{
        "date_published": "2025-10-06",
        "field_tested": "bradford,chow,furey,tory,other",
        "chow": 0.29,
        "sample_size": 406,
    }])
    assert compute_chow_floor(small_sample) == 0.0


def test_compute_current_h2h_chow_uses_bradford_matchup_only():
    """H2H Chow share uses only Bradford vs Chow polls, not Tory vs Chow."""
    from backend.model.pool import compute_current_h2h_chow
    result = compute_current_h2h_chow(_load_polls())
    # Most recent Bradford H2H (Mar 8): Chow 47% — should dominate with 12-day half-life
    assert result is not None
    assert 0.43 <= result <= 0.49, f"h2h_chow={result:.3f} — expected 0.43-0.49"


def test_compute_current_approval_reflects_recent_data():
    """Approval weighted average should be close to most recent data (Jan 2026: 55/38/7)."""
    from backend.model.pool import compute_current_approval
    result = compute_current_approval(_load_approval())
    assert 0.50 <= result["approve"] <= 0.60, f"approve={result['approve']:.3f}"
    assert 0.33 <= result["disapprove"] <= 0.45, f"disapprove={result['disapprove']:.3f}"


def test_compute_candidate_capture_rates_has_bradford_and_furey():
    from backend.model.pool import compute_candidate_capture_rates
    result = compute_candidate_capture_rates(_load_polls(), anti_chow_pool=0.38)
    assert "bradford" in result and "furey" in result
    for cand in ("bradford", "furey"):
        assert 0.0 <= result[cand]["share"] <= 0.60
        assert 0.0 <= result[cand]["capture_rate"] <= 2.0


def test_compute_pool_model_returns_all_required_keys():
    from backend.model.pool import compute_pool_model
    result = compute_pool_model(_load_polls(), _load_approval())
    assert result["phase_mode"] == "pre_nomination"
    for key in ("chow_floor", "chow_ceiling", "anti_chow_pool",
                "protective_progressive_activated", "protective_progressive_reserve"):
        assert key in result["pool"], f"Missing pool key: {key}"
    assert "bradford" in result["candidates"]
    assert "furey" in result["candidates"]
    assert "consolidation_trend" in result
    assert result["consolidation_trend"] in (
        "consolidating", "stalling", "reversing", "insufficient_data"
    )
    assert "approval" in result
    assert "data_notes" in result


def test_pool_model_floor_below_ceiling():
    from backend.model.pool import compute_pool_model
    result = compute_pool_model(_load_polls(), _load_approval())
    assert result["pool"]["chow_floor"] < result["pool"]["chow_ceiling"]


def test_pool_model_pp_components_non_negative():
    from backend.model.pool import compute_pool_model
    result = compute_pool_model(_load_polls(), _load_approval())
    assert result["pool"]["protective_progressive_activated"] >= 0.0
    assert result["pool"]["protective_progressive_reserve"] >= 0.0
    assert result["uncaptured_anti_chow"] >= 0.0


def test_pool_model_consolidation_trend_is_consolidating():
    """Bradford's capture rate has risen from ~33% (pre-Jan 2026) to ~60% (post-Jan 2026)."""
    from backend.model.pool import compute_pool_model
    result = compute_pool_model(_load_polls(), _load_approval())
    assert result["consolidation_trend"] == "consolidating"
```

- [ ] **Step 2: Run — expect all new tests to fail**

```bash
uv run pytest tests/model/test_pool.py -v -k "not approval_csv and not approval_values and not approval_rows"
```

Expected: ImportError — `backend.model.pool` does not exist yet.

- [ ] **Step 3: Implement `backend/model/pool.py`**

```python
"""Phase 1 Mayoral Pool Model.

Uses all polling data regardless of field configuration or candidate status.
Characterises voter preference pools without predicting electoral outcomes.

Designed for the pre-nomination period (before August 21, 2026).
"""
from __future__ import annotations

import math
from datetime import datetime, timezone

import pandas as pd


# Floor uses candidate-count weighting (not recency) — it is a structural property.
# Polls with fewer than 500 respondents are excluded as unreliable.
MIN_FLOOR_SAMPLE_SIZE = 500

# Minimum number of non-Chow named candidates for a poll to count as "full field."
FULL_FIELD_THRESHOLD = 3

# Half-life for recency-weighted current metrics (H2H share, candidate captures).
CURRENT_HALF_LIFE_DAYS = 12.0

# Half-life for approval data weighting — approval changes slowly.
APPROVAL_HALF_LIFE_DAYS = 30.0

# Candidates to track in the anti-Chow pool.
ANTI_CHOW_CANDIDATES = ["bradford", "furey"]


def _decay_weight(date_str: str, half_life: float, reference_date: datetime | None = None) -> float:
    """Exponential decay weight for a poll date."""
    if reference_date is None:
        reference_date = datetime.now(timezone.utc)
    pub = pd.to_datetime(date_str, utc=True)
    if hasattr(pub, "tzinfo") and pub.tzinfo is None:
        pub = pub.replace(tzinfo=timezone.utc)
    age_days = max(0.0, (reference_date - pub).total_seconds() / 86400)
    return math.exp(-math.log(2) / half_life * age_days)


def _count_non_chow_candidates(field_tested: object) -> int:
    """Count named non-Chow, non-other candidates in a field_tested string."""
    if pd.isna(field_tested):
        return 0
    return sum(
        1 for p in str(field_tested).split(",")
        if p.strip().lower() not in ("chow", "other", "")
    )


def compute_chow_floor(polls_df: pd.DataFrame) -> float:
    """Estimate Chow's structural support floor from full-field polls.

    Uses polls with 3+ non-Chow named candidates and sample_size >= 500.
    Weights by non-Chow candidate count (more candidates = more fragmented =
    better floor estimate). Does NOT use recency weighting — the floor is a
    structural property, not a recent trend.

    Returns 0.0 if no qualifying polls exist.
    """
    if "chow" not in polls_df.columns:
        return 0.0

    df = polls_df.copy()
    df["_non_chow_count"] = df["field_tested"].apply(_count_non_chow_candidates)
    df["_n"] = pd.to_numeric(df.get("sample_size", pd.Series(dtype=float)), errors="coerce").fillna(0)

    full_field = df[(df["_non_chow_count"] >= FULL_FIELD_THRESHOLD) & (df["_n"] >= MIN_FLOOR_SAMPLE_SIZE)]
    if full_field.empty:
        return 0.0

    shares = pd.to_numeric(full_field["chow"], errors="coerce")
    valid = shares.notna()
    if not valid.any():
        return 0.0

    weights = full_field.loc[valid, "_non_chow_count"].astype(float)
    total_w = float(weights.sum())
    if total_w <= 0:
        return 0.0
    return float((shares[valid] * weights).sum() / total_w)


def compute_current_h2h_chow(
    polls_df: pd.DataFrame,
    reference_date: datetime | None = None,
) -> float | None:
    """Recency-weighted Chow share from Bradford vs Chow head-to-head polls only.

    Excludes Tory vs Chow polls (Tory has declined). Uses 12-day half-life
    so the most recent Bradford H2H poll dominates.
    Returns None if no qualifying polls exist.
    """
    if "chow" not in polls_df.columns:
        return None

    h2h = polls_df[
        polls_df["field_tested"].apply(
            lambda f: (
                "bradford" in str(f).lower()
                and "chow" in str(f).lower()
                and _count_non_chow_candidates(f) == 1
            )
        )
    ].copy()

    if h2h.empty:
        return None

    weights = h2h["date_published"].apply(
        lambda d: _decay_weight(d, CURRENT_HALF_LIFE_DAYS, reference_date)
    )
    shares = pd.to_numeric(h2h["chow"], errors="coerce")
    valid = shares.notna()
    if not valid.any():
        return None

    total_w = float(weights[valid].sum())
    if total_w <= 0:
        return None
    return float((shares[valid] * weights[valid]).sum() / total_w)


def compute_current_approval(
    approval_df: pd.DataFrame,
    reference_date: datetime | None = None,
) -> dict[str, float]:
    """Recency-weighted approve/disapprove/not_sure from approval ratings.

    Uses 30-day half-life. Returns zeroed dict if approval_df is empty.
    """
    if approval_df.empty:
        return {"approve": 0.0, "disapprove": 0.0, "not_sure": 0.0}

    weights = approval_df["date"].apply(
        lambda d: _decay_weight(str(d), APPROVAL_HALF_LIFE_DAYS, reference_date)
    )
    total_w = float(weights.sum())
    if total_w <= 0:
        return {"approve": 0.0, "disapprove": 0.0, "not_sure": 0.0}

    return {
        col: float(
            (pd.to_numeric(approval_df[col], errors="coerce").fillna(0.0) * weights).sum()
            / total_w
        )
        for col in ("approve", "disapprove", "not_sure")
    }


def compute_candidate_capture_rates(
    polls_df: pd.DataFrame,
    anti_chow_pool: float,
    reference_date: datetime | None = None,
) -> dict[str, dict[str, float]]:
    """Recency-weighted share and anti-Chow pool capture rate for tracked candidates.

    Uses multi-candidate polls (2+ non-Chow candidates). Missing candidates
    return share=0.0, capture_rate=0.0.
    """
    multi = polls_df[
        polls_df["field_tested"].apply(_count_non_chow_candidates) >= 2
    ].copy()

    result: dict[str, dict[str, float]] = {}
    for cand in ANTI_CHOW_CANDIDATES:
        if cand not in multi.columns or multi.empty:
            result[cand] = {"share": 0.0, "capture_rate": 0.0}
            continue

        weights = multi["date_published"].apply(
            lambda d: _decay_weight(d, CURRENT_HALF_LIFE_DAYS, reference_date)
        )
        shares = pd.to_numeric(multi[cand], errors="coerce").fillna(0.0)
        total_w = float(weights.sum())
        if total_w <= 0:
            result[cand] = {"share": 0.0, "capture_rate": 0.0}
            continue

        share = float((shares * weights).sum() / total_w)
        capture_rate = share / anti_chow_pool if anti_chow_pool > 0 else 0.0
        result[cand] = {"share": round(share, 4), "capture_rate": round(capture_rate, 4)}

    return result


def compute_consolidation_trend(
    polls_df: pd.DataFrame,
    anti_chow_pool: float,
    reference_date: datetime | None = None,
) -> str:
    """Is Bradford's anti-Chow pool capture rate rising, stalling, or reversing?

    Compares Bradford's unweighted mean capture rate in multi-candidate polls
    from the past 90 days vs polls older than 90 days.
    Returns: "consolidating" | "stalling" | "reversing" | "insufficient_data"
    """
    if anti_chow_pool <= 0 or "bradford" not in polls_df.columns:
        return "insufficient_data"

    ref = reference_date or datetime.now(timezone.utc)
    multi = polls_df[
        polls_df["field_tested"].apply(_count_non_chow_candidates) >= 2
    ].copy()
    if multi.empty:
        return "insufficient_data"

    multi["_date"] = pd.to_datetime(multi["date_published"], utc=True, errors="coerce")
    multi = multi[multi["_date"].notna()]
    cutoff = ref - pd.Timedelta(days=90)

    def mean_capture(df: pd.DataFrame) -> float | None:
        if df.empty:
            return None
        shares = pd.to_numeric(df["bradford"], errors="coerce").dropna()
        if shares.empty:
            return None
        return float(shares.mean()) / anti_chow_pool

    recent_rate = mean_capture(multi[multi["_date"] >= cutoff])
    earlier_rate = mean_capture(multi[multi["_date"] < cutoff])

    if recent_rate is None or earlier_rate is None:
        return "insufficient_data"

    delta = recent_rate - earlier_rate
    if delta > 0.05:
        return "consolidating"
    if delta < -0.05:
        return "reversing"
    return "stalling"


def compute_pool_model(
    polls_df: pd.DataFrame,
    approval_df: pd.DataFrame,
    reference_date: datetime | None = None,
) -> dict:
    """Compute the Phase 1 pool model from all polls and approval ratings.

    Returns a dict characterising current voter preferences without predicting
    electoral outcomes. Suitable for serialisation by the FastAPI endpoint.
    """
    chow_floor = compute_chow_floor(polls_df)
    approval = compute_current_approval(approval_df, reference_date)
    anti_chow_pool = approval["disapprove"]
    chow_ceiling = approval["approve"]

    chow_h2h = compute_current_h2h_chow(polls_df, reference_date)
    current_chow = chow_h2h if chow_h2h is not None else chow_floor

    pp_activated = max(0.0, current_chow - chow_floor)
    pp_reserve = max(0.0, chow_ceiling - current_chow)

    captures = compute_candidate_capture_rates(polls_df, anti_chow_pool, reference_date)
    named_captured = sum(c["share"] for c in captures.values())
    uncaptured = max(0.0, anti_chow_pool - named_captured)

    trend = compute_consolidation_trend(polls_df, anti_chow_pool, reference_date)

    full_field_count = int(
        (
            (polls_df["field_tested"].apply(_count_non_chow_candidates) >= FULL_FIELD_THRESHOLD)
            & (pd.to_numeric(polls_df.get("sample_size", pd.Series(dtype=float)), errors="coerce").fillna(0) >= MIN_FLOOR_SAMPLE_SIZE)
        ).sum()
    )

    return {
        "phase_mode": "pre_nomination",
        "phase_mode_context": (
            "Candidate nominations open May 1, 2026 and close August 21, 2026. "
            "The field is not yet set — any candidate could still enter or withdraw. "
            "This model characterises current voter preferences, not electoral outcomes."
        ),
        "pool": {
            "chow_floor": round(chow_floor, 4),
            "chow_ceiling": round(chow_ceiling, 4),
            "anti_chow_pool": round(anti_chow_pool, 4),
            "chow_h2h_current": round(chow_h2h, 4) if chow_h2h is not None else None,
            "protective_progressive_activated": round(pp_activated, 4),
            "protective_progressive_reserve": round(pp_reserve, 4),
        },
        "candidates": captures,
        "uncaptured_anti_chow": round(uncaptured, 4),
        "consolidation_trend": trend,
        "approval": {
            "approve": round(approval["approve"], 4),
            "disapprove": round(approval["disapprove"], 4),
            "not_sure": round(approval["not_sure"], 4),
        },
        "data_notes": {
            "full_field_poll_count": full_field_count,
            "total_polls": len(polls_df),
            "approval_data_points": len(approval_df),
            "h2h_available": chow_h2h is not None,
        },
    }
```

- [ ] **Step 4: Run all pool tests**

```bash
uv run pytest tests/model/test_pool.py -v
```

Expected: All 12 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/model/pool.py tests/model/test_pool.py
git commit -m "feat: add Phase 1 mayoral pool model"
```

---

### Task 3: API — Add pool model to `/api/polls/latest`

**Files:**
- Modify: `backend/api/polls.py`
- Modify: `tests/model/test_pool.py`

- [ ] **Step 1: Write failing API test**

Append to `tests/model/test_pool.py`:

```python
def test_polls_latest_includes_pool_model():
    """GET /api/polls/latest returns a pool_model key with required structure."""
    import sys
    sys.path.insert(0, str(_REPO_ROOT / "backend"))
    from fastapi.testclient import TestClient
    from main import app
    client = TestClient(app)
    response = client.get("/api/polls/latest")
    assert response.status_code == 200
    data = response.json()
    assert "pool_model" in data, "pool_model missing from response"
    pm = data["pool_model"]
    assert pm["phase_mode"] == "pre_nomination"
    assert "pool" in pm
    assert "candidates" in pm
    assert "bradford" in pm["candidates"]
```

- [ ] **Step 2: Run — expect FAIL**

```bash
uv run pytest tests/model/test_pool.py::test_polls_latest_includes_pool_model -v
```

Expected: AssertionError — `pool_model` missing from response.

- [ ] **Step 3: Update `backend/api/polls.py`**

In the `get_latest_polls` function, add the approval CSV load and pool model computation. Replace the entire file with:

```python
from fastapi import APIRouter
from db.storage import init_db, get_all_polls, save_poll
from scrapers.wikipedia import scrape_wikipedia_polls
from model.candidates import CANDIDATE_STATUS, DECLINED_CANDIDATE_IDS

router = APIRouter()

init_db()


@router.get("")
def get_polls():
    polls = get_all_polls()
    return {"polls": polls, "count": len(polls)}


@router.post("/scrape")
def scrape_polls():
    """Scrape latest polls from Wikipedia."""
    polls = scrape_wikipedia_polls()
    saved = 0
    for poll in polls:
        try:
            save_poll(poll)
            saved += 1
        except Exception:
            pass
    return {"scraped": len(polls), "saved": saved}


@router.get("/latest")
def get_latest_polls():
    """Return pool model and polling data from polls.csv and approval_ratings.csv."""
    from pathlib import Path
    import pandas as pd
    from model.aggregator import (
        aggregate_polls,
        exclude_polls_with_declined_candidates,
        get_latest_scenario_polls,
        get_scenario_polls,
    )
    from model.run import DEFAULT_SCENARIO, SCENARIOS
    from model.pool import compute_pool_model

    def normalize_candidate(value: str) -> str:
        return str(value).strip().lower()

    def field_candidates(field: object) -> set[str]:
        if pd.isna(field):
            return set()
        return {
            normalize_candidate(c)
            for c in str(field).split(",")
            if normalize_candidate(c) and normalize_candidate(c) != "other"
        }

    def candidate_ranges(df: pd.DataFrame) -> dict:
        out: dict = {"declared": {}, "potential": {}, "declined": {}}
        for status, candidates in CANDIDATE_STATUS.items():
            for candidate in candidates:
                cid = candidate["id"]
                if cid not in df.columns:
                    out[status][cid] = None
                    continue
                series = pd.to_numeric(df[cid], errors="coerce").dropna()
                if series.empty:
                    out[status][cid] = None
                    continue
                out[status][cid] = {
                    "min": round(float(series.min()) * 100, 1),
                    "max": round(float(series.max()) * 100, 1),
                }
        return out

    data_dir = Path(__file__).parent.parent.parent / "data" / "processed"
    polls_df = pd.read_csv(data_dir / "polls.csv")
    polls_df["_field_candidates"] = polls_df["field_tested"].apply(field_candidates)
    polls_df["_contains_declined"] = polls_df["_field_candidates"].apply(
        lambda names: len(names.intersection(DECLINED_CANDIDATE_IDS)) > 0
    )

    approval_path = data_dir / "approval_ratings.csv"
    approval_df = pd.read_csv(approval_path) if approval_path.exists() else pd.DataFrame()

    # Phase 1: pool model uses ALL polls, no filtering
    pool_model = compute_pool_model(polls_df, approval_df)

    # Phase 2 infrastructure (kept dormant): scenario-based aggregation
    scenario_candidates = SCENARIOS.get(DEFAULT_SCENARIO, [])
    eligible_polls = exclude_polls_with_declined_candidates(polls_df, DECLINED_CANDIDATE_IDS)
    scenario_polls = get_scenario_polls(eligible_polls, scenario_candidates)
    current_polls = get_latest_scenario_polls(scenario_polls)
    aggregated = aggregate_polls(current_polls, scenario_candidates)
    aggregated = {k: round(v, 4) for k, v in aggregated.items() if v > 0.001}

    trend_df = current_polls.assign(
        _parsed_date=pd.to_datetime(current_polls["date_published"], errors="coerce"),
        _date_fallback=current_polls["date_published"].astype(str),
    ).sort_values(["_parsed_date", "_date_fallback"], kind="stable")
    trend = []
    for _, row in trend_df.iterrows():
        point = {"date": str(row["date_published"])}
        for candidate in scenario_candidates:
            point[candidate] = round(float(row[candidate]), 4) if candidate in row and pd.notna(row[candidate]) else 0.0
        trend.append(point)

    history = []
    for _, row in polls_df.sort_values("date_published", ascending=False).iterrows():
        row_field = field_candidates(row.get("field_tested"))
        excluded_reason = None
        if bool(row.get("_contains_declined", False)):
            excluded_reason = "declined_candidate"
        elif len(row_field) == 2:
            excluded_reason = "head_to_head"
        history.append({
            "poll_id": str(row.get("poll_id", "")),
            "date_published": str(row.get("date_published", "")),
            "firm": str(row.get("firm", "")),
            "sample_size": int(row.get("sample_size", 0)) if pd.notna(row.get("sample_size")) else 0,
            "field_tested": str(row.get("field_tested", "")),
            "excluded_from_model": excluded_reason is not None,
            "excluded_reason": excluded_reason,
        })

    return {
        "pool_model": pool_model,
        "aggregated": aggregated,
        "polls_used": len(current_polls),
        "candidates": sorted(aggregated.keys()),
        "trend": trend,
        "total_polls_available": int(len(polls_df)),
        "excluded_declined_polls": int(polls_df["_contains_declined"].sum()),
        "candidate_status": CANDIDATE_STATUS,
        "candidate_ranges": candidate_ranges(polls_df),
        "poll_history": history,
        "chow_pressure": None,
    }
```

- [ ] **Step 4: Run all tests**

```bash
uv run pytest tests/ -v
```

Expected: All tests PASS (13 prior + pool tests + new API test).

- [ ] **Step 5: Commit**

```bash
git add backend/api/polls.py
git commit -m "feat: serve pool_model from /api/polls/latest"
```

---

### Task 4: Frontend — Types and display component

**Files:**
- Modify: `frontend/src/lib/api.ts`
- Create: `frontend/src/components/mayoral-pool-display.tsx`
- Modify: `frontend/src/app/page.tsx`

- [ ] **Step 1: Update `frontend/src/lib/api.ts`**

Add `PoolModel` type and `pool_model` field to `PollingAveragesResponse`. Replace the `ChowPressure`-related types block and the `PollingAveragesResponse` type (leave `getWards`/`getWard` untouched). Replace the entire file:

```typescript
import { WardsResponse, WardResponse } from '../types/ward';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function getWards(): Promise<WardsResponse> {
  const fallback: WardsResponse = {
    wards: [],
    challengers: [],
    composition_mean: 0,
    composition_std: 0,
    composition_by_mayor: {},
    mayoral_averages: {},
    phase: { phase: 1, label: "", description: "" },
    scenarios: {},
    default_scenario: "",
  };
  try {
    const res = await fetch(`${API_URL}/api/wards`, { next: { revalidate: 60 } });
    if (!res.ok) return fallback;
    const data = (await res.json()) as Partial<WardsResponse>;
    return {
      wards: data.wards ?? [],
      challengers: data.challengers ?? [],
      composition_mean: data.composition_mean ?? 0,
      composition_std: data.composition_std ?? 0,
      composition_by_mayor: data.composition_by_mayor ?? {},
      mayoral_averages: data.mayoral_averages ?? {},
      phase: data.phase ?? { phase: 1, label: "", description: "" },
      scenarios: data.scenarios ?? {},
      default_scenario: data.default_scenario ?? "",
    };
  } catch (error) {
    console.error("Failed to fetch wards:", error);
    return fallback;
  }
}

export async function getWard(wardNum: number): Promise<WardResponse> {
  const fallback: WardResponse = { ward: null, challengers: [], error: "unavailable" };
  try {
    const res = await fetch(`${API_URL}/api/wards/${wardNum}`, { next: { revalidate: 60 } });
    if (res.status === 404) return { ward: null, challengers: [], error: "not_found" };
    if (!res.ok) return fallback;
    const data = (await res.json()) as WardResponse;
    return { ward: data.ward ?? null, challengers: data.challengers ?? [] };
  } catch (error) {
    console.error(`Failed to fetch ward ${wardNum}:`, error);
    return fallback;
  }
}

export type ConsolidationTrend =
  | "consolidating"
  | "stalling"
  | "reversing"
  | "insufficient_data";

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

type PollTrendPoint = { date: string; [candidate: string]: number | string };

// Kept for backward compatibility with the polls page
export type ChowPressureBand = "low" | "moderate" | "elevated";
export type ChowPressureTrend = "rising" | "easing" | "flat" | "insufficient";
export type ChowPressure = {
  value: number;
  band: ChowPressureBand;
  trend: ChowPressureTrend;
  methodology_version: string;
  computed_at: string;
  diagnostics: {
    adaptive_half_life_days: number;
    adaptive_trend_horizon_days: number;
    chow_share_std_recent: number;
  };
};

type PollingAveragesResponse = {
  pool_model: PoolModel | null;
  aggregated: Record<string, number>;
  polls_used: number;
  candidates: string[];
  trend: PollTrendPoint[];
  total_polls_available: number;
  excluded_declined_polls: number;
  candidate_status: Record<string, { id: string; name: string; summary: string }[]>;
  candidate_ranges: Record<string, Record<string, { min: number; max: number } | null>>;
  poll_history: {
    poll_id: string;
    date_published: string;
    firm: string;
    sample_size: number;
    field_tested: string;
    excluded_from_model: boolean;
    excluded_reason: string | null;
  }[];
  chow_pressure: ChowPressure | null;
};

export async function getPollingAverages(): Promise<PollingAveragesResponse> {
  const fallback: PollingAveragesResponse = {
    pool_model: null,
    aggregated: {},
    polls_used: 0,
    candidates: [],
    trend: [],
    total_polls_available: 0,
    excluded_declined_polls: 0,
    candidate_status: { declared: [], potential: [], declined: [] },
    candidate_ranges: { declared: {}, potential: {}, declined: {} },
    poll_history: [],
    chow_pressure: null,
  };
  try {
    const res = await fetch(`${API_URL}/api/polls/latest`, { next: { revalidate: 60 } });
    if (!res.ok) return fallback;
    const data = (await res.json()) as Partial<PollingAveragesResponse>;
    return {
      pool_model: data.pool_model ?? null,
      aggregated: data.aggregated ?? {},
      polls_used: data.polls_used ?? 0,
      candidates: data.candidates ?? [],
      trend: data.trend ?? [],
      total_polls_available: data.total_polls_available ?? 0,
      excluded_declined_polls: data.excluded_declined_polls ?? 0,
      candidate_status: data.candidate_status ?? { declared: [], potential: [], declined: [] },
      candidate_ranges: data.candidate_ranges ?? { declared: {}, potential: {}, declined: {} },
      poll_history: data.poll_history ?? [],
      chow_pressure: data.chow_pressure ?? null,
    };
  } catch (error) {
    console.error("Failed to fetch polling averages:", error);
    return fallback;
  }
}
```

- [ ] **Step 2: Create `frontend/src/components/mayoral-pool-display.tsx`**

```tsx
import type { PoolModel, ConsolidationTrend } from "@/lib/api";

const TREND_CONFIG: Record<ConsolidationTrend, { label: string; arrow: string; description: string }> = {
  consolidating: { label: "Consolidating", arrow: "↑", description: "Anti-Chow vote concentrating around a leading candidate" },
  stalling:      { label: "Stalling",      arrow: "→", description: "Anti-Chow consolidation has not advanced recently" },
  reversing:     { label: "Fragmenting",   arrow: "↓", description: "Anti-Chow vote becoming more dispersed" },
  insufficient_data: { label: "Insufficient data", arrow: "–", description: "Too few polls to assess consolidation direction" },
};

function pct(v: number) {
  return `${Math.round(v * 100)}%`;
}

function PoolBar({ pool, candidates, uncaptured }: {
  pool: PoolModel["pool"];
  candidates: PoolModel["candidates"];
  uncaptured: number;
}) {
  const segments = [
    { key: "chow_floor",    label: "Chow (durable)",                      value: pool.chow_floor,                       color: "var(--chart-2)" },
    { key: "pp_activated",  label: "Protective progressives (activated)",  value: pool.protective_progressive_activated, color: "color-mix(in oklch, var(--chart-2) 55%, transparent)" },
    { key: "pp_reserve",    label: "Protective progressives (reserve)",    value: pool.protective_progressive_reserve,   color: "color-mix(in oklch, var(--chart-2) 25%, var(--border))" },
    { key: "bradford",      label: "Bradford",                             value: candidates["bradford"]?.share ?? 0,   color: "oklch(0.58 0.2 28)" },
    { key: "furey",         label: "Furey",                                value: candidates["furey"]?.share ?? 0,      color: "oklch(0.66 0.15 50)" },
    { key: "uncaptured",    label: "Uncaptured anti-Chow",                 value: uncaptured,                           color: "var(--muted)" },
  ].filter((s) => s.value > 0.005);

  const total = segments.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="mt-4 space-y-2">
      <div className="flex h-5 w-full overflow-hidden rounded-full border border-[var(--line-soft)]">
        {segments.map((seg) => (
          <div
            key={seg.key}
            title={`${seg.label}: ${pct(seg.value)}`}
            style={{ width: `${(seg.value / total) * 100}%`, background: seg.color }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {segments.map((seg) => (
          <span key={seg.key} className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 flex-shrink-0 rounded-full border border-[var(--line-soft)]" style={{ background: seg.color }} />
            {seg.label} <span className="font-mono">{pct(seg.value)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function MayoralPoolDisplay({ model }: { model: PoolModel | null }) {
  if (!model) {
    return (
      <div className="surface-panel p-6 md:p-8">
        <p className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-muted-foreground">Mayoral Race</p>
        <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const trend = TREND_CONFIG[model.consolidation_trend];
  const { pool, candidates, uncaptured_anti_chow } = model;

  return (
    <div className="surface-panel p-6 md:p-8 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-muted-foreground">
            Mayoral Race — Voter Preference
          </p>
          <p className="mt-1 text-xs text-muted-foreground italic">
            Pre-nomination · field not yet set · nominations close Aug 21
          </p>
        </div>
        <div className="flex-shrink-0 flex flex-col items-center rounded-xl border border-[var(--line-soft)] px-3 py-2 text-center bg-[color:var(--secondary)]">
          <span className="text-lg leading-none text-muted-foreground">{trend.arrow}</span>
          <span className="mt-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">{trend.label}</span>
        </div>
      </div>

      <PoolBar pool={pool} candidates={candidates} uncaptured={uncaptured_anti_chow} />

      <div className="h-px bg-[var(--line-soft)]" />

      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <p className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">Chow floor</p>
          <p className="mt-0.5 text-xl font-semibold">{pct(pool.chow_floor)}</p>
          <p className="text-xs text-muted-foreground">durable support</p>
        </div>
        <div>
          <p className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">Anti-Chow pool</p>
          <p className="mt-0.5 text-xl font-semibold">{pct(pool.anti_chow_pool)}</p>
          <p className="text-xs text-muted-foreground">current disapproval</p>
        </div>
        <div>
          <p className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">Bradford capture</p>
          <p className="mt-0.5 text-xl font-semibold">{pct(candidates["bradford"]?.capture_rate ?? 0)}</p>
          <p className="text-xs text-muted-foreground">of anti-Chow pool</p>
        </div>
        {pool.chow_h2h_current !== null && (
          <div>
            <p className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">Chow vs Bradford</p>
            <p className="mt-0.5 text-xl font-semibold">{pct(pool.chow_h2h_current)}</p>
            <p className="text-xs text-muted-foreground">Chow head-to-head</p>
          </div>
        )}
      </div>

      <div className="h-px bg-[var(--line-soft)]" />

      <p className="text-xs text-muted-foreground leading-relaxed">
        {model.phase_mode_context} Floor from {model.data_notes.full_field_poll_count} full-field polls; approval anchors from {model.data_notes.approval_data_points} Liaison Strategies surveys.
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Update `frontend/src/app/page.tsx`**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getWards, getPollingAverages } from "@/lib/api";
import { MayoralPoolDisplay } from "@/components/mayoral-pool-display";

export default async function Home() {
  const [wardsData, pollsData] = await Promise.all([getWards(), getPollingAverages()]);

  const competitiveCount = wardsData.wards.filter((w) => w.race_class === "competitive").length;
  const openCount = wardsData.wards.filter((w) => w.race_class === "open").length;

  return (
    <main>
      <div className="civic-shell space-y-8">
        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="surface-panel p-6 md:p-8">
            <p className="hero-kicker">Municipal projection desk</p>
            <h1 className="mt-4 text-4xl leading-tight font-heading md:text-6xl">
              Toronto 2026 Election
              <span className="block text-[color:var(--primary)]">Tracker</span>
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted-foreground md:text-lg">
              Tracking the Toronto 2026 mayoral race and ward-level council dynamics.
              Candidate nominations open May 1 — the field is not yet set.
            </p>
            <div className="mt-7 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <div className="stat-chip p-3">
                <p className="font-mono text-[0.7rem] uppercase tracking-wider text-muted-foreground">Total wards</p>
                <p className="mt-1 text-xl font-semibold">25</p>
              </div>
              <div className="stat-chip p-3">
                <p className="font-mono text-[0.7rem] uppercase tracking-wider text-muted-foreground">Competitive</p>
                <p className="mt-1 text-xl font-semibold">{competitiveCount}</p>
              </div>
              <div className="stat-chip p-3">
                <p className="font-mono text-[0.7rem] uppercase tracking-wider text-muted-foreground">Open seats</p>
                <p className="mt-1 text-xl font-semibold">{openCount}</p>
              </div>
              <div className="stat-chip p-3">
                <p className="font-mono text-[0.7rem] uppercase tracking-wider text-muted-foreground">Polls tracked</p>
                <p className="mt-1 text-xl font-semibold">{pollsData.total_polls_available}</p>
              </div>
            </div>
          </div>

          <MayoralPoolDisplay model={pollsData.pool_model} />
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Card className="surface-panel">
            <CardHeader>
              <CardTitle className="font-heading text-2xl">Competitive Wards</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{competitiveCount}</p>
              <p className="text-sm text-muted-foreground">
                Incumbent wards with a credible challenger or high defeatability score.{" "}
                {openCount} open seat{openCount !== 1 ? "s" : ""} where no incumbent is running.
              </p>
            </CardContent>
          </Card>

          <Card className="surface-panel">
            <CardHeader>
              <CardTitle className="font-heading text-2xl">Model Phase</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">Pre-nomination</p>
              <p className="text-sm text-muted-foreground">
                Nominations open May 1, close August 21. Projections reflect structural
                factors only until the field is locked in.
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Start servers and verify the page renders**

Terminal 1:
```bash
cd backend && uv run uvicorn main:app --reload --port 8000
```

Terminal 2:
```bash
cd frontend && npm run dev
```

Open http://localhost:3000. Verify:
- Right panel shows "Mayoral Race — Voter Preference" with pre-nomination badge
- Pool bar renders with coloured segments and legend
- Four stat tiles (Chow floor, anti-Chow pool, Bradford capture, Chow H2H) are populated with numbers
- No "composition by mayor" table (it was removed — it belongs to Phase 2)
- No console errors

- [ ] **Step 6: Run all backend tests**

```bash
uv run pytest tests/ -v
```

Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/lib/api.ts frontend/src/components/mayoral-pool-display.tsx frontend/src/app/page.tsx
git commit -m "feat: replace ChowPressureHero with Phase 1 mayoral pool display"
```
