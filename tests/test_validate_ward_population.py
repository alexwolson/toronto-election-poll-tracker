import pandas as pd
import pytest
from src.validate import validate_ward_population, ValidationError


def _valid_df():
    return pd.DataFrame({
        "ward": list(range(1, 26)),
        "pop_2016": [50000] * 25,
        "pop_2021": [52000] * 25,
    })


def test_valid_passes():
    validate_ward_population(_valid_df())  # should not raise


def test_missing_column_raises():
    df = _valid_df().drop(columns=["pop_2016"])
    with pytest.raises(ValidationError, match="missing required columns"):
        validate_ward_population(df)


def test_wrong_ward_count_raises():
    df = _valid_df().iloc[:24]  # only 24 wards
    with pytest.raises(ValidationError, match="25 wards"):
        validate_ward_population(df)


def test_ward_out_of_range_raises():
    df = _valid_df()
    df.loc[0, "ward"] = 99
    with pytest.raises(ValidationError, match="ward"):
        validate_ward_population(df)


def test_duplicate_ward_raises():
    df = _valid_df()
    df.loc[1, "ward"] = 1  # duplicate ward 1
    with pytest.raises(ValidationError, match="Duplicate"):
        validate_ward_population(df)


def test_zero_population_raises():
    df = _valid_df()
    df.loc[0, "pop_2016"] = 0
    with pytest.raises(ValidationError, match="pop_2016"):
        validate_ward_population(df)


def test_negative_population_pop_2021_raises():
    df = _valid_df()
    df.loc[0, "pop_2021"] = -1
    with pytest.raises(ValidationError, match="pop_2021"):
        validate_ward_population(df)
