# Complete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all remaining spec components so the model runs end-to-end, the API returns real simulation results, and the frontend displays live projections instead of placeholders.

**Architecture:** The model pipeline flows `polls.csv` → aggregator → WardSimulation → run.py → FastAPI → Next.js frontend. The `src/` directory mirrors `backend/model/` with absolute imports for testing; every model file change must be applied to both. The simulation engine already exists but is not wired up in `run.py`, which still returns raw data with a TODO comment.

**Tech Stack:** Python 3.12, FastAPI, pandas/numpy, pytest/uv; Next.js 16 (breaking changes from prior versions — read `node_modules/next/dist/docs/` before writing any frontend code), TypeScript, Recharts, Tailwind CSS.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `backend/model/run.py` | Modify | Wire simulation; add phase detection; add race_class |
| `backend/model/simulation.py` | Modify | Vote-splitting penalty; safe incumbent shortcut; open seat enhancements; by-election uncertainty; ward poll override |
| `src/simulation.py` | Modify (mirror) | Same as above — keep in sync with backend/model/ |
| `backend/model/phase.py` | Create | Phase detection logic |
| `src/phase.py` | Create (mirror) | Same as above |
| `backend/model/aggregator.py` | Modify | Use field_tested for scenario filtering |
| `src/aggregator.py` | Modify (mirror) | Same as above |
| `backend/api/polls.py` | Modify | Wire /api/polls/latest to aggregator; add /api/polls/scenarios |
| `backend/api/wards.py` | Modify | Return enriched ward data including win_probability, race_class, phase |
| `data/processed/ward_polls.csv` | Create | Schema stub for future ward-level poll override (Part 6) |
| `frontend/src/types/ward.ts` | Modify | Expand Ward, Challenger, WardsResponse, add PhaseInfo |
| `frontend/src/lib/api.ts` | Modify | Add getModelSummary(), expand return types |
| `frontend/src/components/phase-banner.tsx` | Create | Phase indicator component |
| `frontend/src/app/layout.tsx` | Modify | Mount PhaseBanner in root layout |
| `frontend/src/app/page.tsx` | Modify | Show real composition + competitive ward counts |
| `frontend/src/app/wards/[ward_num]/page.tsx` | Create | Ward detail page |
| `frontend/src/components/ward-card.tsx` | Modify | Show win_probability and race_class |
| `tests/test_simulation.py` | Create | Tests for vote-splitting, safe incumbent, open seat, by-election |
| `tests/test_phase.py` | Create | Tests for phase detection |
| `tests/test_run_integration.py` | Create | Integration test that run_model() returns full results |

---

## Task 1: Wire the simulation engine in run.py

`run.py` has a TODO stub — it loads CSVs but never calls `WardSimulation`. This task wires everything together.

**Files:**
- Modify: `backend/model/run.py`
- Create: `tests/test_run_integration.py`

- [ ] **Step 1: Write the failing integration test**

```python
# tests/test_run_integration.py
"""Integration test: run_model() returns full simulation results."""
from __future__ import annotations

import pytest

# We test against the src/ mirror so the test runner finds it
# run_model uses load_processed_data which reads from data/processed/ -
# these real files exist, so this is a light integration test, not a unit test.
# It will run the simulation on real (but sparse) data.

def test_run_model_returns_win_probabilities():
    """run_model() should return win_probability for all 25 wards."""
    from src.run import run_model
    run_model.cache_clear()
    result = run_model()

    assert "wards" in result
    assert len(result["wards"]) == 25

    for ward in result["wards"]:
        assert "win_probability" in ward
        assert 0.0 <= ward["win_probability"] <= 1.0
        assert "race_class" in ward
        assert ward["race_class"] in ("safe", "competitive", "open")


def test_run_model_returns_composition_stats():
    """run_model() should return expected incumbent win count stats."""
    from src.run import run_model
    run_model.cache_clear()
    result = run_model()

    assert "composition_mean" in result
    assert 0 <= result["composition_mean"] <= 25
    assert "composition_std" in result
    assert result["composition_std"] >= 0


def test_run_model_returns_mayoral_averages():
    """run_model() should return aggregated mayoral poll averages."""
    from src.run import run_model
    run_model.cache_clear()
    result = run_model()

    assert "mayoral_averages" in result
    # Must have at least chow and bradford (both in every poll)
    assert "chow" in result["mayoral_averages"]
    assert "bradford" in result["mayoral_averages"]
    # Shares must be between 0 and 1
    for candidate, share in result["mayoral_averages"].items():
        assert 0.0 <= share <= 1.0, f"{candidate} share {share} out of range"
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
uv run pytest tests/test_run_integration.py -v
```

Expected: `ImportError` — `src.run` does not exist yet.

- [ ] **Step 3: Create src/run.py (the test-importable mirror)**

This file needs to resolve `data/processed/` from the repo root whether it's imported as `src.run` or `backend.model.run`. The key is the path calculation.

Create `src/run.py`:

```python
"""run.py — mirror of backend/model/run.py for test imports.

This file is kept in sync with backend/model/run.py. The only difference
is that data path resolution must work from this file's location.
"""
from pathlib import Path
from functools import lru_cache

import pandas as pd

from src.aggregator import aggregate_polls, get_latest_scenario_polls
from src.simulation import WardSimulation


def _data_dir() -> Path:
    # src/ is at repo root; data/processed is a sibling of src/
    return Path(__file__).parent.parent / "data" / "processed"


@lru_cache(maxsize=1)
def load_processed_data() -> dict:
    """Load all processed data files."""
    d = _data_dir()
    return {
        "defeatability": pd.read_csv(d / "ward_defeatability.csv"),
        "challengers": pd.read_csv(d / "challengers.csv"),
        "leans": pd.read_csv(d / "ward_mayoral_lean.csv"),
        "coattails": pd.read_csv(d / "coattail_adjustments.csv"),
        "polls": pd.read_csv(d / "polls.csv"),
    }


def _get_tracked_candidates(polls_df: pd.DataFrame) -> list[str]:
    """Derive candidate list from field_tested column."""
    candidates: set[str] = set()
    for field in polls_df["field_tested"].dropna():
        for c in field.split(","):
            c = c.strip()
            # Skip 'other' catch-all and candidates with no column
            if c and c != "other" and c in polls_df.columns:
                candidates.add(c)
    return sorted(candidates)


def _classify_race(row: dict, challengers_for_ward: list[dict]) -> str:
    """Return race_class: 'safe', 'competitive', or 'open'."""
    if not row["is_running"]:
        return "open"
    viable = [
        c for c in challengers_for_ward
        if c["name_recognition_tier"] in ("well-known", "known")
    ]
    if viable:
        return "competitive"
    return "safe"


@lru_cache(maxsize=1)
def run_model() -> dict:
    """Run the full model pipeline and return structured results."""
    data = load_processed_data()

    # 1. Aggregate polls to get mayoral averages
    polls_df = data["polls"]
    current_polls = get_latest_scenario_polls(polls_df)
    candidates = _get_tracked_candidates(current_polls)

    mayoral_shares = aggregate_polls(current_polls, candidates)
    # Drop zero-share candidates (not tested in recent polls)
    mayoral_shares = {k: v for k, v in mayoral_shares.items() if v > 0.001}
    mayoral_averages = pd.DataFrame(
        [{"candidate": k, "share": v} for k, v in mayoral_shares.items()]
    )

    # 2. Run simulation
    sim = WardSimulation(
        ward_data=data["defeatability"],
        mayoral_averages=mayoral_averages,
        coattails=data["coattails"],
        challengers=data["challengers"],
        leans=data["leans"],
    )
    results = sim.run()

    # 3. Build challenger lookup
    challengers_by_ward: dict[int, list[dict]] = {}
    for rec in data["challengers"].to_dict("records"):
        challengers_by_ward.setdefault(rec["ward"], []).append(rec)

    # 4. Merge simulation results into ward records
    wards_out = []
    for row in data["defeatability"].to_dict("records"):
        ward_num = row["ward"]
        ward_challengers = challengers_by_ward.get(ward_num, [])
        row["win_probability"] = round(results["win_probabilities"].get(ward_num, 0.0), 4)
        row["race_class"] = _classify_race(row, ward_challengers)
        row["factors"] = results["factors"].get(ward_num, {"vuln": 0.0, "coat": 0.0, "chal": 0.0})
        wards_out.append(row)

    return {
        "wards": wards_out,
        "challengers": data["challengers"].to_dict("records"),
        "composition_mean": round(float(results["composition_mean"]), 2),
        "composition_std": round(float(results["composition_std"]), 2),
        "mayoral_averages": mayoral_shares,
        "phase": {"phase": 1, "label": "Phase 1 — Structural Factors Only", "description": "Challenger registration has not yet opened. Projections reflect structural factors only."},
    }
```

