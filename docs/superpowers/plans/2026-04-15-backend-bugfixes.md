# Backend Bug Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 11 confirmed bugs in the backend, ranging from a critical import crash that breaks the refresh endpoint to medium/low logic and configuration issues.

**Architecture:** All fixes are surgical — no refactors, no new abstractions. Each task targets one root cause, is covered by a failing test first, and ends with a commit. Test infrastructure (`tests/` directory) is created once in Task 1 and extended in each subsequent task.

**Tech Stack:** Python 3.12, pytest, pandas, numpy, FastAPI

---

## File Map

Files **modified**:
- `scripts/process_all.py` — fix dead `src.*` imports → `backend.model.*`
- `backend/model/coattails.py` — change inner merge to left merge
- `backend/model/simulation.py` — defer `coat_row` fetch; apply `SAFE_INCUMBENT_WIN_PROB`
- `backend/model/run.py` — add defeatability check to `_classify_race`
- `backend/model/validate.py` — add `"medium"` to `valid_fund`
- `backend/model/aggregator.py` — fix `tz_localize` crash on tz-aware dates
- `backend/model/names.py` — fix stale path in error message
- `backend/model/phase.py` — remove unreachable `else` branch
- `backend/scrapers/wikipedia.py` — remove duplicate `"furey"` key
- `backend/main.py` — fix CORS misconfiguration

Files **created**:
- `tests/__init__.py`
- `tests/model/__init__.py`
- `tests/model/test_aggregator.py`
- `tests/model/test_coattails.py`
- `tests/model/test_simulation.py`
- `tests/model/test_validate.py`
- `tests/model/test_run.py`

---

## Task 1: Fix critical import crash in `process_all.py`

`scripts/process_all.py` imports from `src.*` which has been deleted from disk. This causes every call to `/api/refresh` to fail with `ModuleNotFoundError`. Fix: update the five import lines to use `backend.model.*`.

**Files:**
- Modify: `scripts/process_all.py:18-31`
- Create: `tests/__init__.py`
- Create: `tests/model/__init__.py`
- Create: `tests/model/test_process_all.py`

- [ ] **Step 1: Create test infrastructure**

```bash
mkdir -p tests/model
touch tests/__init__.py tests/model/__init__.py
```

- [ ] **Step 2: Write the failing test**

Create `tests/model/test_process_all.py`:

```python
"""Tests for process_all.py import correctness."""
import importlib
import sys


def test_process_all_imports_cleanly():
    """process_all must import without ModuleNotFoundError.

    This catches the src.* → backend.model.* migration bug.
    """
    # Remove any cached version so we get a fresh import
    for key in list(sys.modules.keys()):
        if "process_all" in key:
            del sys.modules[key]

    # Should not raise ModuleNotFoundError
    spec = importlib.util.spec_from_file_location(
        "scripts.process_all",
        "scripts/process_all.py",
    )
    module = importlib.util.module_from_spec(spec)
    # We only test that the module-level code (imports, constants) doesn't crash.
    # We don't call main() since that requires data files.
    try:
        spec.loader.exec_module(module)
    except SystemExit:
        pass  # main() calls sys.exit on missing files — that's fine
```

- [ ] **Step 3: Run test to confirm it fails**

```bash
uv run pytest tests/model/test_process_all.py -v
```

Expected: `FAILED` with `ModuleNotFoundError: No module named 'src'`

- [ ] **Step 4: Fix the imports in `process_all.py`**

Open `scripts/process_all.py`. Replace lines 18–31:

```python
from src.aggregator import aggregate_polls, get_latest_scenario_polls
from src.coattails import compute_coattail_adjustment
from src.lean import compute_ward_mayoral_lean
from src.names import KNOWN_CANDIDATES
from src.validate import (
    ValidationError,
    validate_challengers,
    validate_council_alignment,
    validate_defeatability,
    validate_mayoral_results,
    validate_polls,
    validate_registered_electors,
    validate_ward_population,
)
```

with:

```python
from backend.model.aggregator import aggregate_polls, get_latest_scenario_polls
from backend.model.coattails import compute_coattail_adjustment
from backend.model.lean import compute_ward_mayoral_lean
from backend.model.names import KNOWN_CANDIDATES
from backend.model.validate import (
    ValidationError,
    validate_challengers,
    validate_council_alignment,
    validate_defeatability,
    validate_mayoral_results,
    validate_polls,
    validate_registered_electors,
    validate_ward_population,
)
```

