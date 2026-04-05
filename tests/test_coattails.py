"""Tests for Part 3: Mayoral Coattail Adjustment."""

from __future__ import annotations

import pandas as pd
import pytest

from src.coattails import compute_coattail_adjustment


@pytest.fixture
def alignment_df() -> pd.DataFrame:
    """Sample councillor alignment with the mayor."""
    return pd.DataFrame(
        [
            {"ward": 1, "councillor_name": "Ally", "alignment_chow": 0.9},  # High
            {"ward": 2, "councillor_name": "Centrist", "alignment_chow": 0.5},  # Average
            {"ward": 3, "councillor_name": "Opponent", "alignment_chow": 0.1},  # Low
        ]
    )


@pytest.fixture
def lean_df() -> pd.DataFrame:
    """Sample ward lean for the mayor (Chow)."""
    return pd.DataFrame(
        [
            {"ward": 1, "candidate": "chow", "lean": 0.1},  # Strong in ward 1
            {"ward": 2, "candidate": "chow", "lean": 0.0},  # Neutral in ward 2
            {"ward": 3, "candidate": "chow", "lean": -0.1},  # Weak in ward 3
        ]
    )


def test_compute_coattail_adjustment(alignment_df: pd.DataFrame, lean_df: pd.DataFrame) -> None:
    city_wide_avg = 0.4
    gamma = 0.5
    
    # mean_alignment = (0.9 + 0.5 + 0.1) / 3 = 0.5
    #
    # Ward 1:
    # alignment_delta = 0.9 - 0.5 = 0.4
    # p_w = 0.1 + 0.4 = 0.5
    # coattail = 0.4 * 0.5 * 0.5 = 0.1
    #
    # Ward 2:
    # alignment_delta = 0.5 - 0.5 = 0.0
    # p_w = 0.0 + 0.4 = 0.4
    # coattail = 0.0 * 0.4 * 0.5 = 0.0
    #
    # Ward 3:
    # alignment_delta = 0.1 - 0.5 = -0.4
    # p_w = -0.1 + 0.4 = 0.3
    # coattail = -0.4 * 0.3 * 0.5 = -0.06
    
    results = compute_coattail_adjustment(
        alignment_df, lean_df, city_wide_avg, gamma=gamma
    )
    
    w1 = results[results["ward"] == 1]["coattail_adjustment"].iloc[0]
    assert w1 == pytest.approx(0.1)
    
    w2 = results[results["ward"] == 2]["coattail_adjustment"].iloc[0]
    assert w2 == pytest.approx(0.0)
    
    w3 = results[results["ward"] == 3]["coattail_adjustment"].iloc[0]
    assert w3 == pytest.approx(-0.06)
