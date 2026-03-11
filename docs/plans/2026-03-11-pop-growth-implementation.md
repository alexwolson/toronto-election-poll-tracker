# Pop Growth Census Fetch Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Automatically compute `pop_growth_pct` per ward from 2016→2021 Statistics Canada census data, replacing the manually-entered (all-zero) column in `ward_defeatability.csv`.

**Architecture:** New `scripts/fetch_ward_profiles.py` downloads the Ward Profiles XLSX from Toronto Open Data and writes `data/raw/census/ward_population.csv`. `process_all.py` reads that file, computes growth, and merges it into the defeatability DataFrame before writing to `data/processed/`. The `pop_growth_pct` column is removed from `ward_defeatability.csv` entirely.

**Tech Stack:** Python 3.12+, uv, pandas, openpyxl, requests. Tests use pytest with CSV fixtures in `tests/fixtures/`.

---

### Task 1: Inspect the Ward Profiles workbook structure

This is a research task — no code yet. The parser in Task 3 depends on knowing the exact layout.

**Step 1: Download and inspect the workbook**

Run this one-off Python snippet (do NOT commit it):

```python
import io, requests, openpyxl

CKAN_BASE = "https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action"
r = requests.get(f"{CKAN_BASE}/package_show", params={"id": "6678e1a6-d25f-4dff-b2b7-aa8f042bc2eb"}, timeout=30)
resources = r.json()["result"]["resources"]
for res in resources:
    print(res["name"], res["format"], res.get("url", "")[:80])
```

Identify the primary XLSX resource (likely named something like "ward-profiles-2021" or similar). Then:

```python
xlsx_url = "<url from above>"
data = requests.get(xlsx_url, timeout=120).content
wb = openpyxl.load_workbook(io.BytesIO(data), read_only=True, data_only=True)
print(wb.sheetnames)
ws = wb[wb.sheetnames[0]]
rows = list(ws.iter_rows(max_row=10, values_only=True))
for r in rows:
    print(r[:5])  # first 5 cells of each row
```

**Step 2: Document what you find**

Answer these questions before proceeding:
- Are wards in rows or columns?
- What is the row/column label for total population?
- Are 2016 and 2021 figures in the same sheet, or separate sheets/files?
- Are there multiple resources (one per census year, or one combined)?

Record the answers as comments at the top of `scripts/fetch_ward_profiles.py` when you write it.

---

### Task 2: Write the ward population fetch script

**Files:**
- Create: `scripts/fetch_ward_profiles.py`
- Create: `data/raw/census/` (directory, via mkdir)

**Step 1: Write the fetch script**

Use `fetch_elections.py` as the structural template. Adapt the parser based on your findings from Task 1. The script must:
- Accept the Ward Profiles XLSX structure (whatever it turns out to be)
- Extract total population per ward for 2016 and 2021 (all 25 wards)
- Write `data/raw/census/ward_population.csv` with columns: `ward` (int 1–25), `pop_2016` (int), `pop_2021` (int)
- Write `data/raw/census/ward_population.meta` JSON sidecar with `fetched_at` timestamp

Skeleton (fill in `_parse_ward_population` based on actual workbook structure):

