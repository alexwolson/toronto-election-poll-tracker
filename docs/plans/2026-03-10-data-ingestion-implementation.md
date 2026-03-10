# Data Ingestion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the data ingestion layer that fetches, validates, and normalises all inputs consumed by the Toronto 2026 election projection model.

**Architecture:** Raw inputs (fetched from Toronto Open Data via CKAN API, or manually maintained) land in `data/raw/`. A single processing script validates and normalises them into clean CSVs in `data/processed/`. No database, no scheduler — flat files only.

**Tech Stack:** Python (uv), requests, pandas, pydantic, pytest

---

### Task 1: Project setup

**Files:**
- Create: `pyproject.toml`
- Create: `data/raw/elections/.gitkeep`
- Create: `data/raw/financial/.gitkeep`
- Create: `data/raw/polls/SCHEMA.md`
- Create: `data/raw/council_votes/SCHEMA.md`
- Create: `data/processed/.gitkeep`
- Create: `tests/__init__.py`
- Create: `tests/fixtures/.gitkeep`
- Modify: `.gitignore`

**Step 1: Initialise the Python project**

Run in the worktree root (`.worktrees/data-ingestion/`):

```bash
uv init --no-readme
uv add requests pandas pydantic
uv add --dev pytest
```

**Step 2: Verify pyproject.toml was created**

Run: `cat pyproject.toml`
Expected: file exists with `[project]` section and dependencies listed.

**Step 3: Create directory structure**

```bash
mkdir -p data/raw/elections data/raw/financial data/raw/polls data/raw/council_votes data/processed
touch data/raw/elections/.gitkeep data/raw/financial/.gitkeep data/processed/.gitkeep
mkdir -p tests/fixtures
touch tests/__init__.py tests/fixtures/.gitkeep
```

**Step 4: Add `.gitkeep` files and `__pycache__` to .gitignore**

Append to `.gitignore`:

```
__pycache__/
*.pyc
.venv/
```

**Step 5: Write `data/raw/polls/SCHEMA.md`**

```markdown
# polls.csv Schema

One row per published poll.

| Column | Type | Required | Description |
|---|---|---|---|
| `poll_id` | string | yes | Unique identifier, e.g. `liaison-2025-11-01` |
| `firm` | string | yes | Polling firm name |
| `date_conducted` | YYYY-MM-DD | yes | Date range end if a range was reported |
| `date_published` | YYYY-MM-DD | yes | |
| `sample_size` | integer | no | Blank if not reported |
| `methodology` | string | no | e.g. `online-panel`, `IVR`, `phone` |
| `field_tested` | string | yes | Comma-separated list of candidates tested |
| `chow` | float | no | Vote share as decimal (0.37, not 37) |
| `bradford` | float | no | Vote share as decimal |
| `bailao` | float | no | Vote share as decimal |
| `matlow` | float | no | Vote share as decimal |
| `furey` | float | no | Vote share as decimal |
| `undecided` | float | no | Share undecided |
| `notes` | string | no | Anything noteworthy |

## Validation rules
- Vote shares per row (all candidate columns + undecided) must sum to ≤ 1.0
- `date_conducted` must be ≤ `date_published`
- `sample_size` must be a positive integer if present
- `poll_id` must be unique across all rows
```

**Step 6: Write `data/raw/council_votes/SCHEMA.md`**

```markdown
# council_alignment.csv Schema

One row per councillor.

| Column | Type | Required | Description |
|---|---|---|---|
| `ward` | integer | yes | Ward number (1–25) |
| `councillor_name` | string | yes | Canonical name |
| `alignment_chow` | float | yes | Fraction of votes with Mayor Chow (0–1) |
| `alignment_tory` | float | yes | Fraction of votes with Mayor Tory (0–1) |
| `source_url` | string | no | City Hall Watcher URL |
| `last_updated` | YYYY-MM-DD | yes | Date scores were last updated |

## Validation rules
- `ward` must be an integer in 1–25
- `alignment_chow` and `alignment_tory` must be floats in [0, 1]
- No duplicate `ward` values
```