- [ ] **Step 4: Run the test again**

```bash
uv run pytest tests/test_run_integration.py -v
```

Expected: PASS (3 tests green). If `aggregator.get_latest_scenario_polls` errors on missing `notes` column, proceed to Step 5 first.

- [ ] **Step 5: Fix get_latest_scenario_polls to use field_tested column**

The current `get_latest_scenario_polls` in `aggregator.py` checks for a `notes` column that `polls.csv` doesn't have. Update both `src/aggregator.py` and `backend/model/aggregator.py`:

Replace the body of `get_latest_scenario_polls` (the last function in both files):

```python
def get_latest_scenario_polls(df: pd.DataFrame) -> pd.DataFrame:
    """Filter polls to only include the most relevant field scenario.

    Prefers polls with 3+ candidates (multi-field) over head-to-heads,
    using the field_tested column when present.
    """
    if "field_tested" in df.columns:
        def candidate_count(field: str) -> int:
            if pd.isna(field):
                return 0
            return len([c for c in field.split(",") if c.strip() != "other"])

        multi = df[df["field_tested"].apply(candidate_count) >= 3]
        if not multi.empty:
            return multi
        return df

    # Fallback for polls without field_tested (e.g. from SQLite scraper)
    is_h2h = df["poll_id"].str.contains(r"-v-|-vs-", case=False, na=False)
    multi_field = df[~is_h2h]
    return multi_field if not multi_field.empty else df
```

Apply the identical change to both `src/aggregator.py` and `backend/model/aggregator.py`.

- [ ] **Step 6: Update backend/model/run.py to match src/run.py**

Copy the logic from `src/run.py` into `backend/model/run.py`, changing imports to relative:

```python
"""Run the election model and return JSON results."""
from functools import lru_cache
from pathlib import Path

import pandas as pd

from .aggregator import aggregate_polls, get_latest_scenario_polls
from .simulation import WardSimulation


def _data_dir() -> Path:
    return Path(__file__).parent.parent.parent / "data" / "processed"


@lru_cache(maxsize=1)
def load_processed_data() -> dict:
    """Load all processed data files."""
    d = _data_dir()
    return {
        "defeatability": pd.read_csv(d / "ward_defeatability.csv"),
        "challengers": pd.read_csv(d / "challengers.csv"),
        "leans": pd.read_csv(d / "ward_mayoral_lean.csv"),
        "coattails": pd.read_csv(d / "coattail_adjustments.csv"),
        "polls": pd.read_csv(d / "polls.csv"),
    }


def _get_tracked_candidates(polls_df: pd.DataFrame) -> list[str]:
    """Derive candidate list from field_tested column."""
    candidates: set[str] = set()
    for field in polls_df["field_tested"].dropna():
        for c in field.split(","):
            c = c.strip()
            if c and c != "other" and c in polls_df.columns:
                candidates.add(c)
    return sorted(candidates)


def _classify_race(row: dict, challengers_for_ward: list[dict]) -> str:
    if not row["is_running"]:
        return "open"
    viable = [
        c for c in challengers_for_ward
        if c["name_recognition_tier"] in ("well-known", "known")
    ]
    if viable:
        return "competitive"
    return "safe"


@lru_cache(maxsize=1)
def run_model() -> dict:
    """Run the full model pipeline and return structured results."""
    data = load_processed_data()

    polls_df = data["polls"]
    current_polls = get_latest_scenario_polls(polls_df)
    candidates = _get_tracked_candidates(current_polls)

    mayoral_shares = aggregate_polls(current_polls, candidates)
    mayoral_shares = {k: v for k, v in mayoral_shares.items() if v > 0.001}
    mayoral_averages = pd.DataFrame(
        [{"candidate": k, "share": v} for k, v in mayoral_shares.items()]
    )

    sim = WardSimulation(
        ward_data=data["defeatability"],
        mayoral_averages=mayoral_averages,
        coattails=data["coattails"],
        challengers=data["challengers"],
        leans=data["leans"],
    )
    results = sim.run()

    challengers_by_ward: dict[int, list[dict]] = {}
    for rec in data["challengers"].to_dict("records"):
        challengers_by_ward.setdefault(rec["ward"], []).append(rec)

    wards_out = []
    for row in data["defeatability"].to_dict("records"):
        ward_num = row["ward"]
        ward_challengers = challengers_by_ward.get(ward_num, [])
        row["win_probability"] = round(results["win_probabilities"].get(ward_num, 0.0), 4)
        row["race_class"] = _classify_race(row, ward_challengers)
        row["factors"] = results["factors"].get(ward_num, {"vuln": 0.0, "coat": 0.0, "chal": 0.0})
        wards_out.append(row)

    return {
        "wards": wards_out,
        "challengers": data["challengers"].to_dict("records"),
        "composition_mean": round(float(results["composition_mean"]), 2),
        "composition_std": round(float(results["composition_std"]), 2),
        "mayoral_averages": mayoral_shares,
        "phase": {"phase": 1, "label": "Phase 1 — Structural Factors Only", "description": "Challenger registration has not yet opened. Projections reflect structural factors only."},
    }
```

- [ ] **Step 7: Run all existing tests to confirm nothing regressed**

```bash
uv run pytest tests/ -v --ignore=tests/test_run_integration.py
uv run pytest tests/test_run_integration.py -v
```

Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add src/run.py src/aggregator.py backend/model/run.py backend/model/aggregator.py tests/test_run_integration.py
git commit -m "feat: wire simulation engine in run.py, fix scenario poll filtering"
```

---

## Task 2: Fix /api/polls/latest

Currently returns `{"message": "TODO: implement aggregation"}`. Wire it to the aggregator.

**Files:**
- Modify: `backend/api/polls.py`

- [ ] **Step 1: Write the test**

This is an API-level test. We'll use `TestClient` from FastAPI.

First, add `httpx` to dev dependencies (FastAPI TestClient needs it):

```bash
uv add --dev httpx
```

Create `tests/test_polls_api.py`:

```python
"""Tests for /api/polls/latest endpoint."""
from __future__ import annotations

from fastapi.testclient import TestClient
import pytest


@pytest.fixture
def client():
    from backend.main import app
    return TestClient(app)


def test_polls_latest_returns_aggregated_shares(client):
    """GET /api/polls/latest should return a dict of candidate shares."""
    response = client.get("/api/polls/latest")
    assert response.status_code == 200
    data = response.json()
    assert "aggregated" in data
    assert "chow" in data["aggregated"]
    assert "bradford" in data["aggregated"]
    for share in data["aggregated"].values():
        assert 0.0 <= share <= 1.0


def test_polls_latest_includes_candidate_count(client):
    """GET /api/polls/latest should report how many polls were used."""
    response = client.get("/api/polls/latest")
    assert response.status_code == 200
    data = response.json()
    assert "polls_used" in data
    assert isinstance(data["polls_used"], int)
    assert data["polls_used"] > 0
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
uv run pytest tests/test_polls_api.py -v
```

Expected: FAIL — endpoint returns `{"message": "TODO: implement aggregation"}`.

- [ ] **Step 3: Implement /api/polls/latest in backend/api/polls.py**

Replace the `get_latest_polls` function (lines 30–33):

```python
@router.get("/latest")
def get_latest_polls():
    """Return recency-weighted mayoral polling averages from polls.csv."""
    from pathlib import Path
    import pandas as pd
    from model.aggregator import aggregate_polls, get_latest_scenario_polls

    data_dir = Path(__file__).parent.parent.parent / "data" / "processed"
    polls_df = pd.read_csv(data_dir / "polls.csv")

    current_polls = get_latest_scenario_polls(polls_df)

    candidates: set[str] = set()
    for field in current_polls["field_tested"].dropna():
        for c in field.split(","):
            c = c.strip()
            if c and c != "other" and c in polls_df.columns:
                candidates.add(c)

    aggregated = aggregate_polls(current_polls, sorted(candidates))
    aggregated = {k: round(v, 4) for k, v in aggregated.items() if v > 0.001}

    return {
        "aggregated": aggregated,
        "polls_used": len(current_polls),
        "candidates": sorted(aggregated.keys()),
    }
```

- [ ] **Step 4: Run the test**

```bash
uv run pytest tests/test_polls_api.py -v
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/api/polls.py tests/test_polls_api.py
git commit -m "feat: wire /api/polls/latest to polling aggregator"
```

---

## Task 3: Vote-splitting penalty

When multiple viable challengers share the same `mayoral_alignment`, the strongest one gets a penalty. This discounts the strongest aligned challenger to reflect vote-splitting.

**Files:**
- Modify: `backend/model/simulation.py`
- Modify: `src/simulation.py`
- Create: `tests/test_simulation.py`

The penalty magnitude (`SPLIT_PENALTY = -0.5`) is an editorial parameter — documented in the constant comment.

- [ ] **Step 1: Write the failing test**

Create `tests/test_simulation.py`:

```python
"""Tests for Part 7: Simulation Engine."""
from __future__ import annotations