```python
#!/usr/bin/env python3
"""Fetch Toronto ward population data from the Ward Profiles (25-Ward Model) dataset.

Downloads the Ward Profiles XLSX from Toronto Open Data and extracts total
population per ward for 2016 and 2021 census years.

Output:
  data/raw/census/ward_population.csv -- ward x pop_2016 x pop_2021

Run: uv run scripts/fetch_ward_profiles.py
"""

from __future__ import annotations

import io
import json
from datetime import datetime, timezone
from pathlib import Path

import openpyxl
import pandas as pd
import requests

CKAN_BASE = "https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action"
WARD_PROFILES_PACKAGE = "6678e1a6-d25f-4dff-b2b7-aa8f042bc2eb"
OUTPUT_DIR = Path("data/raw/census")


def fetch_resources(package_id: str) -> list[dict]:
    url = f"{CKAN_BASE}/package_show"
    r = requests.get(url, params={"id": package_id}, timeout=30)
    r.raise_for_status()
    data = r.json()
    if not data["success"]:
        raise RuntimeError(f"CKAN API error for {package_id}: {data.get('error')}")
    return data["result"]["resources"]


def download_bytes(url: str, timeout: int = 120) -> bytes:
    r = requests.get(url, timeout=timeout)
    r.raise_for_status()
    return r.content


def _parse_ward_population(wb: openpyxl.Workbook) -> list[dict]:
    """Extract total population per ward for 2016 and 2021.

    # FILL IN based on actual workbook structure found in Task 1.
    # Document the structure here as comments before implementing.
    """
    raise NotImplementedError("Implement after inspecting workbook in Task 1")


def write_with_sidecar(df: pd.DataFrame, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False)
    sidecar = path.with_suffix(".json")
    sidecar.write_text(
        json.dumps({"fetched_at": datetime.now(timezone.utc).isoformat()}, indent=2),
        encoding="utf-8",
    )
    print(f"  Written: {path} ({len(df)} rows)")


def main() -> None:
    print("Fetching Ward Profiles...")
    resources = fetch_resources(WARD_PROFILES_PACKAGE)

    # Identify the right resource (adapt name/format filter after Task 1)
    xlsx_resource = next(
        (r for r in resources if r.get("format", "").upper() == "XLSX"),
        None,
    )
    if xlsx_resource is None:
        raise RuntimeError("No XLSX resource found in Ward Profiles package")

    print(f"  Downloading {xlsx_resource['name']}...")
    xlsx_bytes = download_bytes(xlsx_resource["url"])
    wb = openpyxl.load_workbook(io.BytesIO(xlsx_bytes), read_only=True, data_only=True)

    records = _parse_ward_population(wb)
    if len(records) != 25:
        raise RuntimeError(f"Expected 25 ward rows, got {len(records)}")

    df = pd.DataFrame(records)
    write_with_sidecar(df, OUTPUT_DIR / "ward_population.csv")
    print("Done.")


if __name__ == "__main__":
    main()
```

**Step 2: Run it manually to verify output**

```bash
uv run scripts/fetch_ward_profiles.py
```

Expected: `data/raw/census/ward_population.csv` with 25 rows, columns `ward`, `pop_2016`, `pop_2021`. Spot-check a few wards against the Toronto Open Data website.

**Step 3: Commit**

```bash
git add scripts/fetch_ward_profiles.py data/raw/census/
git commit -m "feat: fetch ward population from Ward Profiles census data"
```

---

### Task 3: Add `validate_ward_population` to `validate.py`

**Files:**
- Modify: `src/validate.py`
- Modify: `tests/test_validate_polls.py` — actually create `tests/test_validate_ward_population.py`

**Step 1: Write the failing tests**

Create `tests/test_validate_ward_population.py`:

```python
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
```

**Step 2: Run tests to confirm they fail**

```bash
uv run pytest tests/test_validate_ward_population.py -v
```

Expected: all fail with `ImportError: cannot import name 'validate_ward_population'`

**Step 3: Implement `validate_ward_population` in `src/validate.py`**

Add after the existing `validate_registered_electors` function:

```python
def validate_ward_population(df: pd.DataFrame) -> None:
    """Validate a ward_population DataFrame from fetch_ward_profiles.py."""
    required = ["ward", "pop_2016", "pop_2021"]
    _check_required_columns(df, required, "ward_population")

    if len(df) != 25:
        raise ValidationError(f"Expected 25 wards, got {len(df)}")

    bad_ward = df[~df["ward"].between(1, 25)]
    if not bad_ward.empty:
        raise ValidationError(f"ward values outside 1–25: {bad_ward['ward'].tolist()}")

    dupes = df[df["ward"].duplicated()]
    if not dupes.empty:
        raise ValidationError(f"Duplicate ward values: {dupes['ward'].tolist()}")

    for col in ("pop_2016", "pop_2021"):
        bad = df[df[col] <= 0]
        if not bad.empty:
            raise ValidationError(
                f"{col} must be positive in wards: {bad['ward'].tolist()}"
            )
```

