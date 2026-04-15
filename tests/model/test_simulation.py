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
