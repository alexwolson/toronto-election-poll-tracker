"""Tests for Part 7: Simulation Engine."""
from __future__ import annotations

import pandas as pd
import pytest

from src.simulation import WardSimulation


def _make_ward_data_1() -> pd.DataFrame:
    """Single-ward data, incumbent running."""
    return pd.DataFrame([{
        "ward": 1,
        "councillor_name": "Incumbent Alice",
        "is_running": True,
        "is_byelection_incumbent": False,
        "defeatability_score": 40,
        "vote_share": 0.50,
        "electorate_share": 0.15,
    }])


def _make_mayoral_averages() -> pd.DataFrame:
    return pd.DataFrame([
        {"candidate": "chow", "share": 0.45},
        {"candidate": "bradford", "share": 0.25},
    ])


def _make_leans_ward1() -> pd.DataFrame:
    return pd.DataFrame([
        {"ward": 1, "candidate": "chow", "lean": 0.05, "reliability": "high"},
    ])


def _make_coattails_ward1() -> pd.DataFrame:
    return pd.DataFrame([
        {"ward": 1, "councillor_name": "Incumbent Alice", "coattail_adjustment": 0.02},
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
            "mayoral_alignment": "chow",
            "is_endorsed_by_departing": False,
        },
    ])

    sim = WardSimulation(
        ward_data=_make_ward_data_1(),
        mayoral_averages=_make_mayoral_averages(),
        coattails=_make_coattails_ward1(),
        challengers=challengers,
        leans=_make_leans_ward1(),
        n_draws=100,
        seed=99,
    )

    mayoral_mood = {"chow": 0.45, "bradford": 0.25}
    cx = challengers.iloc[0]
    cy = challengers.iloc[1]

    strength_x = sim._compute_candidate_strength(cx, mayoral_mood, 1)
    strength_y = sim._compute_candidate_strength(cy, mayoral_mood, 1)

    assert strength_x > strength_y  # X is stronger (known+high vs known+low)

    adjusted = sim._apply_split_penalties(
        {"Challenger X": strength_x, "Challenger Y": strength_y},
        challengers[challengers["ward"] == 1],
    )

    assert adjusted["Challenger X"] < strength_x  # strongest penalised
    assert adjusted["Challenger Y"] == pytest.approx(strength_y)  # weaker unchanged


def test_vote_splitting_not_applied_for_single_aligned_challenger():
    """When only one challenger has an alignment, no penalty."""
    challengers = pd.DataFrame([{
        "ward": 1,
        "candidate_name": "Solo",
        "name_recognition_tier": "known",
        "fundraising_tier": "high",
        "mayoral_alignment": "chow",
        "is_endorsed_by_departing": False,
    }])

    sim = WardSimulation(
        ward_data=_make_ward_data_1(),
        mayoral_averages=_make_mayoral_averages(),
        coattails=_make_coattails_ward1(),
        challengers=challengers,
        leans=_make_leans_ward1(),
        n_draws=100,
        seed=99,
    )

    mayoral_mood = {"chow": 0.45, "bradford": 0.25}
    strength = sim._compute_candidate_strength(challengers.iloc[0], mayoral_mood, 1)

    adjusted = sim._apply_split_penalties(
        {"Solo": strength},
        challengers[challengers["ward"] == 1],
    )

    assert adjusted["Solo"] == pytest.approx(strength)
