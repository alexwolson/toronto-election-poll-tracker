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


def test_unregistered_candidate_column_included_in_share_sum():
    # A 'tory' column is not in names.py but should still be summed.
    # Shares exceed 1.0, so ValidationError must be raised.
    df = pd.read_csv(f"{FIXTURES}/polls_unregistered_candidate_bad_shares.csv")
    with pytest.raises(ValidationError, match="share"):
        validate_polls(df)


def test_unregistered_candidate_column_valid_shares_pass():
    # Same 'tory' column but shares are valid — should pass without error.
    df = pd.read_csv(f"{FIXTURES}/polls_unregistered_candidate_bad_shares.csv")
    df["chow"] = 0.40
    df["tory"] = 0.35
    df["undecided"] = 0.25
    validate_polls(df)  # should not raise


def test_share_column_not_in_field_tested_raises():
    # A share column has a value but the candidate is missing from field_tested.
    # Use shares that don't overflow so the share sum check doesn't fire first.
    df = pd.read_csv(f"{FIXTURES}/polls_valid.csv")
    df["chow"] = 0.40
    df["bradford"] = 0.30
    df["undecided"] = 0.20
    df["bailao"] = (
        0.05  # has a value but not in field_tested ("chow,bradford,undecided")
    )
    with pytest.raises(ValidationError, match="field_tested"):
        validate_polls(df)


def test_field_tested_key_without_column_raises():
    # field_tested lists a candidate that has no column in the CSV.
    df = pd.read_csv(f"{FIXTURES}/polls_valid.csv")
    df["field_tested"] = "chow,bradford,undecided,furey"  # furey has no column
    with pytest.raises(ValidationError, match="field_tested"):
        validate_polls(df)
