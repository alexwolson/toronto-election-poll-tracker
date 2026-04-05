"""Tests for Part 1: Ward Mayoral Lean computation."""

from __future__ import annotations

import pandas as pd
import pytest

from src.lean import compute_ward_mayoral_lean


@pytest.fixture
def sample_results_df() -> pd.DataFrame:
    """A minimal set of results for testing.

    - 2 wards
    - 2 candidates in 2023
    - 1 candidate in 2018
    - 1 minor candidate (not tracked)
    """
    return pd.DataFrame(
        [
            # 2023 - Ward 1 (Total votes: 1000)
            {"year": 2023, "ward": 1, "candidate": "Chow Olivia", "votes": 400},  # 40%
            {"year": 2023, "ward": 1, "candidate": "Bradford Brad", "votes": 100},  # 10%
            {"year": 2023, "ward": 1, "candidate": "Other Candidate", "votes": 500},  # 50%
            # 2023 - Ward 2 (Total votes: 2000)
            {"year": 2023, "ward": 2, "candidate": "Chow Olivia", "votes": 600},  # 30%
            {"year": 2023, "ward": 2, "candidate": "Bradford Brad", "votes": 300},  # 15%
            {"year": 2023, "ward": 2, "candidate": "Other Candidate", "votes": 1100},  # 55%
            # 2018 - Ward 1 (Total votes: 1000)
            {"year": 2018, "ward": 1, "candidate": "Tory John", "votes": 600},  # 60%
            {"year": 2018, "ward": 1, "candidate": "Minor Guy", "votes": 400},  # 40%
            # 2018 - Ward 2 (Total votes: 2000)
            {"year": 2018, "ward": 2, "candidate": "Tory John", "votes": 1400},  # 70%
            {"year": 2018, "ward": 2, "candidate": "Minor Guy", "votes": 600},  # 30%
        ]
    )


def test_compute_ward_mayoral_lean(sample_results_df: pd.DataFrame) -> None:
    leans = compute_ward_mayoral_lean(sample_results_df)

    # City-wide calculations for validation:
    # 2023:
    # Total votes = 1000 + 2000 = 3000
    # Chow votes = 400 + 600 = 1000 -> 1000/3000 = 1/3 (0.333...)
    # Bradford votes = 100 + 300 = 400 -> 400/3000 = 2/15 (0.133...)
    #
    # Ward 1 (2023):
    # Chow share = 400/1000 = 0.4
    # Chow dev = 0.4 - 0.333 = 0.0666...
    # Bradford share = 100/1000 = 0.1
    # Bradford dev = 0.1 - 0.133 = -0.0333...
    #
    # Ward 2 (2023):
    # Chow share = 600/2000 = 0.3
    # Chow dev = 0.3 - 0.333 = -0.0333...
    # Bradford share = 300/2000 = 0.15
    # Bradford dev = 0.15 - 0.133 = 0.01666...
    #
    # 2018:
    # Total votes = 1000 + 2000 = 3000
    # Tory votes = 600 + 1400 = 2000 -> 2000/3000 = 2/3 (0.666...)
    #
    # Ward 1 (2018):
    # Tory share = 600/1000 = 0.6
    # Tory dev = 0.6 - 0.666 = -0.0666...
    #
    # Ward 2 (2018):
    # Tory share = 1400/2000 = 0.7
    # Tory dev = 0.7 - 0.666 = 0.0333...

    # Assertions for Chow
    chow_w1_row = leans[(leans["ward"] == 1) & (leans["candidate"] == "chow")]
    assert chow_w1_row["lean"].iloc[0] == pytest.approx(0.4 - (1000 / 3000))
    assert chow_w1_row["reliability"].iloc[0] == "high"

    chow_w2_row = leans[(leans["ward"] == 2) & (leans["candidate"] == "chow")]
    assert chow_w2_row["lean"].iloc[0] == pytest.approx(0.3 - (1000 / 3000))
    assert chow_w2_row["reliability"].iloc[0] == "high"

    # Assertions for Tory
    tory_w1_row = leans[(leans["ward"] == 1) & (leans["candidate"] == "tory")]
    assert tory_w1_row["lean"].iloc[0] == pytest.approx(0.6 - (2000 / 3000))
    assert tory_w1_row["reliability"].iloc[0] == "high"

    tory_w2_row = leans[(leans["ward"] == 2) & (leans["candidate"] == "tory")]
    assert tory_w2_row["lean"].iloc[0] == pytest.approx(0.7 - (2000 / 3000))
    assert tory_w2_row["reliability"].iloc[0] == "high"

    # Assertions for Bradford
    brad_w1_row = leans[(leans["ward"] == 1) & (leans["candidate"] == "bradford")]
    assert brad_w1_row["lean"].iloc[0] == pytest.approx(0.1 - (400 / 3000))
    assert brad_w1_row["reliability"].iloc[0] == "low"

    # Ensure "Other Candidate" is not in the output
    assert "other" not in leans["candidate"].tolist()
    assert "other candidate" not in leans["candidate"].tolist()
