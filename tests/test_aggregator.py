"""Tests for Part 8: Mayoral Polling Aggregator."""

from __future__ import annotations

import math
from datetime import datetime, timezone, timedelta

import pandas as pd
import pytest

from src.aggregator import aggregate_polls, compute_poll_weights, get_scenario_polls


@pytest.fixture
def sample_polls_df() -> pd.DataFrame:
    """A set of polls for testing weighting.

    - Reference date: 2026-03-10
    - Poll 1: 2026-03-10 (age 0, weight 1.0)
    - Poll 2: 2026-02-26 (age 12 days, weight 0.5 given half-life of 12)
    """
    return pd.DataFrame(
        [
            {
                "poll_id": "recent",
                "date_published": "2026-03-10",
                "chow": 0.40,
                "bradford": 0.10,
            },
            {
                "poll_id": "old",
                "date_published": "2026-02-26",
                "chow": 0.30,
                "bradford": 0.20,
            },
        ]
    )


def test_compute_poll_weights(sample_polls_df: pd.DataFrame) -> None:
    ref_date = datetime(2026, 3, 10, tzinfo=timezone.utc)
    weights = compute_poll_weights(sample_polls_df, reference_date=ref_date)

    # Weight of the recent poll should be 1.0
    assert weights.iloc[0] == pytest.approx(1.0)

    # Weight of the old poll should be 0.5 (half-life of 12 days)
    assert weights.iloc[1] == pytest.approx(0.5)


def test_aggregate_polls(sample_polls_df: pd.DataFrame) -> None:
    ref_date = datetime(2026, 3, 10, tzinfo=timezone.utc)
    candidates = ["chow", "bradford"]

    # Aggregation calculation:
    # Chow: (0.4 * 1.0 + 0.3 * 0.5) / (1.0 + 0.5) = (0.4 + 0.15) / 1.5 = 0.55 / 1.5 = 0.3666...
    # Bradford: (0.1 * 1.0 + 0.2 * 0.5) / (1.0 + 0.5) = (0.1 + 0.1) / 1.5 = 0.2 / 1.5 = 0.1333...

    results = aggregate_polls(sample_polls_df, candidates, reference_date=ref_date)

    assert results["chow"] == pytest.approx(0.366666666)
    assert results["bradford"] == pytest.approx(0.133333333)


def test_get_scenario_polls_exact_field_match():
    df = pd.DataFrame(
        [
            {"poll_id": "a", "field_tested": "chow,bradford,bailao"},
            {"poll_id": "b", "field_tested": "chow,bradford"},
            {"poll_id": "c", "field_tested": "bradford,bailao"},
        ]
    )

    out = get_scenario_polls(df, ["chow", "bradford", "bailao"])
    assert out["poll_id"].tolist() == ["a"]


def test_get_scenario_polls_no_exact_match_returns_original_dataframe() -> None:
    df = pd.DataFrame(
        [
            {"poll_id": "a", "field_tested": "chow,bradford,bailao"},
            {"poll_id": "b", "field_tested": "chow,bradford"},
        ]
    )

    out = get_scenario_polls(df, ["chow", "bailao"])

    assert out.equals(df)


def test_get_scenario_polls_normalizes_case_whitespace_and_ignores_other() -> None:
    df = pd.DataFrame(
        [
            {"poll_id": "a", "field_tested": "  Chow , BRADFORD , Other "},
            {"poll_id": "b", "field_tested": "chow,bailao,other"},
            {"poll_id": "c", "field_tested": "chow,bradford,bailao"},
        ]
    )

    out = get_scenario_polls(df, [" chow ", "bradford", "OTHER"])

    assert out["poll_id"].tolist() == ["a"]