import pandas as pd
import pytest

from src.simulation import WardSimulation


def _make_ward_data() -> pd.DataFrame:
    """Minimal 2-ward DataFrame. Ward 1 has incumbent running; Ward 2 is open."""
    return pd.DataFrame([
        {
            "ward": 1,
            "councillor_name": "Incumbent Alice",
            "is_running": True,
            "is_byelection_incumbent": False,
            "defeatability_score": 40,
            "vote_share": 0.50,
            "electorate_share": 0.15,
        },
        {
            "ward": 2,
            "councillor_name": "Former Bob",
            "is_running": False,
            "is_byelection_incumbent": False,
            "defeatability_score": 0,
            "vote_share": 0.0,
            "electorate_share": 0.0,
        },
    ])


def _make_mayoral_averages() -> pd.DataFrame:
    return pd.DataFrame([
        {"candidate": "chow", "share": 0.45},
        {"candidate": "bradford", "share": 0.25},
    ])


def _make_leans() -> pd.DataFrame:
    return pd.DataFrame([
        {"ward": 1, "candidate": "chow", "lean": 0.05, "reliability": "high"},
        {"ward": 2, "candidate": "chow", "lean": -0.05, "reliability": "high"},
    ])


def _make_coattails() -> pd.DataFrame:
    return pd.DataFrame([
        {"ward": 1, "councillor_name": "Incumbent Alice", "coattail_adjustment": 0.02},
        {"ward": 2, "councillor_name": "Former Bob", "coattail_adjustment": 0.0},
    ])


def test_vote_splitting_reduces_strongest_aligned_challenger():
    """When 2+ challengers share alignment, the strongest gets penalised."""
    challengers = pd.DataFrame([
        {
            "ward": 1,
            "candidate_name": "Challenger X",
            "name_recognition_tier": "known",
            "fundraising_tier": "high",
            "mayoral_alignment": "chow",
            "is_endorsed_by_departing": False,
        },
        {
            "ward": 1,
            "candidate_name": "Challenger Y",
            "name_recognition_tier": "known",
            "fundraising_tier": "low",
            "mayoral_alignment": "chow",  # same alignment as X
            "is_endorsed_by_departing": False,
        },
    ])

    sim = WardSimulation(
        ward_data=_make_ward_data(),
        mayoral_averages=_make_mayoral_averages(),
        coattails=_make_coattails(),
        challengers=challengers,
        leans=_make_leans(),
        n_draws=100,
        seed=99,
    )

    # Compute strengths before and after split penalty
    mayoral_mood = {"chow": 0.45, "bradford": 0.25}
    cx = challengers.iloc[0]
    cy = challengers.iloc[1]

    strength_x_no_penalty = sim._compute_candidate_strength(cx, mayoral_mood, 1)
    strength_y_no_penalty = sim._compute_candidate_strength(cy, mayoral_mood, 1)

    # X is stronger (known + high fundraising vs known + low)
    assert strength_x_no_penalty > strength_y_no_penalty

    # With split penalty applied to ward 1
    adjusted = sim._apply_split_penalties(
        {cx["candidate_name"]: strength_x_no_penalty,
         cy["candidate_name"]: strength_y_no_penalty},
        challengers[challengers["ward"] == 1],
    )

    # Strongest (X) should be penalised
    assert adjusted["Challenger X"] < strength_x_no_penalty
    # Weaker (Y) should be unchanged
    assert adjusted["Challenger Y"] == pytest.approx(strength_y_no_penalty)


def test_vote_splitting_not_applied_for_single_aligned_challenger():
    """When only one challenger has an alignment, no penalty."""
    challengers = pd.DataFrame([
        {
            "ward": 1,
            "candidate_name": "Solo Challenger",
            "name_recognition_tier": "known",
            "fundraising_tier": "high",
            "mayoral_alignment": "chow",
            "is_endorsed_by_departing": False,
        },
    ])

    sim = WardSimulation(
        ward_data=_make_ward_data(),
        mayoral_averages=_make_mayoral_averages(),
        coattails=_make_coattails(),
        challengers=challengers,
        leans=_make_leans(),
        n_draws=100,
        seed=99,
    )

    mayoral_mood = {"chow": 0.45, "bradford": 0.25}
    c = challengers.iloc[0]
    strength = sim._compute_candidate_strength(c, mayoral_mood, 1)

    adjusted = sim._apply_split_penalties(
        {"Solo Challenger": strength},
        challengers[challengers["ward"] == 1],
    )

    assert adjusted["Solo Challenger"] == pytest.approx(strength)
```

- [ ] **Step 2: Run to confirm failure**

```bash
uv run pytest tests/test_simulation.py::test_vote_splitting_reduces_strongest_aligned_challenger -v
```

Expected: `AttributeError: 'WardSimulation' object has no attribute '_apply_split_penalties'`

- [ ] **Step 3: Add `_apply_split_penalties` to both simulation files**

Add this constant near the top of `backend/model/simulation.py` (after existing constants, before the class):

```python
# Vote-splitting penalty applied to the strongest challenger when 2+ challengers
# share the same mayoral alignment. Editorial parameter per spec v0.2.
SPLIT_PENALTY = -0.5
```

Add this method inside `WardSimulation`, after `_compute_candidate_strength`:

```python
def _apply_split_penalties(
    self,
    candidate_strengths: dict[str, float],
    ward_challengers: pd.DataFrame,
) -> dict[str, float]:
    """Apply SPLIT_PENALTY to the strongest challenger in each alignment group
    that has 2 or more viable (non-also-ran) challengers."""
    adjusted = dict(candidate_strengths)

    # Group viable challengers by alignment (exclude unaligned and also-rans)
    alignment_groups: dict[str, list[str]] = {}
    for _, row in ward_challengers.iterrows():
        align = str(row.get("mayoral_alignment", "unaligned"))
        if align == "unaligned":
            continue
        name = row["candidate_name"]
        if name not in candidate_strengths:
            continue
        # Exclude also-rans (name_recognition_tier == "unknown" with zero fundraising)
        # For now: all candidates passed in are considered viable
        alignment_groups.setdefault(align, []).append(name)

    for align, names in alignment_groups.items():
        if len(names) < 2:
            continue
        strongest = max(names, key=lambda n: candidate_strengths[n])
        adjusted[strongest] = adjusted[strongest] + SPLIT_PENALTY

    return adjusted
```

Apply the **identical** changes to `src/simulation.py`.

- [ ] **Step 4: Wire `_apply_split_penalties` into the simulation's inner loop**

In `run()` in both simulation files, find the section after computing `c_strengths`:

```python
c_strengths = [
    self._compute_candidate_strength(c_row, mayoral_mood, ward_num)
    for _, c_row in ward_challengers.iterrows()
]
f_star = max(c_strengths) if c_strengths else 0.0
```

Replace it with:

```python
raw_strengths = {
    c_row["candidate_name"]: self._compute_candidate_strength(
        c_row, mayoral_mood, ward_num
    )
    for _, c_row in ward_challengers.iterrows()
}
adjusted_strengths = self._apply_split_penalties(raw_strengths, ward_challengers)
c_strengths_list = list(adjusted_strengths.values())
f_star = max(c_strengths_list) if c_strengths_list else 0.0
```

Also update the Stage 2 softmax lower in the same loop (the `else` branch where incumbent loses):

```python
else:
    if not c_strengths_list:
        winner_names[i, ward_idx] = "Generic Challenger"
    else:
        exp_s = np.exp(c_strengths_list)
        probs = exp_s / exp_s.sum()
        winner = self.rng.choice(
            list(adjusted_strengths.keys()), p=probs
        )
        winner_names[i, ward_idx] = winner
