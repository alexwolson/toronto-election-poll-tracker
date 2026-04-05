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


def test_safe_incumbent_gets_high_win_probability():
    """Incumbents with low defeatability and no viable challengers are safe."""
    ward_data = pd.DataFrame([{
        "ward": 1,
        "councillor_name": "Safe Sam",
        "is_running": True,
        "is_byelection_incumbent": False,
        "defeatability_score": 15,
        "vote_share": 0.70,
        "electorate_share": 0.20,
    }])
    challengers = pd.DataFrame([{
        "ward": 1,
        "candidate_name": "Unknown Challenger",
        "name_recognition_tier": "unknown",
        "fundraising_tier": "low",
        "mayoral_alignment": "unaligned",
        "is_endorsed_by_departing": False,
    }])

    sim = WardSimulation(
        ward_data=ward_data,
        mayoral_averages=pd.DataFrame([{"candidate": "chow", "share": 0.45}]),
        coattails=pd.DataFrame([{"ward": 1, "councillor_name": "Safe Sam", "coattail_adjustment": 0.0}]),
        challengers=challengers,
        leans=pd.DataFrame([{"ward": 1, "candidate": "chow", "lean": 0.0, "reliability": "high"}]),
        n_draws=200,
        seed=1,
    )
    results = sim.run()
    assert results["win_probabilities"][1] > 0.90


def test_competitive_incumbent_not_classified_safe():
    """Incumbent with a known challenger is NOT treated as safe, even with low defeatability."""
    ward_data = pd.DataFrame([{
        "ward": 1,
        "councillor_name": "Vulnerable Val",
        "is_running": True,
        "is_byelection_incumbent": False,
        "defeatability_score": 25,
        "vote_share": 0.55,
        "electorate_share": 0.20,
    }])
    challengers = pd.DataFrame([{
        "ward": 1,
        "candidate_name": "Known Challenger",
        "name_recognition_tier": "known",
        "fundraising_tier": "high",
        "mayoral_alignment": "chow",
        "is_endorsed_by_departing": False,
    }])

    sim = WardSimulation(
        ward_data=ward_data,
        mayoral_averages=pd.DataFrame([{"candidate": "chow", "share": 0.45}]),
        coattails=pd.DataFrame([{"ward": 1, "councillor_name": "Vulnerable Val", "coattail_adjustment": 0.01}]),
        challengers=challengers,
        leans=pd.DataFrame([{"ward": 1, "candidate": "chow", "lean": 0.05, "reliability": "high"}]),
        n_draws=500,
        seed=2,
    )
    results = sim.run()
    # Has a viable challenger — should NOT be near 1.0
    assert results["win_probabilities"][1] < 0.97


def test_endorsed_candidate_gets_boost_in_open_seat():
    """In an open seat, the endorsed candidate wins more often than unendorsed peer."""
    ward_data = pd.DataFrame([{
        "ward": 1,
        "councillor_name": "Departed Dan",
        "is_running": False,
        "is_byelection_incumbent": False,
        "defeatability_score": 0,
        "vote_share": 0.0,
        "electorate_share": 0.0,
    }])
    challengers = pd.DataFrame([
        {
            "ward": 1,
            "candidate_name": "Endorsed Emma",
            "name_recognition_tier": "known",
            "fundraising_tier": "high",
            "mayoral_alignment": "chow",
            "is_endorsed_by_departing": True,
        },
        {
            "ward": 1,
            "candidate_name": "Unendorsed Ulrich",
            "name_recognition_tier": "known",
            "fundraising_tier": "high",
            "mayoral_alignment": "chow",
            "is_endorsed_by_departing": False,
        },
    ])

    sim = WardSimulation(
        ward_data=ward_data,
        mayoral_averages=pd.DataFrame([{"candidate": "chow", "share": 0.45}]),
        coattails=pd.DataFrame([{"ward": 1, "councillor_name": "Departed Dan", "coattail_adjustment": 0.0}]),
        challengers=challengers,
        leans=pd.DataFrame([{"ward": 1, "candidate": "chow", "lean": 0.0, "reliability": "high"}]),
        n_draws=2000,
        seed=42,
    )
    results = sim.run()

    emma_wins = sum(
        1 for row in results["winner_matrix"][:, 0]
        if row == "Endorsed Emma"
    ) / 2000
    ulrich_wins = sum(
        1 for row in results["winner_matrix"][:, 0]
        if row == "Unendorsed Ulrich"
    ) / 2000

    assert emma_wins > ulrich_wins