**Step 4: Run tests to confirm they pass**

```bash
uv run pytest tests/test_validate_ward_population.py -v
```

Expected: all 6 tests pass.

**Step 5: Commit**

```bash
git add src/validate.py tests/test_validate_ward_population.py
git commit -m "feat: add validate_ward_population"
```

---

### Task 4: Add `process_ward_population` to `process_all.py`

**Files:**
- Modify: `scripts/process_all.py`
- Modify: `tests/test_process_all.py`

**Step 1: Write the failing test**

Add to `tests/test_process_all.py`:

```python
from scripts.process_all import process_ward_population

def test_process_ward_population_computes_growth(tmp_path):
    csv = tmp_path / "ward_population.csv"
    csv.write_text(
        "ward,pop_2016,pop_2021\n"
        "1,50000,55000\n"
        "2,80000,76000\n"
    )
    result = process_ward_population(csv)
    assert isinstance(result, pd.Series)
    assert result[1] == pytest.approx(0.10, rel=1e-3)   # +10%
    assert result[2] == pytest.approx(-0.05, rel=1e-3)  # -5%
```

**Step 2: Run test to confirm it fails**

```bash
uv run pytest tests/test_process_all.py::test_process_ward_population_computes_growth -v
```

Expected: FAIL with `ImportError`

**Step 3: Add `process_ward_population` to `scripts/process_all.py`**

Add the import at the top of the file:

```python
from src.validate import (
    ...
    validate_ward_population,
)
```

Add the function after `process_registered_electors`:

```python
def process_ward_population(input_path: Path) -> pd.Series:
    """Load ward population CSV and return pop_growth_pct per ward as a Series.

    Returns a Series indexed by ward number (1–25).
    Growth = (pop_2021 - pop_2016) / pop_2016
    """
    if not input_path.exists():
        print(f"ERROR: ward population file not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    df = pd.read_csv(input_path)

    try:
        df["ward"] = df["ward"].astype(int)
        df["pop_2016"] = df["pop_2016"].astype(int)
        df["pop_2021"] = df["pop_2021"].astype(int)
        validate_ward_population(df)
    except (ValidationError, ValueError) as e:
        print(f"ERROR in {input_path}: {e}", file=sys.stderr)
        sys.exit(1)

    growth = (df["pop_2021"] - df["pop_2016"]) / df["pop_2016"]
    return growth.set_axis(df["ward"])
```

**Step 4: Run test to confirm it passes**

```bash
uv run pytest tests/test_process_all.py::test_process_ward_population_computes_growth -v
```

Expected: PASS

**Step 5: Commit**

```bash
git add scripts/process_all.py tests/test_process_all.py src/validate.py
git commit -m "feat: add process_ward_population computing 2016-2021 census growth"
```

---

### Task 5: Merge `pop_growth_pct` into `process_defeatability`

**Files:**
- Modify: `scripts/process_all.py`
- Modify: `tests/test_process_all.py`

**Step 1: Write the failing test**

Add to `tests/test_process_all.py`:

```python
def test_process_defeatability_merges_pop_growth(tmp_path):
    defeatability_csv = tmp_path / "defeatability.csv"
    defeatability_csv.write_text(
        "ward,councillor_name,election_year,is_byelection_incumbent,is_running,"
        "vote_share,electorate_share,defeatability_score,last_updated\n"
        "1,Alice,2022,false,true,0.55,0.15,40,2026-01-01\n"
        "2,Bob,2022,false,true,0.60,0.18,30,2026-01-01\n"
    )
    pop_growth = pd.Series({1: 0.08, 2: -0.03})

    result = process_defeatability(defeatability_csv, pop_growth=pop_growth)
    assert "pop_growth_pct" in result.columns
    assert result.loc[result["ward"] == 1, "pop_growth_pct"].iloc[0] == pytest.approx(0.08)
    assert result.loc[result["ward"] == 2, "pop_growth_pct"].iloc[0] == pytest.approx(-0.03)
```

