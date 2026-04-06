from pathlib import Path
import pandas as pd
import pytest
from scripts.process_all import (
    process_polls,
    process_council_alignment,
    process_defeatability,
    process_defeatability_full,
    write_processed,
    process_ward_population,
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


def test_process_defeatability_produces_clean_output():
    result = process_defeatability(FIXTURES / "defeatability_valid.csv")
    assert isinstance(result, pd.DataFrame)
    assert "ward" in result.columns
    assert "vote_share" in result.columns
    assert "electorate_share" in result.columns
    assert "is_byelection_incumbent" in result.columns
    assert result["ward"].dtype == int
    assert len(result) == 2
    assert result["pop_growth_pct"].iloc[0] == 0.0


def test_process_defeatability_rejects_bad_ward():
    with pytest.raises(SystemExit):
        process_defeatability(FIXTURES / "defeatability_bad_ward.csv")


def test_process_defeatability_full_produces_clean_output():
    result = process_defeatability_full(FIXTURES / "defeatability_full_valid.csv")
    assert isinstance(result, pd.DataFrame)
    assert "Ward" in result.columns
    assert "Defeatability Score" in result.columns
    mayor_row = result[result["Ward"].astype(str).str.lower() == "mayor"]
    assert not mayor_row.empty
    assert int(mayor_row.iloc[0]["Defeatability Score"]) == 60


def test_process_ward_population_computes_growth(tmp_path):
    csv = tmp_path / "ward_population.csv"
    # validate_ward_population requires exactly 25 wards (1–25)
    rows = ["ward,pop_2016,pop_2021", "1,50000,55000", "2,80000,76000"]
    rows += [f"{w},60000,60000" for w in range(3, 26)]
    csv.write_text("\n".join(rows) + "\n")
    result = process_ward_population(csv)
    assert isinstance(result, pd.Series)
    assert result[1] == pytest.approx(0.10, rel=1e-3)  # +10%
    assert result[2] == pytest.approx(-0.05, rel=1e-3)  # -5%


def test_process_ward_population_exits_on_missing_file():
    with pytest.raises(SystemExit):
        process_ward_population(Path("nonexistent_file.csv"))


def test_process_defeatability_merges_pop_growth(tmp_path):
    defeatability_csv = tmp_path / "defeatability.csv"
    defeatability_csv.write_text(
        "ward,councillor_name,election_year,is_byelection_incumbent,is_running,"
        "vote_share,electorate_share,pop_growth_pct,defeatability_score,last_updated\n"
        "1,Alice,2022,false,true,0.55,0.15,0.0,40,2026-01-01\n"
        "2,Bob,2022,false,true,0.60,0.18,0.0,30,2026-01-01\n"
    )
    pop_growth = pd.Series({1: 0.08, 2: -0.03}, name="ward")
    pop_growth.index.name = "ward"

    result = process_defeatability(defeatability_csv, pop_growth=pop_growth)
    assert "pop_growth_pct" in result.columns
    assert result.loc[result["ward"] == 1, "pop_growth_pct"].iloc[0] == pytest.approx(
        0.08
    )
    assert result.loc[result["ward"] == 2, "pop_growth_pct"].iloc[0] == pytest.approx(
        -0.03
    )


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
