import pandas as pd
import pytest
from src.validate import validate_defeatability, ValidationError

FIXTURES = "tests/fixtures"


def test_valid_defeatability_passes():
    df = pd.read_csv(f"{FIXTURES}/defeatability_valid.csv")
    validate_defeatability(df)  # should not raise


def test_bad_ward_raises():
    df = pd.read_csv(f"{FIXTURES}/defeatability_bad_ward.csv")
    with pytest.raises(ValidationError, match="ward"):
        validate_defeatability(df)


def test_bad_vote_share_raises():
    df = pd.read_csv(f"{FIXTURES}/defeatability_bad_vote_share.csv")
    with pytest.raises(ValidationError, match="vote_share"):
        validate_defeatability(df)


def test_duplicate_ward_raises():
    df = pd.read_csv(f"{FIXTURES}/defeatability_duplicate_ward.csv")
    with pytest.raises(ValidationError, match="Duplicate ward"):
        validate_defeatability(df)


def test_missing_required_column_raises():
    df = pd.read_csv(f"{FIXTURES}/defeatability_valid.csv").drop(columns=["vote_share"])
    with pytest.raises(ValidationError, match="missing required columns"):
        validate_defeatability(df)


def test_bad_defeatability_score_raises():
    df = pd.read_csv(f"{FIXTURES}/defeatability_valid.csv")
    df["is_running"] = True
    df.loc[0, "defeatability_score"] = 150  # out of range
    with pytest.raises(ValidationError, match="defeatability_score"):
        validate_defeatability(df)
