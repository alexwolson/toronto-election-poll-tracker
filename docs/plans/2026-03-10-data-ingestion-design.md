# Data Ingestion Design

## Overview

The data ingestion layer fetches, stores, and normalises all inputs consumed by the projection model. It sits between external data sources and the model engine, producing clean, validated CSVs that the model can rely on.

Sources:

- **Toronto Open Data** — historical election results and candidate financial filings, fetched programmatically via the CKAN API
- **Polling data** — published mayoral polls, maintained manually in a hand-edited CSV
- **Council voting scorecard** — Matt Elliott's City Hall Watcher alignment scores, maintained manually in a hand-edited CSV

---

## Directory Layout

```
toronto-election-poll-tracker/
├── data/
│   ├── raw/                        # inputs, either fetched or manually maintained
│   │   ├── elections/              # Toronto Open Data election results CSVs
│   │   ├── financial/              # Toronto Open Data financial filings CSVs
│   │   ├── polls/
│   │   │   ├── polls.csv           # hand-maintained polling data
│   │   │   └── SCHEMA.md           # column definitions and valid ranges
│   │   └── council_votes/
│   │       ├── council_alignment.csv  # hand-maintained City Hall Watcher scores
│   │       └── SCHEMA.md
│   └── processed/                  # cleaned, normalised outputs consumed by the model
│       ├── ward_results.csv
│       ├── candidate_financials.csv
│       ├── polls.csv
│       └── council_alignment.csv
├── scripts/
│   ├── fetch_elections.py          # fetches election results from Toronto Open Data
│   ├── fetch_financials.py         # fetches financial filings from Toronto Open Data
│   └── process_all.py              # validates and normalises all raw inputs
├── tests/
│   ├── fixtures/                   # small CSV fixtures standing in for raw data
│   └── test_processing.py
└── pyproject.toml
```

Raw files are never modified by processing scripts. The `raw/` and `processed/` separation ensures processing can always be re-run against the original source data.

---

## Fetch Scripts

`fetch_elections.py` and `fetch_financials.py` follow the same pattern.

Toronto Open Data uses a CKAN-based API. Each script:

1. Hits the CKAN API to retrieve the resource list for the relevant package
2. Downloads each CSV resource to the appropriate `data/raw/` subdirectory
3. Writes a sidecar `.json` file alongside each CSV recording the source URL and fetch timestamp
4. Validates that the downloaded file has the expected columns before writing; if validation fails, the script exits with a clear error and does not overwrite the previous good copy

Scripts are idempotent — re-running overwrites existing raw files. The sidecar metadata records when each file was last fetched.

Relevant Toronto Open Data packages:

- **Election results**: `toronto-municipal-election-results`
- **Financial filings**: campaign contributions and expenditure packages

Scripts are run manually. No scheduling infrastructure is included.

---

## Manually Maintained Files

### `data/raw/polls/polls.csv`

One row per published poll.

| Column | Type | Description |
|---|---|---|
| `poll_id` | string | Unique identifier, e.g. `liaison-2025-11-01` |
| `firm` | string | Polling firm name |
| `date_conducted` | YYYY-MM-DD | Date range end if a range was reported |
| `date_published` | YYYY-MM-DD | |
| `sample_size` | integer | Blank if not reported |
| `methodology` | string | e.g. `online-panel`, `IVR`, `phone` |
| `field_tested` | string | Comma-separated list of candidates tested |
| `chow`, `bradford`, `bailao`, ... | float | Vote share as decimal (0.37, not 37) |
| `undecided` | float | Share undecided |
| `notes` | string | Anything noteworthy |

Candidate columns are added as new candidates enter polling. Older rows leave new columns blank.

### `data/raw/council_votes/council_alignment.csv`

One row per councillor.

| Column | Type | Description |
|---|---|---|
| `ward` | integer | Ward number (1–25) |
| `councillor_name` | string | Canonical name |
| `alignment_chow` | float | Fraction of votes with Mayor Chow (0–1) |
| `alignment_tory` | float | Fraction of votes with Mayor Tory (0–1) |
| `source_url` | string | City Hall Watcher URL |
| `last_updated` | YYYY-MM-DD | Date scores were last updated |

---

## Processing and Validation (`process_all.py`)

Single entry point that reads all raw inputs, validates, normalises, and writes processed outputs. Fails fast — if any validation step fails, it prints a clear error identifying the file and problem, and exits before writing any output.

### Validation checks

**Election results:** expected columns present; ward numbers in 1–25; vote shares sum to approximately 100% per ward per election; no duplicate (ward, candidate, election) rows.

**Financial filings:** expected columns present; ward numbers valid; monetary values non-negative.

**Polls:** vote shares per row sum to ≤ 1.0 (allowing for undecided); sample size positive if present; `date_conducted` ≤ `date_published`.

**Council alignment:** ward numbers 1–25; alignment scores in [0, 1]; no duplicate ward rows.

### Normalisation

- Consistent column names across all outputs
- Ward numbers as integers
- Dates as ISO strings
- Candidate names resolved through a canonical name registry (a dict in the script), so variations like `"Olivia Chow"` and `"O. Chow"` map to the same key

### Output

Four clean CSVs in `data/processed/`, each with a generation timestamp in a header comment.

---

## Project Setup

**Runtime:** Python via `uv`.

**Dependencies:**

- `requests` — CKAN API calls
- `pandas` — CSV reading, validation, normalisation
- `pydantic` — schema definitions for validation

**Running the scripts:**

```bash
uv run scripts/fetch_elections.py
uv run scripts/fetch_financials.py
uv run scripts/process_all.py
```

**Tests:** `pytest` against small fixture CSVs in `tests/fixtures/`. Tests cover normalisation logic, validation checks, and the processing pipeline end-to-end. No network calls in tests.

**Credentials:** None required. Toronto Open Data API is unauthenticated. No secrets in the repo.

---

## What This Does Not Include

- Scheduling or automation (scripts are run manually)
- A database (flat files only)
- Scraping of City Hall Watcher (council alignment is maintained manually)
- Census or demographic data ingestion (deferred)
