import pandas as pd
import pytest
from src.validate import validate_council_alignment, ValidationError

FIXTURES = "tests/fixtures"


def test_valid_council_passes():
    df = pd.read_csv(f"{FIXTURES}/council_valid.csv")
    validate_council_alignment(df)  # should not raise


def test_bad_ward_raises():
    df = pd.read_csv(f"{FIXTURES}/council_bad_ward.csv")
    with pytest.raises(ValidationError, match="ward"):
        validate_council_alignment(df)


def test_bad_alignment_score_raises():
    df = pd.read_csv(f"{FIXTURES}/council_bad_alignment.csv")
    with pytest.raises(ValidationError, match="alignment"):
        validate_council_alignment(df)
