from pathlib import Path
import pandas as pd
import pytest
from scripts.process_all import (
    process_polls,
    process_council_alignment,
    write_processed,
)

FIXTURES = Path("tests/fixtures")


def test_process_polls_produces_clean_output():
    result = process_polls(FIXTURES / "polls_valid.csv")
    assert isinstance(result, pd.DataFrame)
    assert "poll_id" in result.columns
    assert "date_conducted" in result.columns
    assert len(result) == 1


def test_process_council_produces_clean_output():
    result = process_council_alignment(FIXTURES / "council_valid.csv")
    assert isinstance(result, pd.DataFrame)
    assert "ward" in result.columns
    assert result["ward"].dtype == int
    assert len(result) == 2


def test_process_polls_rejects_bad_input():
    with pytest.raises(SystemExit):
        process_polls(FIXTURES / "polls_bad_shares.csv")


def test_write_processed_creates_readable_file(tmp_path):
    df = pd.DataFrame({"a": [1], "b": [2]})
    out = tmp_path / "out.csv"
    write_processed(df, out)
    assert out.exists()
    meta = out.with_suffix(".meta")
    assert meta.exists()
    assert "generated_at=" in meta.read_text()
    result = pd.read_csv(out)
    assert list(result.columns) == ["a", "b"]
    assert len(result) == 1