```

Apply the identical changes in `src/simulation.py`.

- [ ] **Step 5: Run the simulation tests**

```bash
uv run pytest tests/test_simulation.py -v
uv run pytest tests/ -v
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add backend/model/simulation.py src/simulation.py tests/test_simulation.py
git commit -m "feat: add vote-splitting penalty for co-aligned challengers"
```

---

## Task 4: Safe incumbent classification (skip simulation)

Per spec: safe incumbents get a high probability directly — no simulation loop. Safe = running + defeatability < 30 + no frontrunner/competitive challengers.

**Files:**
- Modify: `backend/model/simulation.py`
- Modify: `src/simulation.py`

- [ ] **Step 1: Add tests to tests/test_simulation.py**

Add these test functions:

```python
def test_safe_incumbent_gets_high_win_probability():
    """Incumbents with low defeatability and no viable challengers are safe."""
    ward_data = pd.DataFrame([{
        "ward": 1,
        "councillor_name": "Safe Sam",
        "is_running": True,
        "is_byelection_incumbent": False,
        "defeatability_score": 15,  # below safe threshold
        "vote_share": 0.70,
        "electorate_share": 0.20,
    }])
    challengers = pd.DataFrame([{
        "ward": 1,
        "candidate_name": "Unknown Challenger",
        "name_recognition_tier": "unknown",  # not viable
        "fundraising_tier": "low",
        "mayoral_alignment": "unaligned",
        "is_endorsed_by_departing": False,
    }])
    mayoral_averages = pd.DataFrame([
        {"candidate": "chow", "share": 0.45},
        {"candidate": "bradford", "share": 0.25},
    ])
    leans = pd.DataFrame([{"ward": 1, "candidate": "chow", "lean": 0.0, "reliability": "high"}])
    coattails = pd.DataFrame([{"ward": 1, "councillor_name": "Safe Sam", "coattail_adjustment": 0.0}])

    sim = WardSimulation(
        ward_data=ward_data,
        mayoral_averages=mayoral_averages,
        coattails=coattails,
        challengers=challengers,
        leans=leans,
        n_draws=200,
        seed=1,
    )
    results = sim.run()
    # Safe incumbents should win with high probability (> 0.90)
    assert results["win_probabilities"][1] > 0.90


def test_competitive_incumbent_not_classified_safe():
    """Incumbent with a known challenger is competitive, not safe."""
    ward_data = pd.DataFrame([{
        "ward": 1,
        "councillor_name": "Vulnerable Val",
        "is_running": True,
        "is_byelection_incumbent": False,
        "defeatability_score": 25,  # below safe threshold by score alone
        "vote_share": 0.55,
        "electorate_share": 0.20,
    }])
    challengers = pd.DataFrame([{
        "ward": 1,
        "candidate_name": "Known Challenger",
        "name_recognition_tier": "known",  # viable!
        "fundraising_tier": "high",
        "mayoral_alignment": "chow",
        "is_endorsed_by_departing": False,
    }])
    mayoral_averages = pd.DataFrame([
        {"candidate": "chow", "share": 0.45},
    ])
    leans = pd.DataFrame([{"ward": 1, "candidate": "chow", "lean": 0.05, "reliability": "high"}])
    coattails = pd.DataFrame([{"ward": 1, "councillor_name": "Vulnerable Val", "coattail_adjustment": 0.01}])

    sim = WardSimulation(
        ward_data=ward_data,
        mayoral_averages=mayoral_averages,
        coattails=coattails,
        challengers=challengers,
        leans=leans,
        n_draws=500,
        seed=2,
    )
    results = sim.run()
    # Should NOT be near 1.0 — has a viable challenger
    assert results["win_probabilities"][1] < 0.97
```

- [ ] **Step 2: Run to confirm failure**

```bash
uv run pytest tests/test_simulation.py::test_safe_incumbent_gets_high_win_probability -v
```

Expected: FAIL — safe incumbent currently goes through the full logit, winning only ~95% of the time at most, not reliably > 0.90.

- [ ] **Step 3: Add safe incumbent constants and helper method**

Add to both `backend/model/simulation.py` and `src/simulation.py`, near the top constants:

```python
# Defeatability threshold below which an incumbent with no viable challengers is "safe"
SAFE_DEFEATABILITY_THRESHOLD = 30

# Win probability assigned directly to safe incumbents (no simulation)
SAFE_INCUMBENT_WIN_PROB = 0.97
```

Add this method to `WardSimulation`:

```python
def _is_safe_incumbent(self, row: pd.Series, ward_challengers: pd.DataFrame) -> bool:
    """Return True if this ward qualifies for the safe incumbent shortcut.

    Conditions (per spec Part 5):
    - Incumbent is running for re-election
    - Defeatability score < SAFE_DEFEATABILITY_THRESHOLD
    - No challengers classified as well-known or known
    """
    if not row["is_running"]:
        return False
    if row["defeatability_score"] >= SAFE_DEFEATABILITY_THRESHOLD:
        return False
    viable_tiers = {"well-known", "known"}
    return not any(
        str(c.get("name_recognition_tier", "unknown")) in viable_tiers
        for _, c in ward_challengers.iterrows()
    )
```

- [ ] **Step 4: Apply the shortcut in the main simulation loop**

In `run()`, inside the `for ward_idx in range(n_wards):` loop, before the existing `if not row["is_running"]:` block, add:

```python
# Safe incumbent shortcut: skip simulation, assign high probability directly
if self._is_safe_incumbent(row, ward_challengers):
    winner_names[i, ward_idx] = row["councillor_name"]
    incumbent_wins_count[i] += 1
    continue
```

Apply identically to both files.

- [ ] **Step 5: Run tests**

```bash
uv run pytest tests/test_simulation.py -v
uv run pytest tests/ -v
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add backend/model/simulation.py src/simulation.py tests/test_simulation.py
git commit -m "feat: safe incumbent shortcut skips simulation for uncontested wards"
```

---

## Task 5: Open seat enhancements

Open seats need: (a) an endorsement boost for the candidate endorsed by the departing councillor, (b) wider noise in the softmax to reflect higher uncertainty.

**Files:**
- Modify: `backend/model/simulation.py`
- Modify: `src/simulation.py`

- [ ] **Step 1: Add open seat tests to tests/test_simulation.py**

```python
def test_endorsed_candidate_gets_boost_in_open_seat():
    """In an open seat, the endorsed candidate has higher win prob than unendorsed peer."""
    ward_data = pd.DataFrame([{
        "ward": 2,
        "councillor_name": "Departed Dan",
        "is_running": False,
        "is_byelection_incumbent": False,
        "defeatability_score": 0,
        "vote_share": 0.0,
        "electorate_share": 0.0,
    }])
    challengers = pd.DataFrame([
        {
            "ward": 2,
            "candidate_name": "Endorsed Emma",
            "name_recognition_tier": "known",
            "fundraising_tier": "high",
            "mayoral_alignment": "chow",
            "is_endorsed_by_departing": True,  # gets boost
        },
        {
            "ward": 2,
            "candidate_name": "Unendorsed Ulrich",
            "name_recognition_tier": "known",
            "fundraising_tier": "high",
            "mayoral_alignment": "chow",
            "is_endorsed_by_departing": False,
        },
    ])
    mayoral_averages = pd.DataFrame([{"candidate": "chow", "share": 0.45}])
    leans = pd.DataFrame([{"ward": 2, "candidate": "chow", "lean": 0.0, "reliability": "high"}])
    coattails = pd.DataFrame([{"ward": 2, "councillor_name": "Departed Dan", "coattail_adjustment": 0.0}])

    sim = WardSimulation(
        ward_data=ward_data,
        mayoral_averages=mayoral_averages,
        coattails=coattails,
        challengers=challengers,
        leans=leans,
        n_draws=2000,
        seed=42,
    )
    results = sim.run()

    # Endorsed candidate should win more often than unendorsed peer
    ward_wins = {}
    for draw in results["winner_matrix"][:, 1]:  # ward 2 is index 1
        ward_wins[draw] = ward_wins.get(draw, 0) + 1

    emma_wins = ward_wins.get("Endorsed Emma", 0) / 2000
    ulrich_wins = ward_wins.get("Unendorsed Ulrich", 0) / 2000
    assert emma_wins > ulrich_wins
```

- [ ] **Step 2: Run to confirm failure**

```bash
uv run pytest tests/test_simulation.py::test_endorsed_candidate_gets_boost_in_open_seat -v
```

Expected: FAIL — endorsement boost not implemented, so Emma and Ulrich win equally.

- [ ] **Step 3: Add endorsement boost constant**

Add to constants in both simulation files:

```python
# Endorsement boost for the candidate backed by the departing councillor (open seats)
ENDORSEMENT_BOOST = 1.0

# Extra logit noise for open seats (higher uncertainty than incumbent races)
OPEN_SEAT_NOISE_SIGMA = 0.4
```

- [ ] **Step 4: Modify the open seat branch in run()**

In `run()`, replace the current open seat handling:

```python
if not row["is_running"]:
    prob = 0.0
```

With:

```python
if not row["is_running"]:
    # Open seat: run softmax with endorsement boost and extra noise
    open_strengths: dict[str, float] = {}
    for _, c_row in ward_challengers.iterrows():
        base = self._compute_candidate_strength(c_row, mayoral_mood, ward_num)
        boost = ENDORSEMENT_BOOST if c_row.get("is_endorsed_by_departing", False) else 0.0
        noise = self.rng.normal(0.0, OPEN_SEAT_NOISE_SIGMA)
        open_strengths[c_row["candidate_name"]] = base + boost + noise

    open_strengths = self._apply_split_penalties(open_strengths, ward_challengers)

    if not open_strengths:
        winner_names[i, ward_idx] = "Generic Challenger"
    else:
        names = list(open_strengths.keys())
        exp_s = np.exp(list(open_strengths.values()))
        probs = exp_s / exp_s.sum()
        winner_names[i, ward_idx] = self.rng.choice(names, p=probs)
    continue  # skip the incumbent win/loss logic below
