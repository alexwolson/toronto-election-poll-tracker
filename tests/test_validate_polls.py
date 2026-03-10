import pandas as pd
import pytest
from src.validate import validate_polls, ValidationError

FIXTURES = "tests/fixtures"


def test_valid_polls_pass():
    df = pd.read_csv(f"{FIXTURES}/polls_valid.csv")
    validate_polls(df)  # should not raise


def test_shares_exceeding_one_raises():
    df = pd.read_csv(f"{FIXTURES}/polls_bad_shares.csv")
    with pytest.raises(ValidationError, match="share"):
        validate_polls(df)


def test_conducted_after_published_raises():
    df = pd.read_csv(f"{FIXTURES}/polls_bad_dates.csv")
    with pytest.raises(ValidationError, match="date"):
        validate_polls(df)


def test_unparseable_date_raises():
    df = pd.read_csv(f"{FIXTURES}/polls_valid.csv")
    df["date_conducted"] = "not-a-date"
    with pytest.raises(ValidationError, match="date"):
        validate_polls(df)


def test_duplicate_poll_id_raises():
    df = pd.read_csv(f"{FIXTURES}/polls_valid.csv")
    df = pd.concat([df, df], ignore_index=True)  # duplicate the row
    with pytest.raises(ValidationError, match="Duplicate"):
        validate_polls(df)


def test_missing_required_column_raises():
    df = pd.read_csv(f"{FIXTURES}/polls_valid.csv").drop(columns=["poll_id"])
    with pytest.raises(ValidationError, match="missing required columns"):
        validate_polls(df)