**Step 7: Commit**

```bash
git add .
git commit -m "feat: project setup, directory structure, schema docs"
```

---

### Task 2: Canonical name registry

**Files:**
- Create: `src/__init__.py`
- Create: `src/names.py`
- Create: `tests/test_names.py`

**Step 1: Write the failing test**

Create `tests/test_names.py`:

```python
from src.names import canonical_name, CanonicalNameError


def test_known_names_resolve():
    assert canonical_name("Olivia Chow") == "chow"
    assert canonical_name("O. Chow") == "chow"
    assert canonical_name("Brad Bradford") == "bradford"
    assert canonical_name("Ana Bailao") == "bailao"
    assert canonical_name("Josh Matlow") == "matlow"
    assert canonical_name("Anthony Furey") == "furey"


def test_case_insensitive():
    assert canonical_name("olivia chow") == "chow"
    assert canonical_name("OLIVIA CHOW") == "chow"


def test_unknown_name_raises():
    try:
        canonical_name("Unknown Person")
        assert False, "should have raised"
    except CanonicalNameError:
        pass
```

**Step 2: Run test to verify it fails**

```bash
uv run pytest tests/test_names.py -v
```
Expected: FAIL with `ModuleNotFoundError` or `ImportError`.

**Step 3: Write minimal implementation**

Create `src/__init__.py` (empty).

Create `src/names.py`:

```python
"""Canonical candidate name registry.

All candidate name variations map to a short lowercase key used
consistently across all processed data.
"""

_REGISTRY: dict[str, str] = {
    # Olivia Chow
    "olivia chow": "chow",
    "o. chow": "chow",
    "chow": "chow",
    # Brad Bradford
    "brad bradford": "bradford",
    "bradford": "bradford",
    # Ana Bailao
    "ana bailao": "bailao",
    "ana bailo": "bailao",
    "bailao": "bailao",
    # Josh Matlow
    "josh matlow": "matlow",
    "matlow": "matlow",
    # Anthony Furey
    "anthony furey": "furey",
    "furey": "furey",
    # Marco Mendicino
    "marco mendicino": "mendicino",
    "mendicino": "mendicino",
}

KNOWN_CANDIDATES = sorted(set(_REGISTRY.values()))


class CanonicalNameError(ValueError):
    pass


def canonical_name(name: str) -> str:
    """Return the canonical key for a candidate name.

    Raises CanonicalNameError if the name is not recognised.
    """
    key = name.strip().lower()
    if key not in _REGISTRY:
        raise CanonicalNameError(
            f"Unrecognised candidate name: {name!r}. "
            f"Add it to src/names.py if it is a valid variation."
        )
    return _REGISTRY[key]
```

**Step 4: Run tests to verify they pass**

```bash
uv run pytest tests/test_names.py -v
```
Expected: all 3 tests PASS.

**Step 5: Commit**

```bash
git add src/ tests/test_names.py
git commit -m "feat: canonical candidate name registry"
```

---

### Task 3: Poll validation

**Files:**
- Create: `src/validate.py`
- Create: `tests/fixtures/polls_valid.csv`
- Create: `tests/fixtures/polls_bad_shares.csv`
- Create: `tests/fixtures/polls_bad_dates.csv`
- Create: `tests/test_validate_polls.py`

**Step 1: Write fixture files**

`tests/fixtures/polls_valid.csv`:
```
poll_id,firm,date_conducted,date_published,sample_size,methodology,field_tested,chow,bradford,undecided,notes
liaison-2025-11-01,Liaison Strategies,2025-11-01,2025-11-03,800,online-panel,"chow,bradford",0.45,0.30,0.25,
```

`tests/fixtures/polls_bad_shares.csv` (shares sum to 1.1):
```
poll_id,firm,date_conducted,date_published,sample_size,methodology,field_tested,chow,bradford,undecided,notes
bad-001,Firm,2025-11-01,2025-11-03,800,online-panel,"chow,bradford",0.55,0.35,0.20,
```

