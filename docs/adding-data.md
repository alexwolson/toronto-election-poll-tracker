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

There are five data sources:

| Source | Location | How it's maintained |
|---|---|---|
| Polls | `data/raw/polls/polls.csv` | Hand-edited |
| Council alignment | `data/raw/council_votes/council_alignment.csv` | Hand-edited |
| Ward defeatability | `data/raw/defeatability/ward_defeatability.csv` | Hand-edited |
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

### Fixed metadata columns

| Column | Required | Format | Example |
|---|---|---|---|
| `poll_id` | yes | `firm-YYYY-MM-DD` | `liaison-2025-11-01` |
| `firm` | yes | string | `Liaison Strategies` |
| `date_conducted` | yes | `YYYY-MM-DD` | `2025-11-01` |
| `date_published` | yes | `YYYY-MM-DD` | `2025-11-03` |
| `sample_size` | no | integer | `800` |
| `methodology` | no | string | `online-panel` |
| `field_tested` | yes | comma-separated candidate keys | `"chow,bradford,undecided"` |
| `notes` | no | string | `mayoral race only` |

### Candidate share columns

Any numeric column not in the metadata set above is treated as a candidate share column. There is no fixed list — columns are added as candidates enter polling.

Use the candidate's short lowercase key as the column name. For example: `chow`, `bradford`, `bailao`, `tory`. Add `undecided` for the undecided share — it is treated the same as any candidate share column.

The `field_tested` column is the authoritative record of which candidates a given poll tested. It must match the columns exactly:
- Every key in `field_tested` must have a corresponding column in the CSV
- Every share column with a value in a given row must be listed in `field_tested` for that row

Older rows leave columns for candidates who weren't yet tested blank (empty cell, not `0`).

### Validation rules

- All share columns per row must sum to ≤ 1.0
- `field_tested` must be consistent with the share columns (see above)
- `date_conducted` must be ≤ `date_published`
- `sample_size` must be a positive integer if present
- `poll_id` must be unique across all rows

### Example

A poll in late 2025 testing only Chow and Bradford, then a later poll adding Bailao as a new entrant:

```csv
poll_id,firm,date_conducted,date_published,sample_size,methodology,field_tested,chow,bradford,bailao,undecided,notes
liaison-2025-11-01,Liaison Strategies,2025-11-01,2025-11-03,800,online-panel,"chow,bradford,undecided",0.45,0.30,,0.25,
mainstreet-2026-01-15,Mainstreet Research,2026-01-15,2026-01-17,1200,IVR,"chow,bradford,bailao,undecided",0.38,0.25,0.17,0.20,
```

Note the first row leaves `bailao` blank — that candidate wasn't tested in that poll.

### Common mistakes

**`field_tested` doesn't match columns.** If you add a value to a share column, you must also list that candidate in `field_tested` for that row. The pipeline enforces this in both directions.

**Shares that don't sum correctly.** Multiply each percentage by 0.01 — e.g. 37% becomes `0.37`. The pipeline rejects rows where the sum exceeds 1.01.

**Using `0` instead of a blank for untested candidates.** Leave blank. A `0` is a tested result of zero; a blank means the candidate wasn't tested in that poll.

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

## Ward Defeatability

**File:** `data/raw/defeatability/ward_defeatability.csv`

Create the file if it doesn't exist. One row per ward where an incumbent is seeking re-election. Wards with no incumbent (open seats) are excluded. Data comes from Toronto Open Data election results and city ward population estimates.

### Columns

| Column | Required | Format | Example |
|---|---|---|---|
| `ward` | yes | integer 1–25 | `5` |
| `councillor_name` | yes | string | `Josh Matlow` |
| `election_year` | yes | integer | `2022` |
| `is_byelection_incumbent` | yes | `true` or `false` | `false` |
| `vote_share` | yes | decimal (0–1] | `0.61` |
| `electorate_share` | yes | decimal (0–1] | `0.19` |
| `pop_growth_pct` | yes | decimal (can be negative) | `0.03` |
| `source_url` | no | URL | `https://open.toronto.ca/...` |
| `notes` | no | string | `by-election turnout was low` |
| `last_updated` | yes | `YYYY-MM-DD` | `2025-11-01` |

**`vote_share`** is the incumbent's share of votes cast in their ward in the reference election (2022 general election, or the by-election year for mid-term incumbents).

**`electorate_share`** is the incumbent's votes divided by total *registered electors* in the ward — not just those who turned out. This is the key defeatability input: it measures how thin the incumbent's actual support base is across the whole ward. For example, a councillor who won 60% of a 30%-turnout election has a vote share of 0.60 but an electorate share of roughly 0.18.

**`pop_growth_pct`** is ward population growth since the reference election. Positive means the ward has grown; negative means it has shrunk. Use 0.05 for 5% growth.

### Validation rules

- `ward` must be an integer in 1–25
- No duplicate `ward` values
- `vote_share` must be in (0, 1] — strictly positive
- `electorate_share` must be in (0, 1] — strictly positive
- `pop_growth_pct` has no range restriction

### By-election incumbents

Several current councillors were elected in mid-term by-elections rather than the 2022 general election:
- **Ward 21** (Scarborough Centre): Parthi Kandavel, elected 2023
- **Ward 24** (Scarborough-Guildwood): Stephanie Shan, elected 2023
- **Ward 15** (Don Valley West): seat vacant following Jaye Robinson's death; incumbent TBD

For these wards, set `is_byelection_incumbent` to `true` and use the by-election figures for `vote_share`, `electorate_share`, and `pop_growth_pct`. Note that by-election electorate shares are typically lower due to reduced turnout, making them noisier proxies than general-election figures.

### Example

```csv
ward,councillor_name,election_year,is_byelection_incumbent,vote_share,electorate_share,pop_growth_pct,source_url,notes,last_updated
5,Josh Matlow,2022,false,0.61,0.19,0.03,https://open.toronto.ca,,2025-11-01
21,Parthi Kandavel,2023,true,0.48,0.12,0.01,https://open.toronto.ca,by-election,2025-11-01
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

Add all name variations you expect to appear in election results or other data as keys, all mapping to the same short lowercase key.

**2. Add a column to `data/raw/polls/polls.csv`:**

Add a column named after the key (e.g. `doe`) to the CSV header. Populate it for any polls that tested them, and add the key to `field_tested` for those rows. Leave it blank for older rows where the candidate wasn't tested.

**3. Run the tests:**

```bash
uv run pytest -v
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
| `data/processed/ward_defeatability.csv` | Validated ward defeatability inputs |
| `data/processed/ward_defeatability.meta` | Generation timestamp |

If validation fails, the script prints the specific error (bad rows, bad values) and exits before writing any output.

---

## Running Tests

```bash
uv run pytest -v
```

All 27 tests should pass. Tests cover the name registry, poll validation, council alignment validation, defeatability validation, and the processing pipeline.