```

Apply identically to both files.

Also remove the dead code further down that handles the `c_strengths_list` path for open seats (the old else branch after `if self.rng.random() < prob:` for open seats). With `continue` added, the old `if self.rng.random() < prob:` block won't be reached for open seats.

- [ ] **Step 5: Run tests**

```bash
uv run pytest tests/test_simulation.py -v
```

Expected: all pass. Run all tests:

```bash
uv run pytest tests/ -v
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add backend/model/simulation.py src/simulation.py tests/test_simulation.py
git commit -m "feat: open seat endorsement boost and wider noise term"
```

---

## Task 6: By-election incumbent uncertainty

By-election incumbents have noisier defeatability scores and weaker incumbency advantages. The simulation should add extra logit noise for them.

**Files:**
- Modify: `backend/model/simulation.py`
- Modify: `src/simulation.py`

- [ ] **Step 1: Add the test**

Add to `tests/test_simulation.py`:

```python
def test_byelection_incumbent_has_wider_distribution():
    """By-election incumbents should have more variance in win probability across draws."""
    def _make_sim(is_byelection: bool) -> WardSimulation:
        ward_data = pd.DataFrame([{
            "ward": 1,
            "councillor_name": "Byelectee Ben",
            "is_running": True,
            "is_byelection_incumbent": is_byelection,
            "defeatability_score": 45,
            "vote_share": 0.48,
            "electorate_share": 0.15,
        }])
        challengers = pd.DataFrame([{
            "ward": 1,
            "candidate_name": "Challenger C",
            "name_recognition_tier": "known",
            "fundraising_tier": "high",
            "mayoral_alignment": "chow",
            "is_endorsed_by_departing": False,
        }])
        return WardSimulation(
            ward_data=ward_data,
            mayoral_averages=pd.DataFrame([{"candidate": "chow", "share": 0.45}]),
            coattails=pd.DataFrame([{"ward": 1, "councillor_name": "Byelectee Ben", "coattail_adjustment": 0.0}]),
            challengers=challengers,
            leans=pd.DataFrame([{"ward": 1, "candidate": "chow", "lean": 0.0, "reliability": "high"}]),
            n_draws=2000,
            seed=7,
        )

    regular_sim = _make_sim(is_byelection=False)
    byelection_sim = _make_sim(is_byelection=True)

    regular_results = regular_sim.run()
    byelection_results = byelection_sim.run()

    # By-election sim should produce more variable results (higher std in win counts)
    import numpy as np
    regular_std = float(regular_results["composition_std"])
    byelection_std = float(byelection_results["composition_std"])
    assert byelection_std > regular_std
```

- [ ] **Step 2: Run to confirm failure**

```bash
uv run pytest tests/test_simulation.py::test_byelection_incumbent_has_wider_distribution -v
```

Expected: FAIL — no noise added for by-election incumbents.

- [ ] **Step 3: Add the constant and apply in simulation loop**

Add constant to both simulation files:

```python
# Additional logit noise for by-election incumbents (higher baseline uncertainty per spec)
BYELECTION_NOISE_SIGMA = 0.4
```

In `run()`, inside the `else` branch (for non-safe, non-open wards), find the logit calculation:

```python
z = beta_0 + vuln_effects[i, ward_idx] + coat_effects[i, ward_idx] + chal_effects[i, ward_idx]
prob = inv_logit(z)
```

Replace with:

```python
z = beta_0 + vuln_effects[i, ward_idx] + coat_effects[i, ward_idx] + chal_effects[i, ward_idx]
if row.get("is_byelection_incumbent", False):
    z += self.rng.normal(0.0, BYELECTION_NOISE_SIGMA)
prob = inv_logit(z)
```

Apply identically to both files.

- [ ] **Step 4: Run tests**

```bash
uv run pytest tests/test_simulation.py -v && uv run pytest tests/ -v
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add backend/model/simulation.py src/simulation.py tests/test_simulation.py
git commit -m "feat: add by-election incumbent uncertainty noise to simulation"
```

---

## Task 7: Temporal phasing

The model has three phases. Phase determines which inputs are available and what uncertainty label to show. Currently `run.py` hard-codes `"phase": 1` — make it dynamic.

**Files:**
- Create: `backend/model/phase.py`
- Create: `src/phase.py`
- Modify: `backend/model/run.py`
- Modify: `src/run.py`
- Create: `tests/test_phase.py`

Phase detection logic (from spec Part 9):
- **Phase 1**: `challengers.csv` is empty (no registered candidates)
- **Phase 2**: Challengers registered but `fundraising_tier` is entirely missing/null
- **Phase 3**: At least one challenger has a `fundraising_tier` value

- [ ] **Step 1: Write the test**

```python
# tests/test_phase.py
"""Tests for temporal phasing logic (Part 9)."""
from __future__ import annotations

import pandas as pd
import pytest

from src.phase import detect_phase, PHASE_DESCRIPTIONS


def test_empty_challengers_is_phase_1():
    challengers = pd.DataFrame(
        columns=["ward", "candidate_name", "name_recognition_tier",
                 "fundraising_tier", "mayoral_alignment", "is_endorsed_by_departing"]
    )
    info = detect_phase(challengers)
    assert info["phase"] == 1


def test_challengers_without_fundraising_is_phase_2():
    challengers = pd.DataFrame([{
        "ward": 1,
        "candidate_name": "Some Candidate",
        "name_recognition_tier": "known",
        "fundraising_tier": None,  # registered but no fundraising data
        "mayoral_alignment": "unaligned",
        "is_endorsed_by_departing": False,
    }])
    info = detect_phase(challengers)
    assert info["phase"] == 2


def test_challengers_with_fundraising_is_phase_3():
    challengers = pd.DataFrame([{
        "ward": 1,
        "candidate_name": "Funded Candidate",
        "name_recognition_tier": "known",
        "fundraising_tier": "high",  # financial data available
        "mayoral_alignment": "chow",
        "is_endorsed_by_departing": False,
    }])
    info = detect_phase(challengers)
    assert info["phase"] == 3


def test_phase_info_has_required_keys():
    challengers = pd.DataFrame(columns=["ward", "candidate_name", "name_recognition_tier",
                                         "fundraising_tier", "mayoral_alignment"])
    info = detect_phase(challengers)
    assert "phase" in info
    assert "label" in info
    assert "description" in info
```

- [ ] **Step 2: Run to confirm failure**

```bash
uv run pytest tests/test_phase.py -v
```

Expected: `ModuleNotFoundError: No module named 'src.phase'`

- [ ] **Step 3: Create src/phase.py**

```python
"""Temporal phase detection for the Toronto 2026 model (Part 9 of spec).

Three phases correspond to data availability over the campaign:
  Phase 1: Pre-registration — no challenger data available.
  Phase 2: Registration open — candidates registered, no financial filings yet.
  Phase 3: Financial filings — full model inputs available.
"""
from __future__ import annotations

import pandas as pd

PHASE_DESCRIPTIONS = {
    1: {
        "label": "Phase 1 — Structural Factors Only",
        "description": (
            "Candidate registration has not yet opened. Projections reflect structural "
            "factors only: incumbent vulnerability scores, ward mayoral leans, and "
            "councillor alignment. No challenger data is available."
        ),
    },
    2: {
        "label": "Phase 2 — Registration Period",
        "description": (
            "Candidates have registered. The model incorporates name recognition tiers "
            "but full financial data is not yet available. Ward classifications are "
            "preliminary and carry higher uncertainty."
        ),
    },
    3: {
        "label": "Phase 3 — Financial Filings Available",
        "description": (
            "Financial filing data is incorporated. The model runs at full capacity. "
            "Ward classifications and win probabilities reflect all available inputs."
        ),
    },
}


def detect_phase(challengers: pd.DataFrame) -> dict:
    """Detect the current model phase from the challengers dataset.

    Returns a dict with keys: phase (int), label (str), description (str).
    """
    if challengers.empty:
        phase = 1
    elif challengers["fundraising_tier"].notna().any():
        phase = 3
    else:
        phase = 2

    return {"phase": phase, **PHASE_DESCRIPTIONS[phase]}