`tests/fixtures/polls_bad_dates.csv` (conducted after published):
```
poll_id,firm,date_conducted,date_published,sample_size,methodology,field_tested,chow,bradford,undecided,notes
bad-002,Firm,2025-11-05,2025-11-03,800,online-panel,"chow,bradford",0.45,0.30,0.25,
```

**Step 2: Write the failing test**

Create `tests/test_validate_polls.py`:

```python
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
```

**Step 3: Run test to verify it fails**

```bash
uv run pytest tests/test_validate_polls.py -v
```
Expected: FAIL with `ImportError`.

**Step 4: Write minimal implementation**

Create `src/validate.py`:

```python
"""Validation functions for raw input DataFrames.

Each function raises ValidationError with a descriptive message on failure.
"""

from __future__ import annotations

import pandas as pd

CANDIDATE_COLUMNS = ["chow", "bradford", "bailao", "matlow", "furey", "mendicino"]
SHARE_TOLERANCE = 0.01  # allow up to 1% rounding error


class ValidationError(ValueError):
    pass


def validate_polls(df: pd.DataFrame) -> None:
    """Validate a polls DataFrame against the polls.csv schema."""
    required = ["poll_id", "firm", "date_conducted", "date_published", "field_tested"]
    _check_required_columns(df, required, "polls")

    # Vote shares must sum to <= 1.0 (+ tolerance) per row
    share_cols = [c for c in CANDIDATE_COLUMNS if c in df.columns]
    if "undecided" in df.columns:
        share_cols = share_cols + ["undecided"]

    if share_cols:
        row_sums = df[share_cols].fillna(0).sum(axis=1)
        bad = df[row_sums > 1.0 + SHARE_TOLERANCE]
        if not bad.empty:
            raise ValidationError(
                f"Poll share columns sum to more than 1.0 in rows: "
                f"{bad['poll_id'].tolist()}"
            )

    # date_conducted must be <= date_published
    conducted = pd.to_datetime(df["date_conducted"], errors="coerce")
    published = pd.to_datetime(df["date_published"], errors="coerce")
    bad_dates = df[conducted > published]
    if not bad_dates.empty:
        raise ValidationError(
            f"date_conducted is after date_published in rows: "
            f"{bad_dates['poll_id'].tolist()}"
        )

    # poll_id must be unique
    dupes = df[df["poll_id"].duplicated()]
    if not dupes.empty:
        raise ValidationError(
            f"Duplicate poll_id values: {dupes['poll_id'].tolist()}"
        )

    # sample_size must be positive if present
    if "sample_size" in df.columns:
        bad_n = df[df["sample_size"].notna() & (df["sample_size"] <= 0)]
        if not bad_n.empty:
            raise ValidationError(
                f"sample_size must be positive in rows: {bad_n['poll_id'].tolist()}"
            )


def validate_council_alignment(df: pd.DataFrame) -> None:
    """Validate a council_alignment DataFrame against the council_alignment.csv schema."""
    required = ["ward", "councillor_name", "alignment_chow", "alignment_tory", "last_updated"]
    _check_required_columns(df, required, "council_alignment")

    # ward must be 1–25
    bad_ward = df[~df["ward"].between(1, 25)]
    if not bad_ward.empty:
        raise ValidationError(
            f"ward values outside 1–25: {bad_ward['ward'].tolist()}"
        )

    # alignment scores must be in [0, 1]
    for col in ["alignment_chow", "alignment_tory"]:
        bad = df[~df[col].between(0, 1)]
        if not bad.empty:
            raise ValidationError(
                f"{col} values outside [0, 1] in wards: {bad['ward'].tolist()}"
            )

    # no duplicate wards
    dupes = df[df["ward"].duplicated()]
    if not dupes.empty:
        raise ValidationError(
            f"Duplicate ward values: {dupes['ward'].tolist()}"
        )


def _check_required_columns(df: pd.DataFrame, required: list[str], name: str) -> None:
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValidationError(
            f"{name}: missing required columns: {missing}"
        )
```

**Step 5: Run tests to verify they pass**

```bash
uv run pytest tests/test_validate_polls.py -v
```
Expected: all 3 tests PASS.

