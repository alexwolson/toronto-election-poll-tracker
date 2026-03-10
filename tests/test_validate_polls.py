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