Note: this test uses a defeatability CSV **without** `pop_growth_pct` — that column is gone from the raw file.

**Step 2: Run test to confirm it fails**

```bash
uv run pytest tests/test_process_all.py::test_process_defeatability_merges_pop_growth -v
```

Expected: FAIL (wrong signature or missing column)

**Step 3: Update `process_defeatability` signature and body**

Modify `process_defeatability` in `scripts/process_all.py` to accept and merge `pop_growth`:

```python
def process_defeatability(
    input_path: Path,
    pop_growth: pd.Series | None = None,
) -> pd.DataFrame:
    """Load, validate, and normalise ward defeatability CSV.

    pop_growth: optional Series indexed by ward, values are growth fractions.
    If provided, merged in as pop_growth_pct column.
    """
    if not input_path.exists():
        print(f"ERROR: defeatability file not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    df = pd.read_csv(input_path)

    try:
        df["ward"] = df["ward"].astype(int)
        df["election_year"] = df["election_year"].astype(int)
        validate_defeatability(df)
    except (ValidationError, ValueError) as e:
        print(f"ERROR in {input_path}: {e}", file=sys.stderr)
        sys.exit(1)

    if pop_growth is not None:
        df["pop_growth_pct"] = df["ward"].map(pop_growth)
    else:
        df["pop_growth_pct"] = 0.0

    df["last_updated"] = pd.to_datetime(df["last_updated"]).dt.strftime("%Y-%m-%d")

    return df
```

**Step 4: Update `main()` in `process_all.py` to pass pop_growth through**

Find the defeatability block in `main()` and update it:

```python
    print("Processing ward population growth...")
    population_path = RAW / "census" / "ward_population.csv"
    pop_growth = None
    if population_path.exists():
        pop_growth = process_ward_population(population_path)
        write_processed(
            pop_growth.reset_index().rename(columns={0: "pop_growth_pct"}),
            PROCESSED / "ward_population_growth.csv",
        )
    else:
        print(f"  Skipping: {population_path} (not found, growth will be 0.0)")

    print("Processing ward defeatability...")
    defeatability_path = RAW / "defeatability" / "ward_defeatability.csv"
    if defeatability_path.exists():
        defeatability = process_defeatability(defeatability_path, pop_growth=pop_growth)
        write_processed(defeatability, PROCESSED / "ward_defeatability.csv")
    else:
        print(f"  Skipping: {defeatability_path} (not found)")
```

**Step 5: Run all process_all tests**

```bash
uv run pytest tests/test_process_all.py -v
```

Expected: all pass.

**Step 6: Commit**

```bash
git add scripts/process_all.py tests/test_process_all.py
git commit -m "feat: merge census pop_growth_pct into defeatability in process_all"
```

---

### Task 6: Remove `pop_growth_pct` from `validate_defeatability` and fixtures

`pop_growth_pct` is no longer in the raw CSV, so it must be removed from validation and fixtures.

**Files:**
- Modify: `src/validate.py`
- Modify: `tests/fixtures/defeatability_valid.csv`
- Modify: `tests/fixtures/defeatability_bad_ward.csv`
- Modify: `tests/fixtures/defeatability_bad_vote_share.csv`
- Modify: `tests/fixtures/defeatability_duplicate_ward.csv`
- Modify: `tests/test_validate_defeatability.py`
- Modify: `tests/test_process_all.py`

**Step 1: Run existing tests to establish baseline**

```bash
uv run pytest tests/test_validate_defeatability.py tests/test_process_all.py -v
```

Note which tests currently pass.

**Step 2: Remove `pop_growth_pct` from `validate_defeatability` required columns**

