"""Tests for validate_mayoral_results() and validate_registered_electors()."""

from __future__ import annotations

import pandas as pd
import pytest

from src.validate import (
    ValidationError,
    validate_mayoral_results,
    validate_registered_electors,
)


# ---------------------------------------------------------------------------
# Fixtures helpers
# ---------------------------------------------------------------------------


def _results_df(**overrides) -> pd.DataFrame:
    """Minimal valid mayoral_results DataFrame."""
    base = {
        "year": [2022, 2022],
        "ward": [1, 1],
        "candidate": ["Tory John", "Penalosa Gil"],
        "votes": [11146, 1019],
    }
    base.update(overrides)
    return pd.DataFrame(base)


def _electors_df(**overrides) -> pd.DataFrame:
    """Minimal valid registered_electors DataFrame."""
    base = {
        "year": [2022, 2022],
        "ward": [1, 2],
        "eligible_electors": [70797, 89491],
    }
    base.update(overrides)
    return pd.DataFrame(base)


# ---------------------------------------------------------------------------
# validate_mayoral_results
# ---------------------------------------------------------------------------


def test_valid_results_pass():
    validate_mayoral_results(_results_df())


def test_results_missing_required_column_raises():
    df = _results_df()
    df = df.drop(columns=["votes"])
    with pytest.raises(ValidationError, match="missing required columns"):
        validate_mayoral_results(df)


def test_results_bad_ward_raises():
    df = _results_df(ward=[0, 26])
    with pytest.raises(ValidationError, match="ward values outside"):
        validate_mayoral_results(df)


def test_results_negative_votes_raises():
    df = _results_df(votes=[100, -5])
    with pytest.raises(ValidationError, match="votes must be non-negative"):
        validate_mayoral_results(df)


def test_results_missing_candidate_name_raises():
    df = _results_df(candidate=["Tory John", None])
    with pytest.raises(ValidationError, match="missing candidate"):
        validate_mayoral_results(df)


# ---------------------------------------------------------------------------
# validate_registered_electors
# ---------------------------------------------------------------------------


def test_valid_electors_pass():
    validate_registered_electors(_electors_df())


def test_electors_missing_required_column_raises():
    df = _electors_df()
    df = df.drop(columns=["eligible_electors"])
    with pytest.raises(ValidationError, match="missing required columns"):
        validate_registered_electors(df)


def test_electors_bad_ward_raises():
    df = _electors_df(ward=[0, 2])
    with pytest.raises(ValidationError, match="ward values outside"):
        validate_registered_electors(df)


def test_electors_zero_electors_raises():
    df = _electors_df(eligible_electors=[70797, 0])
    with pytest.raises(ValidationError, match="eligible_electors must be positive"):
        validate_registered_electors(df)


def test_electors_duplicate_ward_year_raises():
    df = pd.DataFrame(
        {
            "year": [2022, 2022],
            "ward": [1, 1],
            "eligible_electors": [70797, 70797],
        }
    )
    with pytest.raises(ValidationError, match="Duplicate ward/year"):
        validate_registered_electors(df)