**Step 6: Commit**

```bash
git add src/validate.py tests/test_validate_polls.py tests/fixtures/
git commit -m "feat: poll and council alignment validation"
```

---

### Task 4: Council alignment validation

**Files:**
- Create: `tests/fixtures/council_valid.csv`
- Create: `tests/fixtures/council_bad_ward.csv`
- Create: `tests/fixtures/council_bad_alignment.csv`
- Create: `tests/test_validate_council.py`

**Step 1: Write fixture files**

`tests/fixtures/council_valid.csv`:
```
ward,councillor_name,alignment_chow,alignment_tory,source_url,last_updated
1,Councillor A,0.72,0.45,https://cityhallwatcher.com,2025-10-01
2,Councillor B,0.31,0.68,https://cityhallwatcher.com,2025-10-01
```

`tests/fixtures/council_bad_ward.csv`:
```
ward,councillor_name,alignment_chow,alignment_tory,source_url,last_updated
26,Councillor X,0.72,0.45,https://cityhallwatcher.com,2025-10-01
```

`tests/fixtures/council_bad_alignment.csv`:
```
ward,councillor_name,alignment_chow,alignment_tory,source_url,last_updated
1,Councillor A,1.5,0.45,https://cityhallwatcher.com,2025-10-01
```

**Step 2: Write the failing test**

Create `tests/test_validate_council.py`:

```python
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
```

**Step 3: Run test to verify it fails**