- [ ] **Step 5: Run test to confirm it passes**

```bash
uv run pytest tests/model/test_process_all.py -v
```

Expected: `PASSED`

- [ ] **Step 6: Commit**

```bash
git add scripts/process_all.py tests/__init__.py tests/model/__init__.py tests/model/test_process_all.py
git commit -m "fix: update process_all.py imports from deleted src.* to backend.model.*"
```

---

## Task 2: Fix coattails inner merge dropping wards

`coattails.py:78` uses a default inner join, silently dropping any ward not in the lean DataFrame. The simulation then crashes with `IndexError` on the missing ward. Fix: left join, fill missing lean with 0.0.

**Files:**
- Modify: `backend/model/coattails.py:78`
- Create: `tests/model/test_coattails.py`

- [ ] **Step 1: Write the failing test**

Create `tests/model/test_coattails.py`:

```python
"""Tests for coattail adjustment computation."""
import pandas as pd
from backend.model.coattails import compute_coattail_adjustment


def _make_alignment_df(wards: list[int]) -> pd.DataFrame:
    return pd.DataFrame(
        {
            "ward": wards,
            "councillor_name": [f"Councillor {w}" for w in wards],
            "alignment_chow": [0.6] * len(wards),
            "alignment_tory": [0.4] * len(wards),
        }
    )


def _make_lean_df(wards: list[int]) -> pd.DataFrame:
    """Lean data covering only a subset of wards."""
    return pd.DataFrame(
        {
            "ward": wards,
            "candidate": ["chow"] * len(wards),
            "lean": [0.05] * len(wards),
        }
    )


def test_all_wards_present_when_lean_partial():
    """Every ward in alignment_df must appear in the output even if lean data
    is missing for some wards. Missing lean → lean=0.0, not dropped row.
    """
    alignment_df = _make_alignment_df([1, 2, 3, 4, 5])
    lean_df = _make_lean_df([1, 3])  # wards 2, 4, 5 have no lean entry

    result = compute_coattail_adjustment(
        alignment_df=alignment_df,
        lean_df=lean_df,
        city_wide_avg=0.35,
        incumbent_mayor_key="chow",
    )

    assert set(result["ward"].tolist()) == {1, 2, 3, 4, 5}, (
        f"Expected all 5 wards; got {sorted(result['ward'].tolist())}"
    )


def test_missing_lean_defaults_to_zero():
    """A ward with no lean entry should have lean=0.0 in the output."""
    alignment_df = _make_alignment_df([1, 2])
    lean_df = _make_lean_df([1])  # ward 2 has no lean

    result = compute_coattail_adjustment(
        alignment_df=alignment_df,
        lean_df=lean_df,
        city_wide_avg=0.35,
        incumbent_mayor_key="chow",
    )

    ward2 = result[result["ward"] == 2].iloc[0]
    assert ward2["lean"] == 0.0, f"Expected lean=0.0 for ward 2, got {ward2['lean']}"
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
uv run pytest tests/model/test_coattails.py -v
```

Expected: `FAILED` — wards 2, 4, 5 are absent from the result (inner join dropped them).

- [ ] **Step 3: Fix the merge in `coattails.py`**

Open `backend/model/coattails.py`. Replace lines 77–79:

```python
    else:
        df = df.merge(mayor_lean[["ward", "lean"]], on="ward")
        df["p_w"] = df["lean"] + city_wide_avg
```

with:

```python
    else:
        df = df.merge(mayor_lean[["ward", "lean"]], on="ward", how="left")
        df["lean"] = df["lean"].fillna(0.0)
        df["p_w"] = df["lean"] + city_wide_avg
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
uv run pytest tests/model/test_coattails.py -v
```

Expected: both tests `PASSED`

- [ ] **Step 5: Commit**

```bash
git add backend/model/coattails.py tests/model/test_coattails.py
git commit -m "fix: left-join coattails lean merge so no wards are silently dropped"
```

---

## Task 3: Fix `coat_row` unconditional fetch crashing open-seat wards

`simulation.py:350` fetches `coat_row` at the top of the ward loop, before the open-seat branch. If an open-seat ward is absent from `coattail_adjustments.csv`, this raises `IndexError` even though open-seat races never use `coat_row`. Fix: move the fetch inside the `else:` (incumbent) branch.