In `src/validate.py`, find `validate_defeatability` and remove `"pop_growth_pct"` from the `required` list. Also remove the validation block for it if one exists separately (currently it's only in the required columns check).

**Step 3: Remove `pop_growth_pct` from all defeatability fixture CSVs**

Each fixture file has a `pop_growth_pct` column — remove it from all four. For example, `defeatability_valid.csv` currently has:

```
ward,councillor_name,election_year,is_byelection_incumbent,is_running,vote_share,electorate_share,pop_growth_pct,defeatability_score,...
```

Change to:

```
ward,councillor_name,election_year,is_byelection_incumbent,is_running,vote_share,electorate_share,defeatability_score,...
```

**Step 4: Update `test_process_defeatability_produces_clean_output`**

In `tests/test_process_all.py`, the existing test asserts `pop_growth_pct` is a column:

```python
# OLD — remove this assertion:
assert "pop_growth_pct" in result.columns
```

The column is now added by `process_defeatability` from the `pop_growth` argument. Since no `pop_growth` is passed in the existing test, it defaults to `0.0`. Update the test:

```python
def test_process_defeatability_produces_clean_output():
    result = process_defeatability(FIXTURES / "defeatability_valid.csv")
    assert isinstance(result, pd.DataFrame)
    assert "ward" in result.columns
    assert "vote_share" in result.columns
    assert "electorate_share" in result.columns
    assert "pop_growth_pct" in result.columns          # still present, defaulted to 0.0
    assert "is_byelection_incumbent" in result.columns
    assert result["ward"].dtype == int
    assert result["pop_growth_pct"].iloc[0] == 0.0     # default when no census data
    assert len(result) == 2
```

**Step 5: Run all tests**

```bash
uv run pytest tests/ -v
```

Expected: all pass.

**Step 6: Commit**

```bash
git add src/validate.py tests/fixtures/ tests/test_validate_defeatability.py tests/test_process_all.py
git commit -m "refactor: remove pop_growth_pct from defeatability CSV; now computed from census"
```

---

### Task 7: Remove `pop_growth_pct` from `ward_defeatability.csv` and update schemas

**Files:**
- Modify: `data/raw/defeatability/ward_defeatability.csv`
- Modify: `data/raw/defeatability/SCHEMA.md`
- Create: `data/raw/census/SCHEMA.md`

**Step 1: Remove `pop_growth_pct` from `data/raw/defeatability/ward_defeatability.csv`**

Delete the `pop_growth_pct` column. The file currently has it as a column of all zeros.

**Step 2: Run `process_all.py` end-to-end to verify**

```bash
uv run scripts/fetch_ward_profiles.py
uv run scripts/process_all.py
```

Check that `data/processed/ward_defeatability.csv` contains `pop_growth_pct` with the computed values (non-zero now), and `data/processed/ward_population_growth.csv` exists.

**Step 3: Update `data/raw/defeatability/SCHEMA.md`**

Remove the `pop_growth_pct` row from the columns table. Add a note:

> `pop_growth_pct` is not stored in this file. It is computed automatically in `process_all.py` from `data/raw/census/ward_population.csv` (2016→2021 Statistics Canada census data) and merged into the processed output.

**Step 4: Create `data/raw/census/SCHEMA.md`**

```markdown
# ward_population.csv Schema

Ward-level total population from the Statistics Canada Census of Population,
extracted from Toronto Open Data's Ward Profiles (25-Ward Model) dataset.

Fetched by: `scripts/fetch_ward_profiles.py`
Source: https://open.toronto.ca/dataset/ward-profiles-25-ward-model/

## Columns

| Column | Type | Description |
|---|---|---|
| `ward` | integer | Ward number (1–25) |
| `pop_2016` | integer | Total population, 2016 census |
| `pop_2021` | integer | Total population, 2021 census |

## Derived value

`pop_growth_pct` is computed in `process_all.py` as:

    (pop_2021 - pop_2016) / pop_2016

This is used as the ward growth input to the defeatability score. It captures
the 2016→2021 growth trend as a proxy for post-2022 electorate change. A
more precise figure will be possible after the 2026 census or when the 2026
municipal voters list is published.
```

**Step 5: Run the full test suite**

```bash
uv run pytest tests/ -v
```

Expected: all pass.

**Step 6: Commit**

```bash
git add data/raw/defeatability/ data/raw/census/ data/processed/
git commit -m "docs: update defeatability schema; add census schema; remove pop_growth_pct from raw CSV"
```