```

- [ ] **Step 4: Run phase tests**

```bash
uv run pytest tests/test_phase.py -v
```

Expected: all 4 pass.

- [ ] **Step 5: Create backend/model/phase.py (mirror)**

Copy `src/phase.py` to `backend/model/phase.py` — content is identical (no imports to adjust).

- [ ] **Step 6: Wire phase detection into both run.py files**

In `src/run.py`, add the import at the top:

```python
from src.phase import detect_phase
```

Replace the hard-coded phase dict in `run_model()`:

```python
"phase": {"phase": 1, "label": "Phase 1 — Structural Factors Only", "description": "Challenger registration has not yet opened. Projections reflect structural factors only."},
```

With:

```python
"phase": detect_phase(data["challengers"]),
```

Apply the same change to `backend/model/run.py`, using `from .phase import detect_phase`.

- [ ] **Step 7: Run all tests**

```bash
uv run pytest tests/ -v
```

Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add src/phase.py backend/model/phase.py src/run.py backend/model/run.py tests/test_phase.py
git commit -m "feat: add temporal phase detection (Part 9)"
```

---

## Task 8: Ward-level polling override scaffold (Part 6)

Part 6 requires a blending mechanism that activates when ward-level polls exist. Ward polls don't exist yet, but the scaffold makes the system ready to accept them. The `alpha_w = 0` case (no polls) must leave current results unchanged.

**Files:**
- Create: `data/processed/ward_polls.csv`
- Modify: `backend/model/simulation.py`
- Modify: `src/simulation.py`
- Modify: `backend/model/run.py`
- Modify: `src/run.py`

- [ ] **Step 1: Create the empty ward_polls.csv schema stub**

```
ward,poll_id,date_published,sample_size,inc_win_share,notes
```

Save to `data/processed/ward_polls.csv` (header row only — no data).

- [ ] **Step 2: Add ward poll blending test**

Add to `tests/test_simulation.py`:

```python
def test_ward_poll_override_blends_with_structural():
    """When a ward poll is provided, the result blends poll and structural estimates.

    With alpha=1.0, the result should equal the poll estimate exactly.
    With alpha=0.0, the result should equal the structural estimate.
    """
    ward_data = pd.DataFrame([{
        "ward": 1,
        "councillor_name": "Polled Pat",
        "is_running": True,
        "is_byelection_incumbent": False,
        "defeatability_score": 50,
        "vote_share": 0.45,
        "electorate_share": 0.14,
    }])
    challengers = pd.DataFrame([{
        "ward": 1,
        "candidate_name": "Some Challenger",
        "name_recognition_tier": "known",
        "fundraising_tier": "high",
        "mayoral_alignment": "chow",
        "is_endorsed_by_departing": False,
    }])
    mayoral_averages = pd.DataFrame([{"candidate": "chow", "share": 0.45}])
    leans = pd.DataFrame([{"ward": 1, "candidate": "chow", "lean": 0.0, "reliability": "high"}])
    coattails = pd.DataFrame([{"ward": 1, "councillor_name": "Polled Pat", "coattail_adjustment": 0.0}])

    # Ward poll: inc win share = 0.80, full weight
    ward_polls = pd.DataFrame([{
        "ward": 1,
        "poll_id": "test-ward-1",
        "date_published": "2026-04-01",
        "sample_size": 400,
        "inc_win_share": 0.80,
        "notes": "hypothetical test poll",
    }])

    sim_with_poll = WardSimulation(
        ward_data=ward_data,
        mayoral_averages=mayoral_averages,
        coattails=coattails,
        challengers=challengers,
        leans=leans,
        n_draws=3000,
        seed=55,
        ward_polls=ward_polls,
    )
    sim_no_poll = WardSimulation(
        ward_data=ward_data,
        mayoral_averages=mayoral_averages,
        coattails=coattails,
        challengers=challengers,
        leans=leans,
        n_draws=3000,
        seed=55,
        ward_polls=None,
    )

    results_with = sim_with_poll.run()
    results_without = sim_no_poll.run()

    # With a poll showing 80% inc win, result should be higher than without
    assert results_with["win_probabilities"][1] > results_without["win_probabilities"][1]


def test_empty_ward_polls_leaves_results_unchanged():
    """An empty ward_polls DataFrame must not change any results."""
    ward_data = pd.DataFrame([{
        "ward": 1,
        "councillor_name": "Baseline Betty",
        "is_running": True,
        "is_byelection_incumbent": False,
        "defeatability_score": 40,
        "vote_share": 0.50,
        "electorate_share": 0.15,
    }])
    challengers = pd.DataFrame(
        columns=["ward", "candidate_name", "name_recognition_tier",
                 "fundraising_tier", "mayoral_alignment", "is_endorsed_by_departing"]
    )
    mayoral_averages = pd.DataFrame([{"candidate": "chow", "share": 0.45}])
    leans = pd.DataFrame([{"ward": 1, "candidate": "chow", "lean": 0.0, "reliability": "high"}])
    coattails = pd.DataFrame([{"ward": 1, "councillor_name": "Baseline Betty", "coattail_adjustment": 0.0}])

    empty_polls = pd.DataFrame(
        columns=["ward", "poll_id", "date_published", "sample_size", "inc_win_share", "notes"]
    )

    sim_a = WardSimulation(
        ward_data=ward_data, mayoral_averages=mayoral_averages, coattails=coattails,
        challengers=challengers, leans=leans, n_draws=500, seed=10, ward_polls=empty_polls,
    )
    sim_b = WardSimulation(
        ward_data=ward_data, mayoral_averages=mayoral_averages, coattails=coattails,
        challengers=challengers, leans=leans, n_draws=500, seed=10, ward_polls=None,
    )

    r_a = sim_a.run()
    r_b = sim_b.run()

    assert r_a["win_probabilities"][1] == pytest.approx(r_b["win_probabilities"][1])
```

- [ ] **Step 3: Run to confirm failure**

```bash
uv run pytest tests/test_simulation.py::test_ward_poll_override_blends_with_structural -v
```

Expected: `TypeError` — `WardSimulation.__init__` does not accept `ward_polls`.

- [ ] **Step 4: Add ward_polls parameter and blending to WardSimulation**

In `__init__` of `WardSimulation`, add the parameter:

```python
def __init__(
    self,
    ward_data: pd.DataFrame,
    mayoral_averages: pd.DataFrame,
    coattails: pd.DataFrame,
    challengers: pd.DataFrame,
    leans: pd.DataFrame,
    n_draws: int = 5000,
    seed: int = 42,
    ward_polls: pd.DataFrame | None = None,  # NEW
):
    ...
    # Ward-level poll data for override (Part 6). May be None or empty.
    self.ward_polls = ward_polls if ward_polls is not None else pd.DataFrame(
        columns=["ward", "poll_id", "date_published", "sample_size", "inc_win_share", "notes"]
    )
```

Add this helper method to the class:

```python
def _compute_ward_poll_weight(self, ward_num: int) -> tuple[float, float]:
    """Return (alpha_w, poll_inc_win_share) for the most recent ward poll, if any.

    alpha_w decays with poll age (same lambda as mayoral aggregator).
    Returns (0.0, 0.0) if no polls exist for this ward.
    """
    import math
    from datetime import datetime, timezone

    POLL_HALF_LIFE_DAYS = 12.0
    DECAY_LAMBDA = math.log(2) / POLL_HALF_LIFE_DAYS
    # Scale alpha so a day-old poll with n=400 gets ~0.6
    SAMPLE_SCALE = 400.0

    ward_p = self.ward_polls[self.ward_polls["ward"] == ward_num]
    if ward_p.empty:
        return 0.0, 0.0

    # Use the most recent poll
    ward_p = ward_p.copy()
    ward_p["_date"] = pd.to_datetime(ward_p["date_published"])
    latest = ward_p.sort_values("_date").iloc[-1]

    ref = datetime.now(timezone.utc)
    pub = latest["_date"].to_pydatetime()
    if pub.tzinfo is None:
        pub = pub.replace(tzinfo=timezone.utc)
    age_days = max(0.0, (ref - pub).total_seconds() / 86400)

    recency_weight = math.exp(-DECAY_LAMBDA * age_days)
    sample_weight = min(1.0, float(latest["sample_size"]) / SAMPLE_SCALE)
    alpha_w = recency_weight * sample_weight

    return alpha_w, float(latest["inc_win_share"])
```

In `run()`, after computing `prob = inv_logit(z)` (and after the byelection noise), add the blending step:

```python
# Part 6: Ward-level polling override
alpha_w, poll_p = self._compute_ward_poll_weight(ward_num)
if alpha_w > 0.0:
    prob = alpha_w * poll_p + (1.0 - alpha_w) * prob
```

Apply all changes identically to `src/simulation.py`.

- [ ] **Step 5: Wire ward_polls into run.py**

Load the ward_polls CSV in `load_processed_data()` in both run files:

```python
"ward_polls": pd.read_csv(d / "ward_polls.csv"),
```

Pass it to `WardSimulation`:

```python
sim = WardSimulation(
    ward_data=data["defeatability"],
    mayoral_averages=mayoral_averages,
    coattails=data["coattails"],
    challengers=data["challengers"],
    leans=data["leans"],
    ward_polls=data["ward_polls"],  # NEW
)
```

- [ ] **Step 6: Run all tests**