**Files:**
- Modify: `backend/model/simulation.py:348-408`
- Create: `tests/model/test_simulation.py`

- [ ] **Step 1: Write the failing test**

Create `tests/model/test_simulation.py`:

```python
"""Tests for WardSimulation."""
import pandas as pd
import numpy as np
from backend.model.simulation import WardSimulation


def _minimal_ward_data(ward: int, is_running: bool) -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "ward": ward,
                "councillor_name": "Test Councillor",
                "is_running": is_running,
                "defeatability_score": 40,
                "is_byelection_incumbent": False,
            }
        ]
    )


def _minimal_mayoral_averages() -> pd.DataFrame:
    return pd.DataFrame([{"candidate": "chow", "share": 0.40}])


def _minimal_challenger(ward: int) -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "ward": ward,
                "candidate_name": "Challenger A",
                "name_recognition_tier": "known",
                "fundraising_tier": "low",
                "mayoral_alignment": "unaligned",
                "is_endorsed_by_departing": False,
            }
        ]
    )


def _empty_coattails() -> pd.DataFrame:
    """Coattails DataFrame with NO entry for the ward under test."""
    return pd.DataFrame(
        columns=["ward", "councillor_name", "alignment", "alignment_delta", "lean", "p_w", "coattail_adjustment"]
    )


def _empty_leans() -> pd.DataFrame:
    return pd.DataFrame(columns=["ward", "candidate", "lean"])


def test_open_seat_does_not_crash_when_ward_absent_from_coattails():
    """An open-seat ward missing from coattail_adjustments must not raise IndexError.

    The coattail value is irrelevant for open seats; fetching it regardless is the bug.
    """
    ward = 19

    sim = WardSimulation(
        ward_data=_minimal_ward_data(ward, is_running=False),
        mayoral_averages=_minimal_mayoral_averages(),
        coattails=_empty_coattails(),           # ward 19 absent
        challengers=_minimal_challenger(ward),
        leans=_empty_leans(),
        n_draws=10,
        seed=0,
    )

    # Must not raise IndexError
    result = sim.run()
    assert ward in result["win_probabilities"]
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
uv run pytest tests/model/test_simulation.py::test_open_seat_does_not_crash_when_ward_absent_from_coattails -v
```

Expected: `FAILED` with `IndexError: single positional indexer is out-of-bounds`

- [ ] **Step 3: Restructure the simulation ward loop**

Open `backend/model/simulation.py`. The current loop body (around lines 348–447) looks like:

```python
            for ward_idx, ward_num in enumerate(ward_nums):
                row = self.ward_data[self.ward_data["ward"] == ward_num].iloc[0]
                coat_row = self.coattails[self.coattails["ward"] == ward_num].iloc[0]
                ward_challengers = self.challengers[
                    self.challengers["ward"] == ward_num
                ]

                # Safe incumbent shortcut ...
                if self._is_safe_incumbent(row, ward_challengers):
                    ...
                    continue

                raw_strengths = { ... }
                adjusted_strengths = self._apply_split_penalties(...)
                c_strengths_list = list(adjusted_strengths.values())
                f_star = max(c_strengths_list) if c_strengths_list else 0.0

                if not row["is_running"]:
                    # Open seat path — coat_row not used here
                    ...
                    continue
                else:
                    ...
                    lean = coat_row["lean"] ...
                    c_w = coat_row["alignment_delta"] * p_w * GAMMA
```

Move the `coat_row` fetch so it is only executed in the `else:` (incumbent) branch. Replace the loop body with:

```python
            for ward_idx, ward_num in enumerate(ward_nums):
                row = self.ward_data[self.ward_data["ward"] == ward_num].iloc[0]
                ward_challengers = self.challengers[
                    self.challengers["ward"] == ward_num
                ]

                # Safe incumbent shortcut (spec Part 5): skip simulation for uncontested wards
                if self._is_safe_incumbent(row, ward_challengers):
                    winner_names[i, ward_idx] = row["councillor_name"]
                    incumbent_wins_count[i] += 1
                    continue

                raw_strengths = {
                    c_row["candidate_name"]: self._compute_candidate_strength(
                        c_row, mayoral_mood, ward_num
                    )
                    for _, c_row in ward_challengers.iterrows()
                }
                adjusted_strengths = self._apply_split_penalties(
                    raw_strengths, ward_challengers
                )
                c_strengths_list = list(adjusted_strengths.values())
                f_star = max(c_strengths_list) if c_strengths_list else 0.0

                if not row["is_running"]:
                    # Open seat sub-model (spec Part 5): endorsement boost + wider noise
                    open_strengths: dict[str, float] = {}
                    for _, c_row in ward_challengers.iterrows():
                        base = self._compute_candidate_strength(
                            c_row, mayoral_mood, ward_num
                        )
                        endorsed = bool(c_row.get("is_endorsed_by_departing", False))
                        boost = ENDORSEMENT_BOOST if endorsed else 0.0
                        noise = self.rng.normal(0.0, OPEN_SEAT_NOISE_SIGMA)
                        open_strengths[c_row["candidate_name"]] = base + boost + noise

                    open_strengths = self._apply_split_penalties(
                        open_strengths, ward_challengers
                    )

                    if not open_strengths:
                        winner_names[i, ward_idx] = "Generic Challenger"
                    else:
                        names = list(open_strengths.keys())
                        probs = self._blend_candidate_probabilities(
                            ward_num, names, list(open_strengths.values())
                        )
                        winner_names[i, ward_idx] = self.rng.choice(names, p=probs)
                    continue  # skip incumbent win/loss logic below

                else:
                    # Incumbent ward: fetch coat_row only when needed
                    coat_row = self.coattails[self.coattails["ward"] == ward_num].iloc[0]
                    d_w = row["defeatability_score"]
                    # Per spec Part 3: P_w(draw) = lean * (draw/avg) + avg
                    lean = coat_row["lean"] if "lean" in coat_row.index else 0.0
                    mood_factor = (inc_draw / inc_avg) if inc_avg > 0 else 1.0
                    p_w = lean * mood_factor + inc_avg
                    c_w = coat_row["alignment_delta"] * p_w * GAMMA

                    beta_0 = 4.0
                    beta_1 = -0.05
                    beta_2 = 3.0
                    beta_3 = -0.5

                    # Log components for explanatory factors
                    vuln_effects[i, ward_idx] = beta_1 * d_w
                    coat_effects[i, ward_idx] = beta_2 * c_w
                    chal_effects[i, ward_idx] = beta_3 * f_star

                    z = (
                        beta_0
                        + vuln_effects[i, ward_idx]
                        + coat_effects[i, ward_idx]
                        + chal_effects[i, ward_idx]
                    )
                    if row.get("is_byelection_incumbent", False):
                        z += self.rng.normal(0.0, BYELECTION_NOISE_SIGMA)
                    prob = inv_logit(z)

                    # Part 6: Ward-level polling override
                    alpha_w, poll_p = self._compute_ward_poll_weight(ward_num)
                    if alpha_w > 0.0:
                        prob = alpha_w * poll_p + (1.0 - alpha_w) * prob

                if self.rng.random() < prob:
                    winner_names[i, ward_idx] = row["councillor_name"]
                    incumbent_wins_count[i] += 1
                else:
                    if not c_strengths_list:
                        winner_names[i, ward_idx] = "Generic Challenger"
                    else:
                        names = list(adjusted_strengths.keys())
                        probs = self._blend_candidate_probabilities(
                            ward_num, names, c_strengths_list
                        )
                        winner = self.rng.choice(names, p=probs)
                        winner_names[i, ward_idx] = winner
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
uv run pytest tests/model/test_simulation.py -v
```

Expected: `PASSED`

- [ ] **Step 5: Commit**

```bash
git add backend/model/simulation.py tests/model/test_simulation.py
git commit -m "fix: defer coat_row fetch to incumbent branch; open seats no longer crash on missing coattails"
```

---

## Task 4: Apply `SAFE_INCUMBENT_WIN_PROB` and sync `race_class` criteria

Two related bugs:
1. `SAFE_INCUMBENT_WIN_PROB = 0.97` is defined but never used — safe incumbents win 100% of draws instead of 97%.
2. `_classify_race` in `run.py` labels a ward "safe" with no defeatability check, but the simulation's `_is_safe_incumbent` requires `defeatability_score < 30`. A ward with high defeatability but no viable challengers gets `race_class="safe"` while the simulation runs it as competitive.

Fix both: add a 3% upset draw for safe incumbents; add the defeatability check to `_classify_race`.