def test_candidate_level_ward_poll_override_reweights_open_seat_distribution():
    ward_data = pd.DataFrame([{
        "ward": 1,
        "councillor_name": "Departed",
        "is_running": False,
        "is_byelection_incumbent": False,
        "defeatability_score": 0,
        "vote_share": 0.0,
        "electorate_share": 0.0,
    }])
    challengers = pd.DataFrame([
        {"ward": 1, "candidate_name": "A", "name_recognition_tier": "known", "fundraising_tier": "high", "mayoral_alignment": "unaligned", "is_endorsed_by_departing": False},
        {"ward": 1, "candidate_name": "B", "name_recognition_tier": "known", "fundraising_tier": "high", "mayoral_alignment": "unaligned", "is_endorsed_by_departing": False},
    ])
    ward_polls = pd.DataFrame([
        {"ward": 1, "poll_id": "w1", "date_published": "2026-04-01", "sample_size": 600, "candidate_name": "A", "candidate_support": 0.8, "inc_win_share": 0.0}
    ])
    sim = WardSimulation(
        ward_data=ward_data,
        mayoral_averages=pd.DataFrame([{"candidate": "chow", "share": 0.4}]),
        coattails=pd.DataFrame([{"ward": 1, "coattail_adjustment": 0.0, "councillor_name": "Departed"}]),
        challengers=challengers,
        leans=pd.DataFrame([]),
        ward_polls=ward_polls,
        n_draws=400,
        seed=1,
    )
    out = sim.run()
    assert out["candidate_win_probabilities"][1].get("A", 0.0) > 0.6


def test_byelection_incumbent_has_wider_distribution():
    """By-election incumbents should have more variance in win probability across draws."""
    import numpy as np

    def _make_sim(is_byelection: bool, seed: int) -> WardSimulation:
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
            seed=seed,
        )

    regular_results = _make_sim(is_byelection=False, seed=7).run()
    byelection_results = _make_sim(is_byelection=True, seed=7).run()

    # By-election sim should produce more variable results (higher std in incumbent wins)
    regular_std = float(regular_results["composition_std"])
    byelection_std = float(byelection_results["composition_std"])
    assert byelection_std > regular_std



def test_simulation_returns_candidate_probabilities_matrix():
    challengers = pd.DataFrame(
        [
            {
                "ward": 1,
                "candidate_name": "Challenger X",
                "name_recognition_tier": "known",
                "fundraising_tier": "high",
                "mayoral_alignment": "chow",
                "is_endorsed_by_departing": False,
            }
        ]
    )

    sim = WardSimulation(
        ward_data=_make_ward_data_1(),
        mayoral_averages=_make_mayoral_averages(),
        coattails=_make_coattails_ward1(),
        challengers=challengers,
        leans=_make_leans_ward1(),
        n_draws=200,
        seed=123,
    )
    out = sim.run()
    assert "candidate_win_probabilities" in out
    assert 1 in out["candidate_win_probabilities"]


def test_simulation_returns_incumbent_probability_interval():
    challengers = pd.DataFrame(
        columns=[
            "ward",
            "candidate_name",
            "name_recognition_tier",
            "fundraising_tier",
            "mayoral_alignment",
            "is_endorsed_by_departing",
        ]
    )

    sim = WardSimulation(
        ward_data=_make_ward_data_1(),
        mayoral_averages=_make_mayoral_averages(),
        coattails=_make_coattails_ward1(),
        challengers=challengers,
        leans=_make_leans_ward1(),
        n_draws=200,
        seed=10,
    )
    out = sim.run()
    assert "incumbent_probability_interval" in out
    assert 1 in out["incumbent_probability_interval"]

    interval = out["incumbent_probability_interval"][1]
    assert "low" in interval
    assert "high" in interval

    low = interval["low"]
    high = interval["high"]
    assert 0.0 <= low <= high <= 1.0
    assert low <= out["win_probabilities"][1] <= high