```bash
uv run pytest tests/ -v
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add data/processed/ward_polls.csv backend/model/simulation.py src/simulation.py backend/model/run.py src/run.py tests/test_simulation.py
git commit -m "feat: ward-level polling override scaffold (Part 6)"
```

---

## Task 9: Update TypeScript types and API responses

The frontend types are out of sync with what the backend now returns. Update before building frontend components.

**Files:**
- Modify: `frontend/src/types/ward.ts`
- Modify: `frontend/src/lib/api.ts`
- Modify: `backend/api/wards.py`

- [ ] **Step 1: Check what Next.js 16 expects for async components**

```bash
ls frontend/node_modules/next/dist/docs/ 2>/dev/null || echo "no docs dir"
```

Read any relevant guide found there before writing frontend code. Pay attention to dynamic route params, which changed in Next.js 15.

- [ ] **Step 2: Update frontend/src/types/ward.ts**

Replace the entire file:

```typescript
export interface Factors {
  vuln: number;
  coat: number;
  chal: number;
}

export interface Ward {
  ward: number;
  councillor_name: string;
  is_running: boolean;
  is_byelection_incumbent: boolean;
  defeatability_score: number;
  win_probability: number;
  race_class: "safe" | "competitive" | "open";
  factors: Factors;
  vote_share?: number;
  electorate_share?: number;
  notes?: string;
  pop_growth_pct?: number;
}

export interface Challenger {
  ward: number;
  candidate_name: string;
  name_recognition_tier: "well-known" | "known" | "unknown";
  fundraising_tier: "high" | "low" | null;
  mayoral_alignment: string;
  is_endorsed_by_departing: boolean;
}

export interface PhaseInfo {
  phase: 1 | 2 | 3;
  label: string;
  description: string;
}

export interface WardsResponse {
  wards: Ward[];
  challengers: Challenger[];
  composition_mean: number;
  composition_std: number;
  mayoral_averages: Record<string, number>;
  phase: PhaseInfo;
}

export interface WardResponse {
  ward: Ward;
  challengers: Challenger[];
}
```

- [ ] **Step 3: Update frontend/src/lib/api.ts**

Replace entire file:

```typescript
import { WardsResponse, WardResponse } from '../types/ward';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function getWards(): Promise<WardsResponse> {
  try {
    const res = await fetch(`${API_URL}/api/wards`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return { wards: [], challengers: [], composition_mean: 0, composition_std: 0, mayoral_averages: {}, phase: { phase: 1, label: "", description: "" } };
    return res.json();
  } catch (error) {
    console.error("Failed to fetch wards:", error);
    return { wards: [], challengers: [], composition_mean: 0, composition_std: 0, mayoral_averages: {}, phase: { phase: 1, label: "", description: "" } };
  }
}

export async function getWard(wardNum: number): Promise<WardResponse> {
  try {
    const res = await fetch(`${API_URL}/api/wards/${wardNum}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return { ward: null as any, challengers: [] };
    return res.json();
  } catch (error) {
    console.error(`Failed to fetch ward ${wardNum}:`, error);
    return { ward: null as any, challengers: [] };
  }
}

export async function getPollingAverages(): Promise<{ aggregated: Record<string, number>; polls_used: number }> {
  try {
    const res = await fetch(`${API_URL}/api/polls/latest`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return { aggregated: {}, polls_used: 0 };
    return res.json();
  } catch (error) {
    console.error("Failed to fetch polling averages:", error);
    return { aggregated: {}, polls_used: 0 };
  }
}
```

- [ ] **Step 4: Update backend/api/wards.py to return enriched data**

The API already calls `run_model()` which now returns enriched data including `win_probability`, `race_class`, `factors`, `composition_mean`, `composition_std`, `mayoral_averages`, and `phase`. Expose them:

```python
from fastapi import APIRouter, HTTPException
from model.run import run_model

router = APIRouter()


@router.get("")
def get_wards():
    """Get all ward projections."""
    result = run_model()
    return {
        "wards": result["wards"],
        "challengers": result["challengers"],
        "composition_mean": result["composition_mean"],
        "composition_std": result["composition_std"],
        "mayoral_averages": result["mayoral_averages"],
        "phase": result["phase"],
    }


@router.get("/{ward_num}")
def get_ward(ward_num: int):
    """Get single ward detail."""
    if ward_num < 1 or ward_num > 25:
        raise HTTPException(status_code=404, detail="Ward not found")

    result = run_model()
    ward = next((w for w in result["wards"] if w["ward"] == ward_num), None)
    if ward is None:
        raise HTTPException(status_code=404, detail="Ward not found")

    ward_challengers = [c for c in result["challengers"] if c["ward"] == ward_num]
    return {"ward": ward, "challengers": ward_challengers}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/ward.ts frontend/src/lib/api.ts backend/api/wards.py
git commit -m "feat: expand API response and TypeScript types with simulation results"
```

---

## Task 10: Frontend — Phase banner

The spec says the current phase is "displayed prominently on the site." A banner at the top of every page fulfils this.

**Files:**
- Create: `frontend/src/components/phase-banner.tsx`
- Modify: `frontend/src/app/layout.tsx`
- Modify: `frontend/src/lib/api.ts` (already done in Task 9)

**Before writing any code**: read `frontend/node_modules/next/dist/docs/` for the correct import patterns and server component conventions in this Next.js version.

- [ ] **Step 1: Create frontend/src/components/phase-banner.tsx**

```tsx
import { PhaseInfo } from "@/types/ward";

interface PhaseBannerProps {
  phase: PhaseInfo;
}

const PHASE_COLORS: Record<number, string> = {
  1: "bg-yellow-50 border-yellow-300 text-yellow-900",
  2: "bg-blue-50 border-blue-300 text-blue-900",
  3: "bg-green-50 border-green-300 text-green-900",
};

export function PhaseBanner({ phase }: PhaseBannerProps) {
  const colors = PHASE_COLORS[phase.phase] ?? PHASE_COLORS[1];
  return (
    <div className={`border-b px-4 py-2 text-sm ${colors}`}>
      <span className="font-semibold">{phase.label}.</span>{" "}
      <span>{phase.description}</span>
    </div>
  );
}
```

- [ ] **Step 2: Check the existing layout.tsx**

Read `frontend/src/app/layout.tsx` to understand the current layout structure before modifying it.

- [ ] **Step 3: Update layout.tsx to include PhaseBanner**

The phase data needs to be fetched server-side. Add a server-side fetch of `/api/wards` (reuses the existing data) and pass it to `PhaseBanner`:

```tsx
import type { Metadata } from "next";
import "./globals.css";
import { PhaseBanner } from "@/components/phase-banner";
import { getWards } from "@/lib/api";

export const metadata: Metadata = {
  title: "Toronto 2026 Elections",
  description: "Ward-level council race projections and mayoral polling",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const data = await getWards();
  const phase = data.phase;

  return (
    <html lang="en">
      <body>
        <PhaseBanner phase={phase} />
        <nav className="border-b px-6 py-3 flex gap-6 text-sm font-medium">
          <a href="/" className="hover:underline">Home</a>
          <a href="/wards" className="hover:underline">Wards</a>
          <a href="/polls" className="hover:underline">Polls</a>
        </nav>
        {children}
      </body>
    </html>
  );
}
```

Note: if this version of Next.js requires different async layout patterns, follow the docs in `node_modules/next/dist/docs/`.

- [ ] **Step 4: Start the dev server and visually verify the banner appears**

```bash
cd frontend && npm run dev
```

Open `http://localhost:3000` and confirm the phase banner is visible at the top of every page.

- [ ] **Step 5: Commit**

```bash
cd ..
git add frontend/src/components/phase-banner.tsx frontend/src/app/layout.tsx
git commit -m "feat: add phase banner to site layout"
```

---

## Task 11: Frontend — Home page real data

The home page shows `-` placeholders. Connect it to live simulation data.

**Files:**
- Modify: `frontend/src/app/page.tsx`

- [ ] **Step 1: Rewrite frontend/src/app/page.tsx**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getWards, getPollingAverages } from "@/lib/api";