**Files:**
- Modify: `backend/model/simulation.py` — use `SAFE_INCUMBENT_WIN_PROB`
- Modify: `backend/model/run.py:42-52` — add defeatability check to `_classify_race`
- Create: `tests/model/test_run.py`
- Extend: `tests/model/test_simulation.py`

- [ ] **Step 1: Write the failing tests**

Add to `tests/model/test_simulation.py`:

```python
def test_safe_incumbent_win_probability_is_not_one():
    """Safe incumbents should win ~97% of draws, not 100%.

    SAFE_INCUMBENT_WIN_PROB = 0.97 is defined but currently unused, so safe
    incumbents win every draw. With enough draws the mean should be < 1.0.
    """
    from backend.model.simulation import SAFE_INCUMBENT_WIN_PROB

    ward = 1
    ward_data = pd.DataFrame(
        [
            {
                "ward": ward,
                "councillor_name": "Safe Councillor",
                "is_running": True,
                "defeatability_score": 10,  # well below threshold
                "is_byelection_incumbent": False,
            }
        ]
    )
    # No viable challengers → qualifies for safe incumbent shortcut
    challengers = pd.DataFrame(
        [
            {
                "ward": ward,
                "candidate_name": "Unknown Challenger",
                "name_recognition_tier": "unknown",
                "fundraising_tier": "low",
                "mayoral_alignment": "unaligned",
                "is_endorsed_by_departing": False,
            }
        ]
    )
    coattails = pd.DataFrame(
        [{"ward": ward, "alignment_delta": 0.0, "lean": 0.0, "p_w": 0.35}]
    )

    sim = WardSimulation(
        ward_data=ward_data,
        mayoral_averages=_minimal_mayoral_averages(),
        coattails=coattails,
        challengers=challengers,
        leans=_empty_leans(),
        n_draws=2000,
        seed=42,
    )
    result = sim.run()
    win_prob = result["win_probabilities"][ward]
    assert win_prob < 1.0, (
        f"Safe incumbent should not win 100% of draws (got {win_prob:.4f}). "
        f"SAFE_INCUMBENT_WIN_PROB={SAFE_INCUMBENT_WIN_PROB} is unused."
    )
    # Should be close to SAFE_INCUMBENT_WIN_PROB
    assert abs(win_prob - SAFE_INCUMBENT_WIN_PROB) < 0.03, (
        f"Expected win probability near {SAFE_INCUMBENT_WIN_PROB}, got {win_prob:.4f}"
    )
```

Create `tests/model/test_run.py`:

```python
"""Tests for run.py model pipeline."""
import pandas as pd
from backend.model.run import _classify_race
from backend.model.simulation import SAFE_DEFEATABILITY_THRESHOLD


def test_classify_race_high_defeatability_no_challengers_is_competitive():
    """A ward with high defeatability and no viable challengers must not be
    classified as 'safe'. The simulation's _is_safe_incumbent requires
    defeatability_score < SAFE_DEFEATABILITY_THRESHOLD, so _classify_race must
    agree to avoid showing 'safe' with a simulation-derived (non-safe) win prob.
    """
    row = {
        "is_running": True,
        "defeatability_score": SAFE_DEFEATABILITY_THRESHOLD + 1,  # e.g. 31
    }
    challengers = []  # no challengers at all

    result = _classify_race(row, challengers)

    assert result != "safe", (
        f"Ward with defeatability={row['defeatability_score']} (>= threshold "
        f"{SAFE_DEFEATABILITY_THRESHOLD}) should not be 'safe', got '{result}'"
    )


def test_classify_race_low_defeatability_no_challengers_is_safe():
    """A ward with low defeatability and no viable challengers is 'safe'."""
    row = {
        "is_running": True,
        "defeatability_score": SAFE_DEFEATABILITY_THRESHOLD - 1,  # e.g. 29
    }
    challengers = []

    result = _classify_race(row, challengers)
    assert result == "safe"
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
uv run pytest tests/model/test_simulation.py::test_safe_incumbent_win_probability_is_not_one tests/model/test_run.py -v
```

Expected: both `FAILED`.

- [ ] **Step 3: Apply `SAFE_INCUMBENT_WIN_PROB` in the simulation**

In `backend/model/simulation.py`, find the safe incumbent shortcut block:

```python
                if self._is_safe_incumbent(row, ward_challengers):
                    winner_names[i, ward_idx] = row["councillor_name"]
                    incumbent_wins_count[i] += 1
                    continue
```