```bash
uv run pytest tests/test_validate_council.py -v
```
Expected: FAIL (fixtures don't exist yet and function not imported).

**Step 4: Run tests to verify they pass** (implementation already exists from Task 3)

```bash
uv run pytest tests/test_validate_council.py -v
```
Expected: all 3 tests PASS.

**Step 5: Commit**

```bash
git add tests/test_validate_council.py tests/fixtures/council_*.csv
git commit -m "feat: council alignment validation tests"
```

---

### Task 5: Fetch scripts

**Files:**
- Create: `scripts/__init__.py`
- Create: `scripts/fetch_elections.py`
- Create: `scripts/fetch_financials.py`

No unit tests for fetch scripts (they call the network). Tested by running manually against the real API.

**Step 1: Write `scripts/fetch_elections.py`**

```python
#!/usr/bin/env python3
"""Fetch Toronto municipal election results from Toronto Open Data.

Saves CSVs to data/raw/elections/ with sidecar metadata JSON files.
Run: uv run scripts/fetch_elections.py
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests

CKAN_BASE = "https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action"
PACKAGE_ID = "toronto-municipal-election-results"
OUTPUT_DIR = Path("data/raw/elections")

EXPECTED_COLUMNS = {
    "Ward",
    "Candidate",
    "Votes",
}


def fetch_package_resources(package_id: str) -> list[dict]:
    url = f"{CKAN_BASE}/package_show"
    response = requests.get(url, params={"id": package_id}, timeout=30)
    response.raise_for_status()
    data = response.json()
    if not data["success"]:
        raise RuntimeError(f"CKAN API error: {data.get('error')}")
    return data["result"]["resources"]


def download_resource(resource: dict, output_dir: Path) -> Path:
    name = resource["name"].replace(" ", "_").lower()
    url = resource["url"]
    output_path = output_dir / f"{name}.csv"
    sidecar_path = output_dir / f"{name}.json"

    print(f"  Downloading {name}...")
    response = requests.get(url, timeout=60)
    response.raise_for_status()
    content = response.text

    # Basic column check: look for expected column names in the header line
    first_line = content.split("\n")[0]
    for col in EXPECTED_COLUMNS:
        if col not in first_line:
            raise ValueError(
                f"Expected column '{col}' not found in {name}. "
                f"Header: {first_line[:200]}"
            )

    output_path.write_text(content, encoding="utf-8")

    metadata = {
        "source_url": url,
        "resource_name": resource["name"],
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }
    sidecar_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print(f"  Saved to {output_path}")
    return output_path


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Fetching election results (package: {PACKAGE_ID})...")
    resources = fetch_package_resources(PACKAGE_ID)
    csv_resources = [r for r in resources if r.get("format", "").upper() == "CSV"]
    if not csv_resources:
        print("No CSV resources found.", file=sys.stderr)
        sys.exit(1)
    print(f"Found {len(csv_resources)} CSV resource(s).")
    for resource in csv_resources:
        download_resource(resource, OUTPUT_DIR)
    print("Done.")


if __name__ == "__main__":
    main()
```

**Step 2: Write `scripts/fetch_financials.py`**

```python
#!/usr/bin/env python3
"""Fetch Toronto municipal election financial filings from Toronto Open Data.

Saves CSVs to data/raw/financial/ with sidecar metadata JSON files.
Run: uv run scripts/fetch_financials.py
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests

CKAN_BASE = "https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action"
PACKAGE_IDS = [
    "toronto-municipal-election-campaign-contributions",
]
OUTPUT_DIR = Path("data/raw/financial")

EXPECTED_COLUMNS = {
    "Contributor",
    "Amount",
}


def fetch_package_resources(package_id: str) -> list[dict]:
    url = f"{CKAN_BASE}/package_show"
    response = requests.get(url, params={"id": package_id}, timeout=30)
    response.raise_for_status()
    data = response.json()
    if not data["success"]:
        raise RuntimeError(f"CKAN API error: {data.get('error')}")
    return data["result"]["resources"]


def download_resource(resource: dict, output_dir: Path) -> Path:
    name = resource["name"].replace(" ", "_").lower()
    url = resource["url"]
    output_path = output_dir / f"{name}.csv"
    sidecar_path = output_dir / f"{name}.json"

    print(f"  Downloading {name}...")
    response = requests.get(url, timeout=60)
    response.raise_for_status()
    content = response.text

    first_line = content.split("\n")[0]
    for col in EXPECTED_COLUMNS:
        if col not in first_line:
            raise ValueError(
                f"Expected column '{col}' not found in {name}. "
                f"Header: {first_line[:200]}"
            )

    output_path.write_text(content, encoding="utf-8")

    metadata = {
        "source_url": url,
        "resource_name": resource["name"],
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }
    sidecar_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print(f"  Saved to {output_path}")
    return output_path


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for package_id in PACKAGE_IDS:
        print(f"Fetching financial filings (package: {package_id})...")
        resources = fetch_package_resources(package_id)
        csv_resources = [r for r in resources if r.get("format", "").upper() == "CSV"]
        if not csv_resources:
            print(f"No CSV resources found for {package_id}.", file=sys.stderr)
            continue
        print(f"Found {len(csv_resources)} CSV resource(s).")
        for resource in csv_resources:
            download_resource(resource, OUTPUT_DIR)
    print("Done.")


if __name__ == "__main__":
    main()
```

**Step 3: Create `scripts/__init__.py`** (empty)

**Step 4: Commit**

```bash
git add scripts/
git commit -m "feat: Toronto Open Data fetch scripts for elections and financials"
```

---

### Task 6: process_all.py

**Files:**
- Create: `scripts/process_all.py`
- Create: `tests/fixtures/elections_valid.csv`
- Create: `tests/test_process_all.py`

**Step 1: Write election results fixture**

`tests/fixtures/elections_valid.csv`:
```
Election,Ward,Candidate,Votes,Total Valid Votes
2022 Municipal Election,1,Councillor A,5000,8000
2022 Municipal Election,1,Councillor B,3000,8000
2022 Municipal Election,2,Councillor C,4500,7000
2022 Municipal Election,2,Councillor D,2500,7000
```

**Step 2: Write the failing test**

Create `tests/test_process_all.py`:

```python
from pathlib import Path
import pandas as pd
import pytest
from scripts.process_all import process_polls, process_council_alignment

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
```

**Step 3: Run test to verify it fails**

```bash
uv run pytest tests/test_process_all.py -v
```
Expected: FAIL with `ImportError`.

**Step 4: Write minimal implementation**

Create `scripts/process_all.py`:

```python
#!/usr/bin/env python3
"""Process all raw inputs into clean, validated CSVs for the model.

Reads from data/raw/, validates, normalises, writes to data/processed/.
Fails fast: exits with a clear error if any validation step fails.

Run: uv run scripts/process_all.py
"""

from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from src.validate import ValidationError, validate_council_alignment, validate_polls

RAW = Path("data/raw")
PROCESSED = Path("data/processed")
TIMESTAMP = datetime.now(timezone.utc).isoformat()


def process_polls(input_path: Path) -> pd.DataFrame:
    """Load, validate, and normalise polls CSV."""
    if not input_path.exists():
        print(f"ERROR: polls file not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    df = pd.read_csv(input_path)

    try:
        validate_polls(df)
    except ValidationError as e:
        print(f"ERROR in {input_path}: {e}", file=sys.stderr)
        sys.exit(1)

    # Normalise dates to ISO strings
    df["date_conducted"] = pd.to_datetime(df["date_conducted"]).dt.strftime("%Y-%m-%d")
    df["date_published"] = pd.to_datetime(df["date_published"]).dt.strftime("%Y-%m-%d")

    return df


def process_council_alignment(input_path: Path) -> pd.DataFrame:
    """Load, validate, and normalise council alignment CSV."""
    if not input_path.exists():
        print(f"ERROR: council alignment file not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    df = pd.read_csv(input_path)
    df["ward"] = df["ward"].astype(int)

    try:
        validate_council_alignment(df)
    except ValidationError as e:
        print(f"ERROR in {input_path}: {e}", file=sys.stderr)
        sys.exit(1)

    return df


def write_processed(df: pd.DataFrame, output_path: Path) -> None:
    """Write a processed DataFrame to CSV with a generation timestamp comment."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as f:
        f.write(f"# Generated at {TIMESTAMP}\n")
        df.to_csv(f, index=False)
    print(f"  Written: {output_path}")


def main() -> None:
    print("Processing polls...")
    polls = process_polls(RAW / "polls" / "polls.csv")
    write_processed(polls, PROCESSED / "polls.csv")

    print("Processing council alignment...")
    council = process_council_alignment(RAW / "council_votes" / "council_alignment.csv")
    write_processed(council, PROCESSED / "council_alignment.csv")

    print("Done. All outputs written to data/processed/.")


if __name__ == "__main__":
    main()
```

**Step 5: Run tests to verify they pass**

```bash
uv run pytest tests/test_process_all.py -v
```
Expected: all 3 tests PASS.

**Step 6: Run the full test suite**

```bash
uv run pytest -v
```
Expected: all tests PASS.

**Step 7: Commit**

```bash
git add scripts/process_all.py tests/test_process_all.py tests/fixtures/elections_valid.csv
git commit -m "feat: process_all.py with poll and council alignment processing"
```

---

### Task 7: Smoke test the fetch scripts against the real API

This task is manual — it requires network access and verifies the fetch scripts work against the live Toronto Open Data API.

**Step 1: Run the elections fetch script**

```bash
uv run scripts/fetch_elections.py
```

Expected: CSV files appear in `data/raw/elections/` alongside sidecar `.json` files. No errors.

**Step 2: Inspect the output**

Check that the downloaded CSVs have sensible content:
```bash
head -3 data/raw/elections/*.csv
```

**Step 3: Note any column name mismatches**

If the `EXPECTED_COLUMNS` check in the fetch script raises a `ValueError`, update the `EXPECTED_COLUMNS` set in `scripts/fetch_elections.py` to match the actual column names in the downloaded files. Commit the fix.

**Step 4: Run the financials fetch script**

```bash
uv run scripts/fetch_financials.py
```

Note: if the 2026 financial filings package doesn't exist yet, the script will report "No CSV resources found" — that's expected. The package ID may need updating once the city opens 2026 filings. Document any package ID issues in a `# TODO` comment in the script.

**Step 5: Commit any fixes**

```bash
git add scripts/
git commit -m "fix: update expected column names from live API inspection"
```

---

## Running all tests

```bash
uv run pytest -v
```

All tasks above should pass. Fetch scripts are excluded from automated tests (network dependency).
