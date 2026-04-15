"""Tests for the Phase 1 mayoral pool model."""
from pathlib import Path
import pandas as pd

_REPO_ROOT = Path(__file__).parent.parent.parent


def _load_approval() -> pd.DataFrame:
    return pd.read_csv(_REPO_ROOT / "data" / "processed" / "approval_ratings.csv")


def _load_polls() -> pd.DataFrame:
    return pd.read_csv(_REPO_ROOT / "data" / "processed" / "polls.csv")


def test_approval_csv_has_required_columns():
    df = _load_approval()
    assert {"date", "approve", "disapprove", "not_sure"}.issubset(df.columns)
    assert len(df) >= 10


def test_approval_values_are_proportions():
    df = _load_approval()
    for col in ("approve", "disapprove", "not_sure"):
        assert df[col].between(0.0, 1.0).all(), f"{col} out of [0,1]"


def test_approval_rows_sum_to_one():
    df = _load_approval()
    row_sums = df["approve"] + df["disapprove"] + df["not_sure"]
    assert row_sums.between(0.97, 1.03).all(), f"Rows do not sum to ~1.0:\n{row_sums}"