Replace with:

```python
                if self._is_safe_incumbent(row, ward_challengers):
                    if self.rng.random() < SAFE_INCUMBENT_WIN_PROB:
                        winner_names[i, ward_idx] = row["councillor_name"]
                        incumbent_wins_count[i] += 1
                    else:
                        # Rare upset — pick strongest challenger
                        if not c_strengths_list:
                            winner_names[i, ward_idx] = "Generic Challenger"
                        else:
                            names = list(adjusted_strengths.keys())
                            probs = self._blend_candidate_probabilities(
                                ward_num, names, c_strengths_list
                            )
                            winner_names[i, ward_idx] = self.rng.choice(names, p=probs)
                    continue
```

- [ ] **Step 4: Add defeatability check to `_classify_race` in `run.py`**

In `backend/model/run.py`, replace:

```python
def _classify_race(row: dict, challengers_for_ward: list[dict]) -> str:
    if not row["is_running"]:
        return "open"
    viable = [
        c
        for c in challengers_for_ward
        if c["name_recognition_tier"] in ("well-known", "known")
    ]
    if viable:
        return "competitive"
    return "safe"
```

with:

```python
from .simulation import SAFE_DEFEATABILITY_THRESHOLD


def _classify_race(row: dict, challengers_for_ward: list[dict]) -> str:
    if not row["is_running"]:
        return "open"
    viable = [
        c
        for c in challengers_for_ward
        if c["name_recognition_tier"] in ("well-known", "known")
    ]
    if viable:
        return "competitive"
    if row.get("defeatability_score", 0) >= SAFE_DEFEATABILITY_THRESHOLD:
        return "competitive"
    return "safe"
```

Note: the `from .simulation import SAFE_DEFEATABILITY_THRESHOLD` line goes at the top of the file with the other imports, not inside the function. `run.py` already imports from `.simulation` so add `SAFE_DEFEATABILITY_THRESHOLD` to that import line:

```python
from .simulation import WardSimulation, SAFE_DEFEATABILITY_THRESHOLD
```

- [ ] **Step 5: Run all tests to confirm they pass**

```bash
uv run pytest tests/model/test_simulation.py tests/model/test_run.py -v
```

Expected: all `PASSED`

- [ ] **Step 6: Commit**

```bash
git add backend/model/simulation.py backend/model/run.py tests/model/test_simulation.py tests/model/test_run.py
git commit -m "fix: apply SAFE_INCUMBENT_WIN_PROB in simulation; sync race_class defeatability check"
```

---

## Task 5: Fix fundraising tier validation rejecting `"medium"`

`validate.py:341` only allows `{"high", "low"}` for `fundraising_tier`. The simulation handles `"medium"` explicitly. Any challenger CSV row with `fundraising_tier="medium"` fails validation, crashing `process_all.py`.

**Files:**
- Modify: `backend/model/validate.py:341`
- Create: `tests/model/test_validate.py`

- [ ] **Step 1: Write the failing test**

Create `tests/model/test_validate.py`:

```python
"""Tests for input validation functions."""
import pandas as pd
import pytest
from backend.model.validate import ValidationError, validate_challengers


def _base_challengers_row(**overrides) -> dict:
    base = {
        "ward": 1,
        "candidate_name": "Test Candidate",
        "name_recognition_tier": "known",
        "fundraising_tier": "high",
        "mayoral_alignment": "unaligned",
        "is_endorsed_by_departing": False,
        "last_updated": "2026-01-01",
    }
    base.update(overrides)
    return base


def test_validate_challengers_accepts_medium_fundraising_tier():
    """'medium' fundraising tier is handled by simulation.py but was excluded
    from the validation allowlist, causing a crash for any challenger with
    fundraising_tier='medium'.
    """
    df = pd.DataFrame([_base_challengers_row(fundraising_tier="medium")])
    # Should not raise
    validate_challengers(df)


def test_validate_challengers_still_rejects_invalid_fundraising_tier():
    """An unrecognised fundraising tier like 'very-high' must still be rejected."""
    df = pd.DataFrame([_base_challengers_row(fundraising_tier="very-high")])
    with pytest.raises(ValidationError, match="fundraising_tier"):
        validate_challengers(df)


def test_validate_challengers_accepts_high_and_low():
    """Original valid tiers must still pass."""
    for tier in ("high", "low"):
        df = pd.DataFrame([_base_challengers_row(fundraising_tier=tier)])
        validate_challengers(df)
```

