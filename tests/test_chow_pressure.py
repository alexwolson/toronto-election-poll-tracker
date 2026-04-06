from __future__ import annotations

import pandas as pd

from backend.model.chow_pressure import (
    adaptive_half_life_days,
    adaptive_trend_horizon_days,
    compute_chow_pressure_payload,
    consolidation_factor,
    effective_number_of_parties,
    poll_demand,
    trend_label,
)


def test_effective_number_of_parties_for_even_split():
    assert effective_number_of_parties([0.5, 0.5]) == 2.0


def test_consolidation_factor_uses_inverse_sqrt_enp():
    assert round(consolidation_factor([0.5, 0.5]), 4) == 0.7071


def test_poll_demand_uses_one_minus_chow_times_consolidation():
    demand = poll_demand(chow_share=0.45, non_chow_shares=[0.30, 0.25])
    assert 0 < demand < 0.55


def test_adaptive_half_life_shortens_with_high_volume_low_dispersion():
    hl = adaptive_half_life_days(recent_poll_count=8, chow_std=0.01)
    assert hl < 21


def test_adaptive_half_life_lengthens_with_low_volume_high_dispersion():
    hl = adaptive_half_life_days(recent_poll_count=1, chow_std=0.08)
    assert hl > 21


def test_adaptive_trend_horizon_tracks_half_life_direction():
    fast = adaptive_trend_horizon_days(recent_poll_count=8, chow_std=0.01)
    slow = adaptive_trend_horizon_days(recent_poll_count=1, chow_std=0.08)
    assert fast < slow


def test_trend_label_rising_when_slope_positive():
    assert trend_label(0.015) == "rising"


def test_compute_chow_pressure_payload_returns_expected_shape():
    polls = pd.DataFrame(
        [
            {
                "date_published": "2026-03-01",
                "field_tested": "chow, bradford, furey",
                "chow": 0.45,
                "bradford": 0.30,
                "furey": 0.15,
                "tory": 0.0,
                "other": 0.10,
            },
            {
                "date_published": "2026-03-08",
                "field_tested": "chow, bradford, tory",
                "chow": 0.42,
                "bradford": 0.31,
                "furey": 0.00,
                "tory": 0.17,
                "other": 0.10,
            },
        ]
    )

    payload = compute_chow_pressure_payload(polls)

    assert set(payload.keys()) == {
        "value",
        "band",
        "trend",
        "methodology_version",
        "computed_at",
        "diagnostics",
    }
    assert 0.0 <= payload["value"] <= 1.0
    assert payload["band"] in {"low", "moderate", "elevated"}
    assert payload["trend"] in {"rising", "flat", "easing", "insufficient"}
    assert set(payload["diagnostics"].keys()) == {
        "adaptive_half_life_days",
        "adaptive_trend_horizon_days",
        "chow_share_std_recent",
    }