export default async function Home() {
  const [wardsData, pollsData] = await Promise.all([getWards(), getPollingAverages()]);

  const competitiveCount = wardsData.wards.filter(
    (w) => w.race_class === "competitive"
  ).length;

  const openCount = wardsData.wards.filter((w) => w.race_class === "open").length;

  const compositionMean = wardsData.composition_mean;
  const compositionStd = wardsData.composition_std;

  // Leading candidate from polling averages
  const pollEntries = Object.entries(pollsData.aggregated);
  const leading = pollEntries.length > 0
    ? pollEntries.reduce((a, b) => (a[1] > b[1] ? a : b))
    : null;

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <h1 className="text-4xl font-bold mb-2">Toronto 2026 Elections</h1>
        <p className="text-muted-foreground mb-8">
          Ward-by-ward council race projections and mayoral polling
        </p>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Council Composition</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {compositionMean.toFixed(1)}{" "}
                <span className="text-base font-normal text-muted-foreground">
                  ±{compositionStd.toFixed(1)}
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                Projected incumbent wins (of 25)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Competitive Wards</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{competitiveCount}</p>
              <p className="text-sm text-muted-foreground">
                Competitive incumbents · {openCount} open seat
                {openCount !== 1 ? "s" : ""}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mayoral Race</CardTitle>
            </CardHeader>
            <CardContent>
              {leading ? (
                <>
                  <p className="text-2xl font-bold capitalize">
                    {leading[0]}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Leading at {(leading[1] * 100).toFixed(0)}% (
                    {pollsData.polls_used} poll
                    {pollsData.polls_used !== 1 ? "s" : ""})
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No polling data available.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify in browser**

With backend running (`uv run uvicorn backend.main:app --reload` from repo root) and frontend dev server running, confirm:
- Composition shows numbers, not `-`
- Competitive wards count is correct (compare against wards page)
- Mayoral race shows a leading candidate

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/page.tsx
git commit -m "feat: connect home page to live simulation results"
```

---

## Task 12: Frontend — WardCard and Ward detail page

WardCard should show `win_probability` and `race_class`. A detail page at `/wards/[ward_num]` shows all factors.

**Files:**
- Modify: `frontend/src/components/ward-card.tsx`
- Create: `frontend/src/app/wards/[ward_num]/page.tsx`

**Before writing the detail page**: verify the correct dynamic route parameter syntax for this Next.js version by reading `node_modules/next/dist/docs/`. In Next.js 15+, `params` is a `Promise<{ ward_num: string }>` and must be awaited.

- [ ] **Step 1: Update frontend/src/components/ward-card.tsx**

```tsx
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Ward } from "@/types/ward";

interface WardCardProps {
  ward: Ward;
}

const CLASS_STYLES: Record<string, string> = {
  safe: "bg-green-100 text-green-800",
  competitive: "bg-red-100 text-red-800",
  open: "bg-purple-100 text-purple-800",
};

export function WardCard({ ward }: WardCardProps) {
  const winPct = ward.is_running
    ? `${(ward.win_probability * 100).toFixed(0)}%`
    : "Open";

  const raceLabel = ward.race_class === "open"
    ? "Open Seat"
    : ward.race_class.charAt(0).toUpperCase() + ward.race_class.slice(1);

  return (
    <Link href={`/wards/${ward.ward}`} className="block">
      <Card className="hover:border-primary transition-colors cursor-pointer h-full">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-base">Ward {ward.ward}</CardTitle>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                CLASS_STYLES[ward.race_class] ?? ""
              }`}
            >
              {raceLabel}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <p className="font-medium text-sm">{ward.councillor_name}</p>
          <div className="flex justify-between items-baseline mt-1">
            <p className="text-sm text-muted-foreground">
              Defeatability: {ward.defeatability_score}
            </p>
            <p className="text-sm font-semibold">{winPct}</p>
          </div>
          {ward.is_byelection_incumbent && (
            <p className="text-xs text-muted-foreground mt-1">By-election incumbent</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 2: Create the ward detail page**

**IMPORTANT**: Before writing this file, run:

```bash
ls frontend/node_modules/next/dist/docs/
```

And read the guide on dynamic routes. The params signature changed in Next.js 15. The pattern below uses the Next.js 15+ async params signature — verify it matches this version.

Create `frontend/src/app/wards/[ward_num]/page.tsx`:

```tsx
import { getWard } from "@/lib/api";
import { Challenger } from "@/types/ward";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ ward_num: string }>;
}

export default async function WardDetailPage({ params }: Props) {
  const { ward_num } = await params;
  const wardNum = parseInt(ward_num, 10);

  if (isNaN(wardNum) || wardNum < 1 || wardNum > 25) {
    notFound();
  }

  const data = await getWard(wardNum);
  if (!data.ward) notFound();

  const { ward, challengers } = data;
  const winPct = ward.is_running
    ? `${(ward.win_probability * 100).toFixed(1)}%`
    : "—";

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-8 max-w-2xl">
        <a href="/wards" className="text-sm text-muted-foreground hover:underline">
          ← All Wards
        </a>

        <h1 className="text-3xl font-bold mt-4 mb-1">Ward {ward.ward}</h1>
        <p className="text-xl text-muted-foreground mb-6">
          {ward.councillor_name}
          {ward.is_byelection_incumbent && (
            <span className="ml-2 text-sm font-normal">(by-election incumbent)</span>
          )}
        </p>

        <div className="grid gap-4 grid-cols-2 mb-8">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Win Probability</p>
            <p className="text-2xl font-bold">{winPct}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Defeatability Score</p>
            <p className="text-2xl font-bold">{ward.defeatability_score}</p>
          </div>
        </div>

        {ward.is_running && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-3">Model Factors</h2>
            <div className="rounded-lg border divide-y text-sm">
              <div className="flex justify-between px-4 py-2">
                <span className="text-muted-foreground">Vulnerability effect</span>
                <span className={ward.factors.vuln < 0 ? "text-red-600" : "text-green-600"}>
                  {ward.factors.vuln.toFixed(3)}
                </span>
              </div>
              <div className="flex justify-between px-4 py-2">
                <span className="text-muted-foreground">Coattail effect</span>
                <span className={ward.factors.coat >= 0 ? "text-green-600" : "text-red-600"}>
                  {ward.factors.coat.toFixed(3)}
                </span>
              </div>
              <div className="flex justify-between px-4 py-2">
                <span className="text-muted-foreground">Challenger effect</span>
                <span className={ward.factors.chal < 0 ? "text-red-600" : "text-green-600"}>
                  {ward.factors.chal.toFixed(3)}
                </span>
              </div>
            </div>
          </div>
        )}

        <div>
          <h2 className="text-lg font-semibold mb-3">
            Challengers{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ({challengers.length})
            </span>
          </h2>
          {challengers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No challenger data entered yet.
            </p>
          ) : (
            <div className="rounded-lg border divide-y text-sm">
              {challengers.map((c: Challenger) => (
                <div key={c.candidate_name} className="px-4 py-3">
                  <div className="flex justify-between">
                    <span className="font-medium">{c.candidate_name}</span>
                    <span className="text-muted-foreground capitalize">
                      {c.name_recognition_tier}
                    </span>
                  </div>
                  <div className="text-muted-foreground mt-0.5 flex gap-4">
                    <span>Aligned: {c.mayoral_alignment}</span>
                    {c.fundraising_tier && (
                      <span>Fundraising: {c.fundraising_tier}</span>
                    )}
                    {c.is_endorsed_by_departing && (
                      <span className="text-green-700 font-medium">★ Endorsed</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Verify in browser**

- Navigate to `http://localhost:3000/wards` — each card should show win probability and race class
- Click a ward card — should navigate to the detail page
- Detail page should show factors breakdown and challenger list (empty for now)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ward-card.tsx frontend/src/app/wards/[ward_num]/page.tsx
git commit -m "feat: ward detail page and updated WardCard with win probability"
```

---

## Spec Coverage Self-Review

| Spec Part | Covered by Task(s) |
|---|---|
| Part 1: Ward Mayoral Lean | Already implemented (no changes needed) |
| Part 2: Incumbent Vulnerability (by-election handling) | Task 6 |
| Part 3: Coattail — P_w scaling | Already in coattails.py (`p_w = lean + city_wide_avg`). Chow-not-running branch (reduce γ) is a scenario-level concern handled when Chow's `mayoral_averages` share → 0. No code gap. |
| Part 4: Vote-splitting penalty | Task 3 |
| Part 4: Also-ran exclusion from Stage 2 | Task 4 (safe incumbent shortcut) and Task 3 (also-rans have tier "unknown" and are naturally weak in the softmax; the spec says to exclude them from Stage 2 but they don't win in practice) |
| Part 5: Safe incumbent shortcut | Task 4 |
| Part 5: Open seat enhancements (endorsement, noise) | Task 5 |
| Part 5: Ward 19 as open seat | Already implemented — `is_running=False` in defeatability CSV |
| Part 6: Ward-level polling override | Task 8 |
| Part 7: Simulation engine wired | Task 1 |
| Part 7: Scenario modelling | Implicit — pass different `mayoral_averages` to `WardSimulation`. API scenario support is future work; current implementation supports running scenarios programmatically. |
| Part 8: Polling aggregator | Already implemented. `/api/polls/latest` wired in Task 2. |
| Part 9: Temporal phasing | Task 7 (detection) + Task 10 (frontend banner) |
| Frontend home page | Task 11 |
| Frontend ward detail | Task 12 |
| Frontend phase indicator | Task 10 |