- [ ] **Step 2: Run tests to confirm first test fails**

```bash
uv run pytest tests/model/test_validate.py -v
```

Expected: `test_validate_challengers_accepts_medium_fundraising_tier` `FAILED` with `ValidationError: Invalid fundraising_tier`.

- [ ] **Step 3: Add `"medium"` to `valid_fund`**

In `backend/model/validate.py`, replace:

```python
    valid_fund = {"high", "low"}
```

with:

```python
    valid_fund = {"high", "medium", "low"}
```

- [ ] **Step 4: Run tests to confirm all pass**

```bash
uv run pytest tests/model/test_validate.py -v
```

Expected: all three tests `PASSED`

- [ ] **Step 5: Commit**

```bash
git add backend/model/validate.py tests/model/test_validate.py
git commit -m "fix: add 'medium' to valid fundraising tiers in validate_challengers"
```

---

## Task 6: Fix `tz_localize` crash on timezone-aware dates

`aggregator.py:32` calls `.dt.tz_localize("UTC")` on already-parsed dates. If any `date_published` value includes timezone info (e.g., `"2026-03-08T00:00:00+00:00"`), this raises `TypeError: Already tz-aware`. Fix: use `pd.to_datetime(..., utc=True)` which handles both naive and aware inputs.

**Files:**
- Modify: `backend/model/aggregator.py:32`
- Extend: `tests/model/test_aggregator.py`

- [ ] **Step 1: Write the failing test**

Create `tests/model/test_aggregator.py`:

```python
"""Tests for the mayoral polling aggregator."""
import pandas as pd
import pytest
from backend.model.aggregator import compute_poll_weights


def _polls_with_naive_dates() -> pd.DataFrame:
    return pd.DataFrame(
        {
            "date_published": ["2026-03-01", "2026-03-08"],
            "chow": [0.38, 0.40],
            "bradford": [0.20, 0.22],
        }
    )


def _polls_with_aware_dates() -> pd.DataFrame:
    """Dates that include UTC offset — triggers the tz_localize bug."""
    return pd.DataFrame(
        {
            "date_published": [
                "2026-03-01T00:00:00+00:00",
                "2026-03-08T00:00:00+00:00",
            ],
            "chow": [0.38, 0.40],
            "bradford": [0.20, 0.22],
        }
    )


def test_compute_poll_weights_accepts_tz_naive_dates():
    """Baseline: naive date strings must work."""
    df = _polls_with_naive_dates()
    weights = compute_poll_weights(df)
    assert len(weights) == 2
    assert all(0 < w <= 1.0 for w in weights)


def test_compute_poll_weights_accepts_tz_aware_dates():
    """Timezone-aware ISO strings must not raise TypeError."""
    df = _polls_with_aware_dates()
    # Must not raise: TypeError: Already tz-aware, use tz_convert to convert
    weights = compute_poll_weights(df)
    assert len(weights) == 2
    assert all(0 < w <= 1.0 for w in weights)
```

- [ ] **Step 2: Run tests to confirm the second test fails**

```bash
uv run pytest tests/model/test_aggregator.py -v
```

Expected: `test_compute_poll_weights_accepts_tz_aware_dates` `FAILED` with `TypeError: Already tz-aware`.

- [ ] **Step 3: Fix the date parsing in `aggregator.py`**

In `backend/model/aggregator.py`, replace lines 31–33:

```python
    # Use date_published for age calculation
    published_dates = pd.to_datetime(df["date_published"]).dt.tz_localize("UTC")
    ages_days = (reference_date - published_dates).dt.total_seconds() / (24 * 3600)
```

with:

```python
    # Use date_published for age calculation
    # utc=True handles both naive strings ("2026-03-08") and tz-aware ISO strings.
    published_dates = pd.to_datetime(df["date_published"], utc=True)
    ages_days = (reference_date - published_dates).dt.total_seconds() / (24 * 3600)
```

- [ ] **Step 4: Run tests to confirm all pass**

```bash
uv run pytest tests/model/test_aggregator.py -v
```

Expected: both tests `PASSED`

- [ ] **Step 5: Commit**

```bash
git add backend/model/aggregator.py tests/model/test_aggregator.py
git commit -m "fix: use pd.to_datetime(utc=True) to handle tz-aware date strings in aggregator"
```

