# Adding Data

This guide explains how to add each type of data the ingestion pipeline consumes.

---

## Overview

Data flows through two stages:

```
data/raw/          →   uv run scripts/process_all.py   →   data/processed/
(hand-edited CSVs,                                          (clean, validated CSVs
 fetched election                                            ready for the model)
 & financial data)
```

There are four data sources:

| Source | Location | How it's maintained |
|---|---|---|
| Polls | `data/raw/polls/polls.csv` | Hand-edited |
| Council alignment | `data/raw/council_votes/council_alignment.csv` | Hand-edited |
| Election results | `data/raw/elections/` | Fetched via `fetch_elections.py` |
| Campaign finance | `data/raw/financial/` | Fetched via `fetch_financials.py` |

After adding or updating any data, run:

```bash
uv run scripts/process_all.py
```

This validates all inputs and writes clean CSVs to `data/processed/`. It will print a clear error and exit immediately if anything is wrong.

---

## Polls

**File:** `data/raw/polls/polls.csv`

Create the file if it doesn't exist yet. Add one row per published poll.

### Columns

| Column | Required | Format | Example |
|---|---|---|---|
| `poll_id` | yes | `firm-YYYY-MM-DD` | `liaison-2025-11-01` |
| `firm` | yes | string | `Liaison Strategies` |
| `date_conducted` | yes | `YYYY-MM-DD` | `2025-11-01` |
| `date_published` | yes | `YYYY-MM-DD` | `2025-11-03` |
| `sample_size` | no | integer | `800` |
| `methodology` | no | string | `online-panel` |
| `field_tested` | yes | comma-separated candidate keys | `"chow,bradford,matlow"` |
| `chow` | no | decimal (0–1) | `0.37` |
| `bradford` | no | decimal (0–1) | `0.22` |
| `bailao` | no | decimal (0–1) | `0.18` |
| `matlow` | no | decimal (0–1) | `0.15` |
| `furey` | no | decimal (0–1) | `0.08` |
| `undecided` | no | decimal (0–1) | `0.12` |
| `notes` | no | string | `mayoral race only` |

### Validation rules (enforced on processing)

- Vote shares (`chow` + `bradford` + ... + `undecided`) must sum to ≤ 1.0 per row
- `date_conducted` must be ≤ `date_published`
- `sample_size` must be a positive integer if present
- `poll_id` must be unique across all rows

### Example

```csv
poll_id,firm,date_conducted,date_published,sample_size,methodology,field_tested,chow,bradford,bailao,matlow,furey,undecided,notes
liaison-2025-11-01,Liaison Strategies,2025-11-01,2025-11-03,800,online-panel,"chow,bradford,bailao,matlow,furey",0.37,0.22,0.18,0.15,0.08,0.00,
```

### Common mistakes

**Shares that don't sum correctly.** Multiply each percentage by 0.01 — e.g. 37% becomes `0.37`. The pipeline rejects rows where the sum exceeds 1.01.

**Polls that report only a subset of candidates.** Leave the untested candidate columns blank (empty cell, not `0`). Only fill in `field_tested` with the candidates actually tested.

**Duplicate `poll_id`.** If the same firm runs multiple polls, use a suffix: `liaison-2025-11-01`, `liaison-2025-12-01`, etc.

---

## Council Alignment

**File:** `data/raw/council_votes/council_alignment.csv`

Create the file if it doesn't exist. One row per councillor. Scores come from [City Hall Watcher](https://cityhallwatcher.com).

### Columns

| Column | Required | Format | Example |
|---|---|---|---|
| `ward` | yes | integer 1–25 | `5` |
| `councillor_name` | yes | string | `Josh Matlow` |
| `alignment_chow` | yes | decimal (0–1) | `0.72` |
| `alignment_tory` | yes | decimal (0–1) | `0.31` |
| `source_url` | no | URL | `https://cityhallwatcher.com/...` |
| `last_updated` | yes | `YYYY-MM-DD` | `2025-10-01` |

### Validation rules

- `ward` must be an integer in 1–25
- `alignment_chow` and `alignment_tory` must be in [0, 1]
- No duplicate `ward` values

### Example

```csv
ward,councillor_name,alignment_chow,alignment_tory,source_url,last_updated
5,Josh Matlow,0.72,0.31,https://cityhallwatcher.com,2025-10-01
```

---

## Election Results and Campaign Finance

These are fetched programmatically from [Toronto Open Data](https://open.toronto.ca).

```bash
uv run scripts/fetch_elections.py
uv run scripts/fetch_financials.py
```

Each script downloads CSV resources from the Toronto Open Data CKAN API and saves them to `data/raw/elections/` or `data/raw/financial/` with sidecar `.json` metadata files.

> **Note (as of March 2026):** Both packages currently serve ZIP files (containing XLSX), not direct CSV downloads. The scripts will print "No CSV resources found" and exit with an error — this is expected until the city publishes 2026 data as CSVs. See the TODO comments in each script for details.

---

## Adding a New Candidate

If a new candidate enters the race and polls start testing them:

**1. Add them to the name registry (`src/names.py`):**

```python
# New candidate
"jane doe": "doe",
"j. doe": "doe",
"doe": "doe",
```

Add all name variations you expect to appear in poll data as keys, all mapping to the same short lowercase key.

**2. Add a column to `data/raw/polls/polls.csv`:**

Add a column named after the key (e.g. `doe`) and populate it for any polls that tested them.

**3. Run the tests to confirm the registry is consistent:**

```bash
uv run pytest tests/test_names.py -v
```

---

## Processing

Once data is in place, process everything:

```bash
uv run scripts/process_all.py
```

Output files:

| File | Contents |
|---|---|
| `data/processed/polls.csv` | Validated, date-normalised polls |
| `data/processed/polls.meta` | Generation timestamp |
| `data/processed/council_alignment.csv` | Validated council alignment scores |
| `data/processed/council_alignment.meta` | Generation timestamp |

If validation fails, the script prints the specific error (bad rows, bad values) and exits before writing any output.

---

## Running Tests

```bash
uv run pytest -v
```

All 16 tests should pass. Tests cover the name registry, poll validation, council alignment validation, and the processing pipeline.