---

## Task 7: Fix remaining low-priority issues (no new tests needed)

Five small fixes with no meaningful test surface: CORS misconfiguration, dead `else` branch in `phase.py`, duplicate key in `wikipedia.py`, stale path in `names.py` error message.

**Files:**
- Modify: `backend/main.py:26-32`
- Modify: `backend/model/phase.py:48-52`
- Modify: `backend/scrapers/wikipedia.py:88-90`
- Modify: `backend/model/names.py:60`

- [ ] **Step 1: Fix CORS in `main.py`**

In `backend/main.py`, replace:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

with:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

`allow_credentials=True` with `allow_origins=["*"]` is rejected by all browsers per the CORS spec. This API has no authentication, so `False` is correct.

- [ ] **Step 2: Remove unreachable `else` branch in `phase.py`**

In `backend/model/phase.py`, replace:

```python
    if challengers.empty:
        phase = 1
    elif "fundraising_tier" not in challengers.columns or challengers["fundraising_tier"].isna().all():
        phase = 2
    elif challengers["fundraising_tier"].notna().any():
        phase = 3
    else:
        phase = 1
```

with:

```python
    if challengers.empty:
        phase = 1
    elif "fundraising_tier" not in challengers.columns or challengers["fundraising_tier"].isna().all():
        phase = 2
    else:
        phase = 3
```

The original `elif challengers["fundraising_tier"].notna().any(): phase = 3` is the only reachable branch after the first two; the final `else: phase = 1` was dead code. The simplified form is equivalent and clearer.

- [ ] **Step 3: Remove duplicate `"furey"` key in `wikipedia.py`**

In `backend/scrapers/wikipedia.py`, the `CANDIDATE_MAP` dict has `"furey": "furey"` on lines 88 and 90. Remove the second occurrence. The block should read:

```python
    CANDIDATE_MAP = {
        "chow": "chow",
        "bradford": "bradford",
        "bailão": "bailao",
        "bailao": "bailao",
        "furey": "furey",
        "tory": "tory",
        "matlow": "matlow",
        "mendicino": "mendicino",
        "ford": "ford",
        "saunders": "saunders",
        "hunter": "hunter"
    }
```

- [ ] **Step 4: Fix stale path reference in `names.py` error message**

In `backend/model/names.py`, replace:

```python
        raise CanonicalNameError(
            f"Unrecognised candidate name: {name!r}. "
            f"Add it to src/names.py if it is a valid variation."
        )
```

with:

```python
        raise CanonicalNameError(
            f"Unrecognised candidate name: {name!r}. "
            f"Add it to backend/model/names.py if it is a valid variation."
        )
```

- [ ] **Step 5: Verify all existing tests still pass**

```bash
uv run pytest tests/ -v
```

Expected: all tests `PASSED`

- [ ] **Step 6: Commit**

```bash
git add backend/main.py backend/model/phase.py backend/scrapers/wikipedia.py backend/model/names.py
git commit -m "fix: CORS credentials, phase dead code, wikipedia duplicate key, names error message path"
```

---

## Self-Review

**Spec coverage** (bugs from the analysis):

| Bug | Task |
|-----|------|
| `process_all.py` imports `src.*` (deleted) | Task 1 |
| Coattails inner merge drops wards | Task 2 |
| `coat_row` fetched before open-seat check | Task 3 |
| `SAFE_INCUMBENT_WIN_PROB` unused (safe = 100%) | Task 4 |
| `race_class` missing defeatability check | Task 4 |
| `validate.py` rejects `"medium"` fundraising | Task 5 |
| `tz_localize` crash on tz-aware dates | Task 6 |
| `allow_credentials=True` + wildcard origin | Task 7 |
| Duplicate `"furey"` key in `CANDIDATE_MAP` | Task 7 |
| Unreachable `else: phase = 1` | Task 7 |
| `names.py` error points to deleted path | Task 7 |

All 11 bugs covered. ✓

**Placeholder scan:** No TBDs, no "similar to task N" shortcuts, all code blocks complete. ✓

**Type consistency:** `SAFE_DEFEATABILITY_THRESHOLD` imported in Task 4 is the same name defined in `simulation.py`. `SAFE_INCUMBENT_WIN_PROB` used in Task 4 is defined in `simulation.py` at line 31. ✓
